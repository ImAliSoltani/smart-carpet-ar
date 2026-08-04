"""Recover the derivative URLs that `carpet_images` never recorded.

Every image ingested before migration 0002 kept only its 800px `card` URL. The
other three derivatives were written to disk and then forgotten. They cannot be
recovered from the stored URL: storage is content-addressed on each
derivative's own bytes, so `card/<digest>.webp` says nothing about where `full`
landed.

What it can be recovered from is the source photograph. `process_upload` is
deterministic — same bytes in, same four digests out — so re-running it over the
folders the catalogue was ingested from reproduces the exact URL set, matches it
to a row by the `card` URL already stored there, and fills in the rest. Because
the files are content-addressed and already present, nothing new is written to
disk; the run only reads.

    uv run python scripts/backfill_image_derivatives.py data/catalog-seed [...]
    uv run python scripts/backfill_image_derivatives.py data/catalog-seed --dry-run

Rows left unmatched are reported by name rather than guessed at — an unmatched
row means its source photo is not in the folders given, and inventing a URL for
it would put a 404 in the catalogue.
"""

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import CarpetImage
from app.services.images import InvalidImageError, process_upload
from app.services.storage import Storage

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def source_files(roots: list[Path]) -> list[Path]:
    found: list[Path] = []
    for root in roots:
        if root.is_file():
            found.append(root)
            continue
        found.extend(
            path
            for path in sorted(root.rglob("*"))
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        )
    return found


def build_url_map(paths: list[Path], storage: Storage) -> dict[str, dict[str, str]]:
    """card URL -> the full derivative set that produced it."""
    mapping: dict[str, dict[str, str]] = {}
    for index, path in enumerate(paths, start=1):
        try:
            image_set = process_upload(path.read_bytes(), storage)
        except InvalidImageError as exc:
            print(f"SKIP {path.name}: {exc}")
            continue
        mapping[image_set.urls["card"]] = image_set.urls
        if index % 25 == 0 or index == len(paths):
            print(f"  … {index}/{len(paths)} source images hashed")
    return mapping


async def run(roots: list[Path], dry_run: bool) -> int:
    paths = source_files(roots)
    if not paths:
        print("no source images found in the given paths")
        return 1
    print(f"hashing {len(paths)} source images")
    mapping = build_url_map(paths, Storage())

    async with SessionLocal() as session:
        rows = (await session.execute(select(CarpetImage))).scalars().all()
        filled = 0
        already = 0
        unmatched: list[CarpetImage] = []

        for row in rows:
            if row.full_url and row.thumb_url and row.texture_url:
                already += 1
                continue
            urls = mapping.get(row.url)
            if urls is None:
                unmatched.append(row)
                continue
            row.thumb_url = urls["thumb"]
            row.full_url = urls["full"]
            row.texture_url = urls["texture"]
            filled += 1

        print(
            f"\n{len(rows)} image rows: {filled} filled, {already} already complete, "
            f"{len(unmatched)} unmatched"
        )
        for row in unmatched:
            print(f"  unmatched: image {row.id} (carpet {row.carpet_id}) {row.url}")

        if dry_run:
            print("\ndry run — nothing written")
            await session.rollback()
        else:
            await session.commit()
            print("\nwritten")
    return 0 if not unmatched else 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path, help="folders or files to hash")
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    args = parser.parse_args()
    return asyncio.run(run(args.paths, args.dry_run))


if __name__ == "__main__":
    sys.exit(main())
