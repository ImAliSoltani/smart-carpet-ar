from fastapi import APIRouter, HTTPException, Request, UploadFile

from app.api.deps import DbSession, EmbeddingDep
from app.core.config import get_settings
from app.core.security import (
    client_key,
    conversational_limiter,
    read_upload,
    visual_search_limiter,
)
from app.nlq import get_planner
from app.schemas.catalog import (
    CarpetListItem,
    CatalogFilters,
    ConversationalQuery,
    ConversationalSearchResponse,
    Page,
    SimilarItem,
    VisualSearchResponse,
)
from app.services import catalog as catalog_service
from app.services.images import InvalidImageError, load_image

router = APIRouter(tags=["search"])


@router.post("/search/visual", response_model=VisualSearchResponse)
async def visual_search(
    request: Request, session: DbSession, embedder: EmbeddingDep, image: UploadFile
) -> VisualSearchResponse:
    """عکس فرش (یا اتاق) → شبیه‌ترین فرش‌های کاتالوگ."""
    visual_search_limiter.check(client_key(request))
    data = await read_upload(image, max_bytes=get_settings().max_upload_mb * 1024 * 1024)
    try:
        query_image = load_image(data)  # validate early: real image, supported format
    except InvalidImageError as exc:
        raise HTTPException(422, detail=str(exc)) from exc

    matches = await catalog_service.search_by_photograph(
        session, query_image, embedder=embedder, limit=12
    )
    return VisualSearchResponse(
        results=[SimilarItem(carpet=item, similarity=score) for item, score in matches]
    )


@router.post("/search/conversational", response_model=ConversationalSearchResponse)
async def conversational_search(
    request: Request, session: DbSession, body: ConversationalQuery
) -> ConversationalSearchResponse:
    """جمله‌ی فارسی → فیلتر ساخت‌یافته → همان نتایجی که کاتالوگ می‌دهد.

    The sentence is translated, never answered. Whatever the planner produces is
    a `CatalogFilters` like any other, run through the same `list_carpets` the
    listing page calls — so this endpoint cannot return a carpet the catalogue
    would not, at a price it does not charge, however the translation went.
    """
    conversational_limiter.check(client_key(request))
    facets = await catalog_service.facets(session)
    plan = await get_planner().plan(
        body.q, price_floor=facets.min_price, price_ceiling=facets.max_price
    )

    # Nothing understood means nothing answered. Running the empty plan would
    # apply no filters and hand back the entire catalogue, which reads as an
    # answer and is not one — «سلام حالت چطوره» would return seventy carpets
    # under a heading saying the sentence was not understood.
    if plan.is_empty:
        return ConversationalSearchResponse(
            understood=[],
            filters={},
            page=Page[CarpetListItem](items=[], total=0, page=1, page_size=24),
        )

    filters = CatalogFilters(
        q=plan.text,
        color=plan.color or None,
        pattern=plan.pattern or None,
        material=plan.material or None,
        room=plan.room or None,
        min_price=plan.min_price,
        max_price=plan.max_price,
        min_width_cm=plan.min_width_cm,
        max_width_cm=plan.max_width_cm,
        min_length_cm=plan.min_length_cm,
        max_length_cm=plan.max_length_cm,
        page_size=24,
    )
    items, total = await catalog_service.list_carpets(session, filters)

    # Only the fields that were actually set, in the shape the listing endpoint
    # reads, so the storefront can hand them straight to `/carpets?…` and the
    # narrowed shop becomes a page that can be shared and reloaded.
    applied = {
        key: [str(getattr(v, "value", v)) for v in value]
        if isinstance(value, list)
        else str(value)
        for key, value in filters.model_dump(
            exclude_none=True, exclude={"page", "page_size", "sort"}
        ).items()
    }

    return ConversationalSearchResponse(
        understood=plan.understood,
        filters=applied,
        page=Page[CarpetListItem](items=items, total=total, page=1, page_size=24),
    )


@router.get("/carpets/{carpet_id}/similar", response_model=VisualSearchResponse)
async def similar_carpets(
    session: DbSession, carpet_id: int, limit: int = 6
) -> VisualSearchResponse:
    """فرش‌های مشابه برای صفحه‌ی محصول — با امبدینگ عکس اصلی همان فرش."""
    carpet = await catalog_service.get_carpet_by_id(session, carpet_id)
    if carpet is None:
        raise HTTPException(404, detail="فرش پیدا نشد")

    embedding = None
    histogram = None
    for image in carpet.images:
        if image.embedding is not None and (embedding is None or image.is_primary):
            embedding = image.embedding
            # Taken from the same image as the embedding, never from another of
            # the carpet's photos: the pair describes one photograph, and mixing
            # a primary's structure with a gallery angle's colour would compare
            # against something no row in the catalogue holds.
            histogram = image.color_histogram
    if embedding is None:
        return VisualSearchResponse(results=[])

    matches = await catalog_service.search_by_embedding(
        session,
        list(embedding),
        color_histogram=list(histogram) if histogram is not None else None,
        limit=min(limit, 12),
        exclude_carpet_id=carpet.id,
    )
    return VisualSearchResponse(
        results=[SimilarItem(carpet=item, similarity=score) for item, score in matches]
    )
