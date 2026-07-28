"""Catalog queries: listing with filters, text search, visual search, similar."""

from decimal import Decimal
from typing import NamedTuple

from sqlalchemy import Select, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Carpet, CarpetImage, CarpetVariant
from app.schemas.catalog import CarpetListItem, CatalogFilters


class ListingRow(NamedTuple):
    carpet: Carpet
    primary_image: str | None
    min_price: Decimal | None
    sizes_count: int


def _listing_select() -> Select:
    primary_image = (
        select(CarpetImage.url)
        .where(CarpetImage.carpet_id == Carpet.id)
        .order_by(CarpetImage.is_primary.desc(), CarpetImage.position)
        .limit(1)
        .correlate(Carpet)
        .scalar_subquery()
    )
    min_price = (
        select(func.min(CarpetVariant.price))
        .where(CarpetVariant.carpet_id == Carpet.id)
        .correlate(Carpet)
        .scalar_subquery()
    )
    sizes_count = (
        select(func.count(CarpetVariant.id))
        .where(CarpetVariant.carpet_id == Carpet.id)
        .correlate(Carpet)
        .scalar_subquery()
    )
    return select(
        Carpet,
        primary_image.label("primary_image"),
        min_price.label("min_price"),
        sizes_count.label("sizes_count"),
    ).where(Carpet.is_active.is_(True))


def _apply_filters(stmt: Select, filters: CatalogFilters) -> Select:
    if filters.q:
        pattern = f"%{filters.q}%"
        stmt = stmt.where(
            Carpet.name.ilike(pattern)
            | func.coalesce(Carpet.description, "").ilike(pattern)
            | (func.word_similarity(filters.q, Carpet.name) > 0.3)
        )
    if filters.pattern:
        stmt = stmt.where(Carpet.pattern == filters.pattern)
    if filters.material:
        stmt = stmt.where(Carpet.material == filters.material)
    if filters.room:
        stmt = stmt.where(Carpet.suitable_rooms.any(filters.room))
    if filters.color:
        stmt = stmt.where(Carpet.colors.any(filters.color.lower()))

    variant_conditions = []
    if filters.min_width_cm:
        variant_conditions.append(CarpetVariant.width_cm >= filters.min_width_cm)
    if filters.max_width_cm:
        variant_conditions.append(CarpetVariant.width_cm <= filters.max_width_cm)
    if filters.min_length_cm:
        variant_conditions.append(CarpetVariant.length_cm >= filters.min_length_cm)
    if filters.max_length_cm:
        variant_conditions.append(CarpetVariant.length_cm <= filters.max_length_cm)
    if filters.min_price is not None:
        variant_conditions.append(CarpetVariant.price >= filters.min_price)
    if filters.max_price is not None:
        variant_conditions.append(CarpetVariant.price <= filters.max_price)
    if variant_conditions:
        stmt = stmt.where(
            select(CarpetVariant.id)
            .where(CarpetVariant.carpet_id == Carpet.id, *variant_conditions)
            .exists()
        )
    return stmt


def _apply_sort(stmt: Select, filters: CatalogFilters) -> Select:
    if filters.sort == "price_asc":
        return stmt.order_by(text("min_price ASC NULLS LAST"), Carpet.id.desc())
    if filters.sort == "price_desc":
        return stmt.order_by(text("min_price DESC NULLS LAST"), Carpet.id.desc())
    return stmt.order_by(Carpet.id.desc())


def row_to_list_item(row: ListingRow) -> CarpetListItem:
    item = CarpetListItem.model_validate(row.carpet)
    item.primary_image = row.primary_image
    item.min_price = row.min_price
    item.sizes_count = row.sizes_count
    return item


async def list_carpets(
    session: AsyncSession, filters: CatalogFilters
) -> tuple[list[CarpetListItem], int]:
    stmt = _apply_filters(_listing_select(), filters)

    count_stmt = select(func.count()).select_from(
        _apply_filters(select(Carpet.id).where(Carpet.is_active.is_(True)), filters).subquery()
    )
    total = (await session.execute(count_stmt)).scalar_one()

    stmt = _apply_sort(stmt, filters)
    stmt = stmt.offset((filters.page - 1) * filters.page_size).limit(filters.page_size)
    rows = (await session.execute(stmt)).all()
    return [row_to_list_item(ListingRow(*row)) for row in rows], total


async def get_carpet_by_slug(session: AsyncSession, slug: str) -> Carpet | None:
    result = await session.execute(
        select(Carpet).where(Carpet.slug == slug, Carpet.is_active.is_(True))
    )
    return result.scalar_one_or_none()


async def get_carpet_by_id(session: AsyncSession, carpet_id: int) -> Carpet | None:
    result = await session.execute(
        select(Carpet).where(Carpet.id == carpet_id, Carpet.is_active.is_(True))
    )
    return result.scalar_one_or_none()


async def search_by_embedding(
    session: AsyncSession,
    embedding: list[float],
    *,
    limit: int = 12,
    exclude_carpet_id: int | None = None,
) -> list[tuple[CarpetListItem, float]]:
    """Nearest carpets to a query vector; one hit per carpet (its best image)."""
    distance = CarpetImage.embedding.cosine_distance(embedding)
    stmt = (
        select(CarpetImage.carpet_id, distance.label("dist"))
        .join(Carpet, Carpet.id == CarpetImage.carpet_id)
        .where(CarpetImage.embedding.is_not(None), Carpet.is_active.is_(True))
    )
    if exclude_carpet_id is not None:
        stmt = stmt.where(CarpetImage.carpet_id != exclude_carpet_id)
    # over-fetch, then keep the best image per carpet
    stmt = stmt.order_by(distance).limit(limit * 4)
    rows = (await session.execute(stmt)).all()

    best: dict[int, float] = {}
    for carpet_id, dist in rows:
        if carpet_id not in best:
            best[carpet_id] = float(dist)
        if len(best) >= limit:
            break

    if not best:
        return []

    listing_rows = (
        await session.execute(_listing_select().where(Carpet.id.in_(best.keys())))
    ).all()
    by_id = {row[0].id: row_to_list_item(ListingRow(*row)) for row in listing_rows}
    return [
        (by_id[cid], 1.0 - dist) for cid, dist in sorted(best.items(), key=lambda kv: kv[1])
        if cid in by_id
    ]
