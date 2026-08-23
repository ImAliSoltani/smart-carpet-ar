"""One photo in, AR assets out — for every size the carpet is sold in.

The shopkeeper uploads an ordinary photo. This module rectifies it once, then
emits a `.glb` (Android/WebXR) and a `.usdz` (iOS Quick Look) per variant, each
carrying that variant's real dimensions. Same design, three sizes, three pairs
of files — because the metric size is baked into the geometry, one file cannot
serve two sizes without lying about scale.

Generation runs off the request in a background task; each variant carries its
own status so the admin panel can show progress and offer a retry.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from io import BytesIO
from tempfile import TemporaryDirectory

from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ar.glb_builder import build_carpet_glb
from app.ar.rectify import Corners, rectify
from app.ar.usdz_builder import build_carpet_usdz
from app.db.session import SessionLocal
from app.models import Carpet, CarpetImage, CarpetVariant
from app.models.enums import ArAssetStatus
from app.services.storage import Storage

logger = logging.getLogger(__name__)


@dataclass
class VariantAssets:
    variant_id: int
    glb_url: str
    usdz_url: str


class ArPipelineError(RuntimeError):
    """Asset generation failed for a reason worth showing the shopkeeper."""


def _load_source_image(storage: Storage, image: CarpetImage) -> Image.Image:
    """The photograph, always — never a rectified copy of it.

    **Rectification is not idempotent, and this is where that bites.** The
    source used to resolve to `rectified_url or url`, so the first run warped
    the photograph and the second warped that result: corner detection run on
    an already-rectified carpet finds a rectangle *inside* it — an inner
    border, a medallion — and crops to that. Every rebuild cropped again, and a
    shopkeeper who edited a size and pressed rebuild got a piece of their
    carpet presented as the whole of it.

    The panel is the other half of the argument. `suggest_corners` measures
    against `url`, so every handle the shopkeeper drags is in the photograph's
    pixel space; a builder reading anything else applies those numbers to an
    image they do not describe, and a *corrected* crop lands further from the
    carpet than the one it was correcting.
    """
    try:
        return Image.open(storage.open_public_url(image.url))
    except (OSError, ValueError) as exc:
        raise ArPipelineError(f"تصویر منبع قابل خواندن نیست: {image.url}") from exc


def build_variant_assets(
    source: Image.Image,
    variant: CarpetVariant,
    carpet_slug: str,
    storage: Storage,
    *,
    corners: Corners | None = None,
) -> tuple[VariantAssets, float]:
    """Rectify to this variant's proportions and write both AR files."""
    result = rectify(
        source,
        width_cm=variant.width_cm,
        length_cm=variant.length_cm,
        corners=corners,
    )
    width_m = variant.width_cm / 100.0
    length_m = variant.length_cm / 100.0
    name = f"{carpet_slug}-{variant.width_cm}x{variant.length_cm}"

    with TemporaryDirectory() as tmp:
        glb_path = f"{tmp}/{name}.glb"
        usdz_path = f"{tmp}/{name}.usdz"
        build_carpet_glb(result.image, width_m, length_m, glb_path, name=name)
        build_carpet_usdz(result.image, width_m, length_m, usdz_path, name=name)

        with open(glb_path, "rb") as f:
            glb_url = storage.save(f.read(), kind="ar", ext="glb")
        with open(usdz_path, "rb") as f:
            usdz_url = storage.save(f.read(), kind="ar", ext="usdz")

    return (
        VariantAssets(variant_id=variant.id, glb_url=glb_url, usdz_url=usdz_url),
        result.confidence,
    )


async def generate_for_carpet(
    session: AsyncSession,
    carpet_id: int,
    *,
    storage: Storage,
    corners: Corners | None = None,
) -> list[VariantAssets]:
    """(Re)build AR assets for every variant of a carpet. Commits its own work."""
    carpet = await session.get(Carpet, carpet_id)
    if carpet is None:
        raise ArPipelineError("فرش پیدا نشد")

    primary = next(
        (img for img in sorted(carpet.images, key=lambda i: (not i.is_primary, i.position))),
        None,
    )
    if primary is None:
        raise ArPipelineError("برای ساخت فایل واقعیت افزوده حداقل یک عکس لازم است")
    if not carpet.variants:
        raise ArPipelineError("ابتدا حداقل یک سایز برای فرش ثبت کنید")

    for variant in carpet.variants:
        variant.ar_status = ArAssetStatus.PROCESSING
        variant.ar_error = None
    await session.commit()

    source = _load_source_image(storage, primary)
    built: list[VariantAssets] = []
    last_confidence = 0.0

    for variant in carpet.variants:
        try:
            assets, confidence = build_variant_assets(
                source, variant, carpet.slug, storage, corners=corners
            )
        except Exception as exc:  # keep one bad size from poisoning the rest
            logger.exception("AR generation failed for variant %s", variant.id)
            variant.ar_status = ArAssetStatus.FAILED
            variant.ar_error = str(exc)[:500]
            continue

        variant.glb_url = assets.glb_url
        variant.usdz_url = assets.usdz_url
        variant.ar_status = ArAssetStatus.READY
        variant.ar_error = None
        built.append(assets)
        last_confidence = confidence

    if built:
        # One preview of the crop, refreshed on every run rather than written
        # once. Written once, it recorded the *first* crop forever — so the one
        # picture meant to show a shopkeeper what their correction did was the
        # picture from before they corrected anything.
        #
        # It is no longer read back as a source; that is stated at
        # `_load_source_image` and is the bug this block used to feed.
        first = carpet.variants[0]
        preview = rectify(
            source,
            width_cm=first.width_cm,
            length_cm=first.length_cm,
            corners=corners,
        )
        buffer = BytesIO()
        preview.image.save(buffer, format="WEBP", quality=90, method=6)
        primary.rectified_url = storage.save(buffer.getvalue(), kind="rectified", ext="webp")
        logger.info("rectified %s with confidence %.2f", carpet.slug, last_confidence)

    await session.commit()
    return built


async def generate_in_background(carpet_id: int) -> None:
    """Entry point for FastAPI BackgroundTasks — owns its own session."""
    storage = Storage()
    async with SessionLocal() as session:
        try:
            await generate_for_carpet(session, carpet_id, storage=storage)
        except ArPipelineError as exc:
            logger.warning("AR pipeline skipped carpet %s: %s", carpet_id, exc)
            variants = (
                (
                    await session.execute(
                        select(CarpetVariant).where(CarpetVariant.carpet_id == carpet_id)
                    )
                )
                .scalars()
                .all()
            )
            for variant in variants:
                variant.ar_status = ArAssetStatus.FAILED
                variant.ar_error = str(exc)[:500]
            await session.commit()
