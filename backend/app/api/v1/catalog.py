from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import DbSession
from app.schemas.catalog import (
    CarpetDetail,
    CarpetListItem,
    CatalogFacets,
    CatalogFilters,
    Page,
)
from app.services import catalog as catalog_service

router = APIRouter(prefix="/carpets", tags=["catalog"])


@router.get("", response_model=Page[CarpetListItem])
async def list_carpets(
    # `Query()`, not `Depends()`. As a dependency FastAPI reads each field as a
    # query parameter but drops repeated values for the list ones — filtering
    # then silently does nothing and answers 200. As a query-parameter model it
    # collects them.
    session: DbSession,
    filters: Annotated[CatalogFilters, Query()],
) -> Page[CarpetListItem]:
    items, total = await catalog_service.list_carpets(session, filters)
    return Page(items=items, total=total, page=filters.page, page_size=filters.page_size)


@router.get("/facets", response_model=CatalogFacets)
async def catalog_facets(session: DbSession) -> CatalogFacets:
    """شمارش هر فیلتر و توزیع قیمت — ورودی پنل فیلتر.

    پیش از `/{slug}` تعریف شده، وگرنه «facets» به‌عنوان اسلاگ یک فرش خوانده
    می‌شود و همیشه ۴۰۴ می‌دهد.
    """
    return await catalog_service.facets(session)


@router.get("/{slug}", response_model=CarpetDetail)
async def carpet_detail(session: DbSession, slug: str) -> CarpetDetail:
    carpet = await catalog_service.get_carpet_by_slug(session, slug)
    if carpet is None:
        raise HTTPException(404, detail="فرش پیدا نشد")
    return CarpetDetail.model_validate(carpet)
