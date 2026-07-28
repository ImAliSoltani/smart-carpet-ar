from fastapi import APIRouter, HTTPException, UploadFile

from app.api.deps import DbSession, EmbeddingDep
from app.core.config import get_settings
from app.schemas.catalog import SimilarItem, VisualSearchResponse
from app.services import catalog as catalog_service
from app.services.images import InvalidImageError, load_image

router = APIRouter(tags=["search"])


@router.post("/search/visual", response_model=VisualSearchResponse)
async def visual_search(
    session: DbSession, embedder: EmbeddingDep, image: UploadFile
) -> VisualSearchResponse:
    """عکس فرش (یا اتاق) → شبیه‌ترین فرش‌های کاتالوگ."""
    data = await image.read()
    max_bytes = get_settings().max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(413, detail="حجم تصویر بیش از حد مجاز است")
    try:
        load_image(data)  # validate early: real image, supported format
    except InvalidImageError as exc:
        raise HTTPException(422, detail=str(exc)) from exc

    vector = embedder.embed_image(data)
    matches = await catalog_service.search_by_embedding(session, vector, limit=12)
    return VisualSearchResponse(
        results=[SimilarItem(carpet=item, similarity=score) for item, score in matches]
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
    for image in carpet.images:
        if image.embedding is not None and (embedding is None or image.is_primary):
            embedding = image.embedding
    if embedding is None:
        return VisualSearchResponse(results=[])

    matches = await catalog_service.search_by_embedding(
        session, list(embedding), limit=min(limit, 12), exclude_carpet_id=carpet.id
    )
    return VisualSearchResponse(
        results=[SimilarItem(carpet=item, similarity=score) for item, score in matches]
    )
