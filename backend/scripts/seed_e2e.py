"""A small, deterministic catalogue for the end-to-end suite.

    uv run python scripts/seed_e2e.py

**Not the demo catalogue.** The forty generated carpets are 164 photographs and
an embedding each; loading them before every browser run would make the suite
slow enough that it stops being run, and would make it depend on files that are
gitignored (فاز ۴٫۵ بند ۷) and therefore absent in CI. What the browser tests
need is much smaller and much more specific: enough carpets that a listing page
is a list, two colours so a filter has something to remove, sizes with stock so
a cart can be filled, and one carpet deliberately out of stock so the flow that
refuses a sale is reachable.

Everything is written through the **same services the admin panel writes
through**, not by inserting rows. A fixture built with raw INSERTs drifts from
the pipeline it stands in for, and the first thing that breaks is the one thing
these tests exist to check: that a carpet added the ordinary way is a carpet the
shop can sell.

Idempotent: the catalogue tables are truncated first, so a re-run replaces the
fixture rather than doubling it.
"""

import asyncio
import sys
from io import BytesIO
from pathlib import Path

# The console this runs on is cp1256, which has no ی — see scripts/eval_ar.py.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from PIL import Image, ImageDraw
from sqlalchemy import select, text

from app.ar.pipeline import build_variant_assets
from app.db.session import SessionLocal, engine
from app.models import Carpet, CarpetImage, CarpetVariant
from app.models.enums import ArAssetStatus, CarpetMaterial, CarpetPattern, RoomType
from app.services.embeddings import get_embedding_backend
from app.services.images import process_upload
from app.services.storage import Storage

TABLES = ("order_items", "orders", "carpet_images", "carpet_variants", "carpets")

#: The fixture. Colours are far apart in hue on purpose — the colour filter is
#: one of the things the shop test drives, and two carpets a shopper would call
#: "reddish" are two carpets the filter cannot be seen to separate.
FIXTURE = [
    {
        "slug": "e2e-kashan-red",
        "name": "کاشان لچک‌ترنج قرمز",
        "description": "فرش دستباف کاشان با نقشه‌ی لچک ترنج و زمینه‌ی لاکی.",
        "pattern": CarpetPattern.LACHAK_TORANJ,
        "material": CarpetMaterial.WOOL,
        "rooms": [RoomType.LIVING_ROOM],
        "origin": "کاشان",
        "rgb": (150, 32, 34),
        "variants": [(200, 300, 42_000_000, 4), (250, 350, 68_000_000, 2)],
    },
    {
        "slug": "e2e-naeen-blue",
        "name": "نایین افشان سرمه‌ای",
        "description": "فرش نایین با نقشه‌ی افشان و زمینه‌ی سرمه‌ای.",
        "pattern": CarpetPattern.AFSHAN,
        "material": CarpetMaterial.SILK,
        "rooms": [RoomType.BEDROOM],
        "origin": "نایین",
        "rgb": (24, 38, 96),
        "variants": [(150, 225, 31_000_000, 5)],
    },
    {
        # The only one with no stock. Without it, "a shopper cannot buy what is
        # not there" is untested, and that path is the one that costs a real
        # shop an apology rather than a sale.
        "slug": "e2e-tabriz-sold-out",
        "name": "تبریز هندسی سبز",
        "description": "فرش تبریز با نقشه‌ی هندسی و زمینه‌ی سبز.",
        "pattern": CarpetPattern.GEOMETRIC,
        "material": CarpetMaterial.WOOL,
        "rooms": [RoomType.OFFICE],
        "origin": "تبریز",
        "rgb": (30, 96, 52),
        "variants": [(120, 180, 15_500_000, 0)],
    },
]


def _photograph(rgb: tuple[int, int, int], seed: int) -> bytes:
    """A plausible rug: a field, a border, and a medallion.

    Flat colour would do for the shop, but not for visual search — every flat
    image of the same size embeds to nearly the same vector, so "find carpets
    like this one" would return the fixture in an arbitrary order and any test
    of it would pass or fail by luck. Three bands of structure is enough to give
    each carpet its own place.
    """
    width, height = 800, 1200
    image = Image.new("RGB", (width, height), rgb)
    draw = ImageDraw.Draw(image)
    light = tuple(min(255, c + 90) for c in rgb)
    inset = 60 + seed * 8
    draw.rectangle([inset, inset, width - inset, height - inset], outline=light, width=18)
    draw.ellipse(
        [width // 4, height // 3, 3 * width // 4, 2 * height // 3],
        outline=light,
        width=14 + seed * 3,
    )
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


async def main() -> None:
    storage = Storage()
    embedder = get_embedding_backend()

    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE"))

    async with SessionLocal() as session:
        for seed, spec in enumerate(FIXTURE):
            data = _photograph(spec["rgb"], seed)
            image_set = process_upload(data, storage)

            carpet = Carpet(
                slug=spec["slug"],
                name=spec["name"],
                description=spec["description"],
                pattern=spec["pattern"],
                material=spec["material"],
                colors=image_set.dominant_colors,
                color_families=image_set.color_families,
                suitable_rooms=spec["rooms"],
                origin=spec["origin"],
                is_active=True,
            )
            carpet.images.append(
                CarpetImage(
                    url=image_set.urls["card"],
                    thumb_url=image_set.urls["thumb"],
                    full_url=image_set.urls["full"],
                    texture_url=image_set.urls["texture"],
                    position=0,
                    is_primary=True,
                    embedding=embedder.embed_image(data),
                    color_histogram=image_set.color_histogram,
                )
            )
            for width, length, price, stock in spec["variants"]:
                carpet.variants.append(
                    CarpetVariant(width_cm=width, length_cm=length, price=price, stock=stock)
                )
            session.add(carpet)
        await session.commit()

        # AR assets, for the first size of every carpet.
        #
        # Not decoration: «در خانه‌ی من ببین» is the product's headline claim
        # and the product page renders it as a dead `<span>` when the variant
        # has no files. Seeding without them means the browser tests can only
        # ever see the disabled state, so the one journey that matters most
        # would be the one they never walk.
        storage_for_ar = Storage()
        for carpet in (await session.execute(select(Carpet))).scalars():
            source = Image.open(storage_for_ar.open_public_url(carpet.images[0].url))
            variant = carpet.variants[0]
            assets, _confidence = build_variant_assets(
                source.convert("RGB"), variant, carpet.slug, storage_for_ar
            )
            variant.glb_url = assets.glb_url
            variant.usdz_url = assets.usdz_url
            variant.ar_status = ArAssetStatus.READY
        await session.commit()

    print(
        f"{len(FIXTURE)} فرش آزمونی نوشته شد: "
        + "، ".join(spec["slug"] for spec in FIXTURE)
    )


if __name__ == "__main__":
    if not Path("alembic.ini").exists():
        sys.exit("این اسکریپت باید از پوشه‌ی backend اجرا شود")
    asyncio.run(main())
