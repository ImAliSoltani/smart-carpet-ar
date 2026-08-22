"""Ingest the forty carpets we designed and photographed ourselves.

    uv run python scripts/ingest_catalog.py [--activate] [--replace]

Different from `ingest_folder.py` in the one way that matters: there, a folder
of loose photographs is all there is, so a carpet's facts are guessed from its
file name and a CSV. Here the facts were authored first — `dataset/profiles.json`
says what each carpet is, what it costs and which rooms it suits — and the
images were commissioned to match. So this script reads the profile as the
source of truth and looks up the images by name, rather than the other way
round.

Layout it expects, written by hand into `data/catalog-gen/`:

    {slug}__flat.png      the top-down texture — required
    {slug}__cover.png     styled corner-of-a-room shot
    {slug}__room.png      the rug in a lived-in Persian room
    {slug}__gallery.png   the rug as a museum exhibit
    {slug}__macro.png     extreme close-up of the pile (optional)

**Only `flat` becomes the primary image, and only `flat` is embedded.** That is
the same rule `attach_gallery_images.py` states and for the same reason: the
primary image is what the AR pipeline rectifies and what the grid shows, and
both want the rug seen square-on. The other four are the rug in perspective;
embedding them would teach the visual index that a carpet is a trapezoid, and
`search_by_embedding` skips rows whose embedding is null, so leaving it null is
the whole mechanism.

The colours on the carpet are read off the `flat` image by the same pipeline
every other carpet goes through — never from the profile. `intended_colors` in
the profile records what we *asked* the photograph for, and the disagreement
between the two is the mechanism for catching an image that came back wrong.

Re-running is safe. Storage is content-addressed, so an unchanged image
produces the URL already on the row; a carpet that exists is left alone unless
`--replace` is given, which deletes it (and its variants, images and AR assets)
and builds it again from the profile.
"""

import argparse
import asyncio
import json
import sys
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Carpet, CarpetImage, CarpetVariant
from app.models.enums import CarpetMaterial, CarpetPattern, RoomType
from app.services.embeddings import get_embedding_backend
from app.services.images import InvalidImageError, process_upload
from app.services.storage import Storage

ROOT = Path(__file__).resolve().parents[2]
PROFILES = ROOT / "dataset" / "profiles.json"
IMAGES = ROOT / "data" / "catalog-gen"

#: Position order in the product gallery. `flat` leads because it is the
#: primary; the rest run from the most styled to the most technical, which is
#: the order somebody scrolls a product page in.
SHOT_ORDER: tuple[str, ...] = ("flat", "cover", "room", "gallery", "macro")
EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")


def find_image(slug: str, shot: str) -> Path | None:
    for ext in EXTENSIONS:
        path = IMAGES / f"{slug}__{shot}{ext}"
        if path.exists():
            return path
    return None


async def ingest(activate: bool, replace: bool) -> int:
    profiles = json.loads(PROFILES.read_text(encoding="utf-8"))
    storage = Storage()
    embedder = get_embedding_backend()

    created = skipped = failed = 0
    mismatches: list[str] = []

    async with SessionLocal() as session:
        for profile in profiles:
            slug = profile["slug"]
            flat = find_image(slug, "flat")
            if flat is None:
                print(f"MISS {slug}: no flat image")
                failed += 1
                continue

            existing = await session.scalar(select(Carpet).where(Carpet.slug == slug))
            if existing is not None:
                if not replace:
                    skipped += 1
                    continue
                await session.delete(existing)
                await session.flush()

            try:
                flat_set = process_upload(flat.read_bytes(), storage)
            except InvalidImageError as exc:
                print(f"FAIL {slug}: {exc}")
                failed += 1
                continue

            carpet = Carpet(
                slug=slug,
                name=profile["name"],
                description=profile["description"],
                pattern=CarpetPattern(profile["pattern"]),
                material=CarpetMaterial(profile["material"]),
                # Read off the photograph, never taken from the profile.
                colors=flat_set.dominant_colors,
                color_families=flat_set.color_families,
                suitable_rooms=[RoomType(r) for r in profile["suitable_rooms"]],
                origin=profile["origin"],
                is_active=activate,
            )
            session.add(carpet)
            await session.flush()

            for variant in profile["variants"]:
                session.add(
                    CarpetVariant(
                        carpet_id=carpet.id,
                        width_cm=variant["width_cm"],
                        length_cm=variant["length_cm"],
                        price=Decimal(variant["price"]),
                        stock=variant["stock"],
                    )
                )

            session.add(
                CarpetImage(
                    carpet_id=carpet.id,
                    url=flat_set.urls["card"],
                    thumb_url=flat_set.urls["thumb"],
                    full_url=flat_set.urls["full"],
                    texture_url=flat_set.urls["texture"],
                    position=0,
                    is_primary=True,
                    embedding=embedder.embed_image(flat.read_bytes()),
                    color_histogram=flat_set.color_histogram,
                )
            )

            attached = ["flat"]
            for position, shot in enumerate(SHOT_ORDER[1:], start=1):
                path = find_image(slug, shot)
                if path is None:
                    continue
                try:
                    shot_set = process_upload(path.read_bytes(), storage)
                except InvalidImageError as exc:
                    print(f"  skip {slug}__{shot}: {exc}")
                    continue
                session.add(
                    CarpetImage(
                        carpet_id=carpet.id,
                        url=shot_set.urls["card"],
                        thumb_url=shot_set.urls["thumb"],
                        full_url=shot_set.urls["full"],
                        texture_url=shot_set.urls["texture"],
                        position=position,
                        is_primary=False,
                        # No embedding, on purpose — see the module docstring.
                        embedding=None,
                        color_histogram=shot_set.color_histogram,
                    )
                )
                attached.append(shot)

            # What we asked the photograph for against what it turned out to be.
            intended = set(profile["intended_colors"])
            got = {family.value for family in flat_set.color_families}
            if not intended & got:
                mismatches.append(
                    f"{slug}: asked for {sorted(intended)}, read {sorted(got)}"
                )

            created += 1
            print(f"OK   {slug} ({len(attached)} images: {', '.join(attached)})")

        await session.commit()

    print(f"\ncreated={created} skipped={skipped} failed={failed}")
    if mismatches:
        print(
            f"\n{len(mismatches)} carpets whose colours share nothing with the "
            f"profile — look at the image before trusting the row:"
        )
        for line in mismatches:
            print(" -", line)
    return 1 if failed else 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--activate", action="store_true", help="publish to the storefront immediately"
    )
    parser.add_argument(
        "--replace", action="store_true", help="rebuild carpets that already exist"
    )
    args = parser.parse_args()
    if not PROFILES.exists():
        print(f"no catalogue at {PROFILES} — run build_catalog_dataset.py first")
        sys.exit(1)
    sys.exit(asyncio.run(ingest(args.activate, args.replace)))


if __name__ == "__main__":
    main()
