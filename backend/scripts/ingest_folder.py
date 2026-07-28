"""Ingest a folder of carpet images into the catalog.

Works for any source: public datasets, the shop's own photos, one-off additions.
Goes through the exact same pipeline as an admin upload (derivatives, embedding),
so bulk data exercises the production path instead of a side door.

Layout:
    folder/
        metadata.csv        (optional)
        some-carpet.jpg
        another.png

metadata.csv columns (all optional except filename):
    filename, name, pattern, material, origin, description,
    sizes  (e.g. "200x300:12000000; 250x350:18500000"), stock

Rows without metadata get sensible defaults: name from the filename, pattern
"medallion", material "wool", one 200x300 size with a placeholder price, and
the carpet is created INACTIVE so obviously-unfinished entries never leak into
the storefront until reviewed in the admin panel (pass --activate to override).

    uv run python scripts/ingest_folder.py path/to/folder [--activate]
"""

import argparse
import asyncio
import csv
import re
import sys
import unicodedata
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Carpet, CarpetImage, CarpetVariant
from app.models.enums import CarpetMaterial, CarpetPattern
from app.services.embeddings import get_embedding_backend
from app.services.images import InvalidImageError, process_upload
from app.services.storage import Storage

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
DEFAULT_SIZES = "200x300:15000000"


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value or "carpet"


def parse_sizes(raw: str) -> list[tuple[int, int, Decimal]]:
    sizes = []
    for chunk in raw.split(";"):
        chunk = chunk.strip()
        if not chunk:
            continue
        dims, _, price = chunk.partition(":")
        width, _, length = dims.partition("x")
        sizes.append((int(width), int(length), Decimal(price or "15000000")))
    return sizes


def load_metadata(folder: Path) -> dict[str, dict]:
    csv_path = folder / "metadata.csv"
    if not csv_path.exists():
        return {}
    with open(csv_path, encoding="utf-8-sig") as f:
        return {row["filename"].strip(): row for row in csv.DictReader(f)}


async def ingest(folder: Path, activate: bool) -> None:
    metadata = load_metadata(folder)
    storage = Storage()
    embedder = get_embedding_backend()
    images = sorted(
        p for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS
    )
    if not images:
        print(f"no images found in {folder}")
        return

    created = skipped = failed = 0
    async with SessionLocal() as session:
        for path in images:
            row = metadata.get(path.name, {})
            name = (row.get("name") or path.stem.replace("_", " ").replace("-", " ")).strip()
            slug = slugify(row.get("name") or path.stem)

            existing = await session.execute(select(Carpet.id).where(Carpet.slug == slug))
            if existing.scalar_one_or_none() is not None:
                skipped += 1
                continue

            data = path.read_bytes()
            try:
                image_set = process_upload(data, storage)
            except InvalidImageError as exc:
                print(f"SKIP {path.name}: {exc}")
                failed += 1
                continue

            carpet = Carpet(
                slug=slug,
                name=name,
                description=(row.get("description") or None),
                pattern=CarpetPattern(row.get("pattern") or "medallion"),
                material=CarpetMaterial(row.get("material") or "wool"),
                colors=image_set.dominant_colors,
                suitable_rooms=[],
                origin=(row.get("origin") or None),
                is_active=activate,
            )
            session.add(carpet)
            await session.flush()

            for width, length, price in parse_sizes(row.get("sizes") or DEFAULT_SIZES):
                session.add(
                    CarpetVariant(
                        carpet_id=carpet.id,
                        width_cm=width,
                        length_cm=length,
                        price=price,
                        stock=int(row.get("stock") or 2),
                    )
                )

            session.add(
                CarpetImage(
                    carpet_id=carpet.id,
                    url=image_set.urls["card"],
                    position=0,
                    is_primary=True,
                    embedding=embedder.embed_image(data),
                )
            )
            created += 1
            print(f"OK   {path.name} -> {slug}")

        await session.commit()

    print(f"\ncreated={created} skipped={skipped} failed={failed}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--activate", action="store_true")
    args = parser.parse_args()
    if not args.folder.is_dir():
        print(f"not a folder: {args.folder}")
        sys.exit(1)
    asyncio.run(ingest(args.folder, args.activate))


if __name__ == "__main__":
    main()
