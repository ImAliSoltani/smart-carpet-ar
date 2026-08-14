"""Attach extra photographs to carpets that already exist.

`ingest_folder.py` creates a carpet from one photograph. This adds the rest of
its gallery afterwards, which is a different job: nothing is created, no
metadata is read, and the carpet's primary image is left exactly where it is.

The carpet is found from the file name. `dk-9814545-2.jpg` is the second
photograph of `dk-9814545`; a name that is itself a slug is taken as-is, so a
folder can mix both conventions without a manifest.

    uv run python scripts/attach_gallery_images.py ../data/catalog-seed/covers

**These photographs get no embedding, on purpose.** They are angled studio
shots — the rug in perspective, receding across the frame — while visual search
compares patterns seen flat. Embedding them would fill the results with the
same rug photographed from a different chair, and would teach the index that a
carpet is a trapezoid. `search_by_embedding` skips rows whose embedding is
null, so leaving it null is the whole mechanism (ROADMAP §7).

For the same reason they are never primary: the primary image is what the AR
pipeline rectifies and what the grid shows, and both want the flat cutout.

Re-running is safe. Storage is content-addressed, so an unchanged photograph
produces the URL already on the row and the file is skipped rather than
attached twice.
"""

import argparse
import asyncio
import re
import sys
from pathlib import Path

from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models import Carpet, CarpetImage
from app.services.images import InvalidImageError, process_upload
from app.services.storage import Storage

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
TRAILING_INDEX = re.compile(r"-(\d+)$")


def slug_and_order(path: Path) -> tuple[str, int]:
    """`dk-9814545-2.jpg` -> ("dk-9814545", 2); `afshan-01.jpg` -> ("afshan-01", 0)."""
    stem = path.stem
    match = TRAILING_INDEX.search(stem)
    if match is None:
        return stem, 0
    return stem[: match.start()], int(match.group(1))


def gallery_files(roots: list[Path]) -> list[Path]:
    found: list[Path] = []
    for root in roots:
        if root.is_file():
            found.append(root)
            continue
        found.extend(
            path
            for path in root.rglob("*")
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        )
    # by carpet, then by the number in the name, so gallery order matches the
    # order the photographs were taken in rather than the filesystem's
    return sorted(found, key=lambda p: (slug_and_order(p)[0], slug_and_order(p)[1]))


async def run(roots: list[Path], dry_run: bool) -> int:
    paths = gallery_files(roots)
    if not paths:
        print("no images found in the given paths")
        return 1

    storage = Storage()
    attached = 0
    skipped_existing = 0
    unknown: list[tuple[str, str]] = []

    async with SessionLocal() as session:
        # One lookup for the whole run; the catalogue is small enough that the
        # alternative — a query per file — is only slower, never clearer.
        carpets = {
            slug: carpet_id
            for carpet_id, slug in (
                await session.execute(select(Carpet.id, Carpet.slug))
            ).all()
        }

        for path in paths:
            stem_slug, _ = slug_and_order(path)
            carpet_id = carpets.get(path.stem) or carpets.get(stem_slug)
            if carpet_id is None:
                unknown.append((path.name, stem_slug))
                continue

            try:
                image_set = process_upload(path.read_bytes(), storage)
            except InvalidImageError as exc:
                print(f"SKIP {path.name}: {exc}")
                continue

            card_url = image_set.urls["card"]
            exists = (
                await session.execute(
                    select(CarpetImage.id).where(
                        CarpetImage.carpet_id == carpet_id, CarpetImage.url == card_url
                    )
                )
            ).scalar_one_or_none()
            if exists is not None:
                skipped_existing += 1
                continue

            next_position = (
                await session.execute(
                    select(func.coalesce(func.max(CarpetImage.position), -1) + 1).where(
                        CarpetImage.carpet_id == carpet_id
                    )
                )
            ).scalar_one()

            session.add(
                CarpetImage(
                    carpet_id=carpet_id,
                    url=card_url,
                    thumb_url=image_set.urls["thumb"],
                    full_url=image_set.urls["full"],
                    texture_url=image_set.urls["texture"],
                    position=next_position,
                    is_primary=False,
                    embedding=None,  # see the module docstring — deliberate
                    # No histogram either, for the same reason and not a second
                    # one: the histogram exists only to reorder rows the
                    # embedding index proposed, and a row with no embedding is
                    # never proposed, so a value here could not be read.
                    color_histogram=None,
                )
            )
            await session.flush()
            attached += 1

        print(
            f"\n{len(paths)} files: {attached} attached, "
            f"{skipped_existing} already attached, {len(unknown)} without a carpet"
        )
        for name, slug in unknown:
            print(f"  no carpet for {name} (looked for slug {slug!r})")

        if dry_run:
            await session.rollback()
            print("\ndry run — nothing written")
        else:
            await session.commit()
            print("\nwritten")

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path, help="folders or files to attach")
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    args = parser.parse_args()
    return asyncio.run(run(args.paths, args.dry_run))


if __name__ == "__main__":
    sys.exit(main())
