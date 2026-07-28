from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import DbSession
from app.schemas.catalog import CarpetDetail, CarpetListItem, CatalogFilters, Page
from app.services import catalog as catalog_service

router = APIRouter(prefix="/carpets", tags=["catalog"])


@router.get("", response_model=Page[CarpetListItem])
async def list_carpets(
    session: DbSession, filters: Annotated[CatalogFilters, Depends()]
) -> Page[CarpetListItem]:
    items, total = await catalog_service.list_carpets(session, filters)
    return Page(items=items, total=total, page=filters.page, page_size=filters.page_size)


@router.get("/{slug}", response_model=CarpetDetail)
async def carpet_detail(session: DbSession, slug: str) -> CarpetDetail:
    carpet = await catalog_service.get_carpet_by_slug(session, slug)
    if carpet is None:
        raise HTTPException(404, detail="فرش پیدا نشد")
    return CarpetDetail.model_validate(carpet)
