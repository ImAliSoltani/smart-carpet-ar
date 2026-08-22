"""Room-photo features. Today: which carpet size the floor will take."""

import anyio
from fastapi import APIRouter, HTTPException, Request, UploadFile

from app.api.deps import DbSession
from app.core.config import get_settings
from app.core.security import client_key, read_upload, room_limiter
from app.room.adviser import advise
from app.room.compose import RoomAnalysisError, analyze_room
from app.room.palette import read_palette
from app.room.scale import find_a4_scale
from app.room.sizing import measure_free_floor, sizes_that_fit
from app.schemas.catalog import CatalogFilters
from app.schemas.room import (
    CarpetAdvice,
    RoomAdviserResponse,
    RoomReading,
    ScaleReferenceOut,
    SizeGuideResponse,
    SizeSuggestion,
)
from app.services import catalog as catalog_service
from app.services.images import InvalidImageError, load_image

router = APIRouter(tags=["room"])

# The photo is reduced to this before any of it runs. The measurement is a bulk
# property of the floor, and depth estimation costs quadratically in resolution;
# above this the answer stops changing and the wait does not.
MAX_EDGE_PX = 900

# How many sizes come back. A generously photographed living room takes twenty
# of the catalogue's twenty-three sizes, and answering «which size?» with twenty
# is not an answer — a guide that lists everything has only restated the shop.
# The largest few are the ones the question was about; anything smaller fits
# trivially and is a different decision, made on the listing page with the size
# filter these chips link to.
MAX_SUGGESTIONS = 6

# How many carpets the adviser proposes. Fewer than a listing page on purpose:
# every one of these carries a sentence explaining itself, and a wall of thirty
# justified recommendations is read as none.
MAX_ADVICE = 8


@router.post("/room/size-guide", response_model=SizeGuideResponse)
async def size_guide(request: Request, session: DbSession, image: UploadFile) -> SizeGuideResponse:
    """عکس اتاق → اندازه‌های فرشی که در فضای آزاد جا می‌شوند."""
    import numpy as np

    room_limiter.check(client_key(request))
    data = await read_upload(image, max_bytes=get_settings().max_upload_mb * 1024 * 1024)
    try:
        photo = load_image(data).convert("RGB")
    except InvalidImageError as exc:
        raise HTTPException(422, detail=str(exc)) from exc

    photo.thumbnail((MAX_EDGE_PX, MAX_EDGE_PX))

    # Depth estimation and the grid sweep are seconds of CPU with the GIL held
    # for most of it. Off the event loop, or one upload stops the whole shop
    # from serving its catalogue.
    def measure():
        scene = analyze_room(photo)
        reference = find_a4_scale(
            np.array(scene.image), scene.floor, scene.focal, scene.cx, scene.cy
        )
        scale = reference.scale if reference else 1.0
        return scene, reference, measure_free_floor(scene, scale=scale), scale

    try:
        scene, reference, measurement, scale = await anyio.to_thread.run_sync(measure)
    except RoomAnalysisError as exc:
        raise HTTPException(422, detail=str(exc)) from exc

    if measurement is None:
        raise HTTPException(
            422,
            detail=(
                "کف آزادی در این عکس اندازه‌گیری نشد؛ "
                "عکسی بگیرید که کف اتاق در آن باز و دیده باشد"
            ),
        )

    sizes = await catalog_service.stocked_sizes(session)
    fitting = sizes_that_fit(measurement, [(w, length) for w, length, _ in sizes])
    counts = {(w, length): n for w, length, n in sizes}

    return SizeGuideResponse(
        confidence=scene.confidence,
        camera_height_m=round(scene.floor.camera_height_m * scale, 2),
        scale_reference=(
            ScaleReferenceOut(
                correction_percent=reference.correction_percent,
                measured_long_cm=round(reference.measured_long_m * 100, 1),
            )
            if reference is not None
            else None
        ),
        free_width_cm=measurement.free_width_cm,
        free_length_cm=measurement.free_length_cm,
        free_area_sqm=measurement.total_free_sqm,
        recommended=[
            SizeSuggestion(width_cm=w, length_cm=length, carpet_count=counts[(w, length)])
            for w, length in fitting[:MAX_SUGGESTIONS]
        ],
    )


@router.post("/room/adviser", response_model=RoomAdviserResponse)
async def room_adviser(
    request: Request, session: DbSession, image: UploadFile
) -> RoomAdviserResponse:
    """عکس اتاق → فرش‌هایی که به آن می‌آیند، با دلیل هر کدام.

    Shares its first half with the size guide — the same depth, the same floor
    mask — and then asks a different question of it. That one measures the floor
    and answers «چه اندازه‌ای»; this one reads the colours on either side of the
    same mask and answers «کدام فرش». Both are deliberately separate endpoints:
    a shopper who wants a size does not want to wait for a ranking, and the two
    answers belong on different pages.
    """
    room_limiter.check(client_key(request))
    data = await read_upload(image, max_bytes=get_settings().max_upload_mb * 1024 * 1024)
    try:
        photo = load_image(data).convert("RGB")
    except InvalidImageError as exc:
        raise HTTPException(422, detail=str(exc)) from exc

    photo.thumbnail((MAX_EDGE_PX, MAX_EDGE_PX))

    def read():
        scene = analyze_room(photo)
        return scene, read_palette(scene.image, scene.floor_mask)

    try:
        scene, palette = await anyio.to_thread.run_sync(read)
    except RoomAnalysisError as exc:
        raise HTTPException(422, detail=str(exc)) from exc

    carpets, _ = await catalog_service.list_carpets(
        session, CatalogFilters(page_size=60)
    )

    scored = []
    for carpet in carpets:
        advice = advise(list(carpet.color_families), palette)
        # A carpet the rules had nothing to say about is not a recommendation.
        # Padding the list to a round number with silent entries is how «چرا
        # این فرش؟» stops being answerable.
        if advice.reasons:
            scored.append((carpet, advice))
    scored.sort(key=lambda pair: pair[1].score, reverse=True)

    return RoomAdviserResponse(
        confidence=scene.confidence,
        reading=RoomReading(
            floor_colors=palette.floor.families,
            room_colors=palette.room.families,
            colourfulness=round(palette.colourfulness, 3),
            lightness=round(palette.lightness, 3),
            warmth=palette.warmth,
        ),
        suggestions=[
            CarpetAdvice(
                carpet=carpet,
                score=round(advice.score, 3),
                reasons=advice.reasons,
                caution=advice.caution,
            )
            for carpet, advice in scored[:MAX_ADVICE]
        ],
    )
