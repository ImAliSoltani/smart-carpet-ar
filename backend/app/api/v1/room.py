"""Room-photo features. Today: which carpet size the floor will take."""

import anyio
from fastapi import APIRouter, HTTPException, UploadFile

from app.api.deps import DbSession
from app.core.config import get_settings
from app.room.compose import RoomAnalysisError, analyze_room
from app.room.scale import find_a4_scale
from app.room.sizing import measure_free_floor, sizes_that_fit
from app.schemas.room import ScaleReferenceOut, SizeGuideResponse, SizeSuggestion
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


@router.post("/room/size-guide", response_model=SizeGuideResponse)
async def size_guide(session: DbSession, image: UploadFile) -> SizeGuideResponse:
    """عکس اتاق → اندازه‌های فرشی که در فضای آزاد جا می‌شوند."""
    import numpy as np

    data = await image.read()
    if len(data) > get_settings().max_upload_mb * 1024 * 1024:
        raise HTTPException(413, detail="حجم تصویر بیش از حد مجاز است")
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
