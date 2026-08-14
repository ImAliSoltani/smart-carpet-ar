"""Fill in the colour reading for photographs ingested before migration 0003.

Unlike the derivative backfill beside it, this one needs no source folders. The
histogram is computed from pixels, and the pixels are already in storage: every
image row carries a URL that `Storage.open_public_url` maps straight back to a
local file. So the run reads the catalogue's own derivatives, and the only
argument it takes is whether to write.

    uv run python scripts/backfill_color.py --dry-run
    uv run python scripts/backfill_color.py

Two things are written, from one reading each:

- `carpet_images.color_histogram`, for every image that has an embedding.
  Images without one are gallery views deliberately kept out of visual search
  (see `attach_gallery_images.py`); a histogram on them could never be read.
- `carpets.color_families`, from the carpet's **primary** image. That is the
  flat top-down photograph the AR pipeline rectifies, so it is the one that
  shows the carpet's real colours rather than a studio angle's cast.

Deterministic, therefore repeatable: running it twice writes the same values.
Rows already carrying a histogram are skipped rather than recomputed, so a
second run costs a query and nothing else.
"""

import argparse
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import SessionLocal
from app.models import Carpet
from app.services import color as color_service
from app.services.images import InvalidImageError, load_image
from app.services.storage import Storage


def _read_profile(url: str, storage: Storage) -> color_service.ColorProfile | None:
    try:
        path = storage.open_public_url(url)
    except ValueError as exc:
        print(f"SKIP {url}: {exc}")
        return None
    if not path.exists():
        print(f"SKIP {url}: file missing from storage")
        return None
    try:
        return color_service.analyse(load_image(path.read_bytes()))
    except InvalidImageError as exc:
        print(f"SKIP {url}: {exc}")
        return None


async def run(dry_run: bool, force: bool) -> int:
    storage = Storage()
    async with SessionLocal() as session:
        carpets = (
            (
                await session.execute(
                    select(Carpet).options(selectinload(Carpet.images)).order_by(Carpet.id)
                )
            )
            .scalars()
            .all()
        )

        histograms = 0
        skipped = 0
        families = 0
        without_families: list[Carpet] = []

        for carpet in carpets:
            primary = None
            for image in carpet.images:
                if primary is None or image.is_primary:
                    primary = image

            for image in carpet.images:
                if image.embedding is None:
                    continue  # not part of visual search, so nothing would read it
                if image.color_histogram is not None and not force:
                    skipped += 1
                    continue
                profile = _read_profile(image.full_url or image.url, storage)
                if profile is None:
                    continue
                image.color_histogram = profile.histogram
                histograms += 1
                if image is primary and (force or not carpet.color_families):
                    carpet.color_families = profile.families
                    families += 1

            # A carpet whose primary image was skipped above — already carrying a
            # histogram from an earlier run — still needs its families on a first
            # pass, so read that one image again rather than leave it unfiled.
            if not carpet.color_families and primary is not None:
                profile = _read_profile(primary.full_url or primary.url, storage)
                if profile is not None and profile.families:
                    carpet.color_families = profile.families
                    families += 1
            if not carpet.color_families:
                without_families.append(carpet)

        print(
            f"\n{len(carpets)} carpets: {histograms} histograms written, "
            f"{skipped} already had one, {families} carpets filed under a colour"
        )
        for carpet in without_families:
            print(f"  no colour family: {carpet.slug} (carpet {carpet.id})")

        if dry_run:
            await session.rollback()
            print("\ndry run — nothing written")
        else:
            await session.commit()
            print("\nwritten")
    return 0 if not without_families else 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    parser.add_argument(
        "--force",
        action="store_true",
        help="recompute rows that already have a histogram (after a threshold change)",
    )
    args = parser.parse_args()
    return asyncio.run(run(args.dry_run, args.force))


if __name__ == "__main__":
    sys.exit(main())
