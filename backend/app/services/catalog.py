"""Catalog queries: listing with filters, text search, visual search, similar."""

from decimal import Decimal
from typing import NamedTuple

from sqlalchemy import Select, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Carpet, CarpetImage, CarpetVariant
from app.models.enums import RoomType
from app.schemas.catalog import CarpetListItem, CatalogFacets, CatalogFilters


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
    # Within one facet the values are alternatives (silk OR wool); across
    # facets they narrow (silk AND for a bedroom). That is what a shopper
    # means by ticking two boxes in the same group.
    if filters.id:
        stmt = stmt.where(Carpet.id.in_(filters.id))
    if filters.pattern:
        stmt = stmt.where(Carpet.pattern.in_(filters.pattern))
    if filters.material:
        stmt = stmt.where(Carpet.material.in_(filters.material))
    if filters.room:
        # `overlap` is the array `&&`: suits any one of the rooms asked for.
        stmt = stmt.where(Carpet.suitable_rooms.overlap(filters.room))
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


async def facets(session: AsyncSession) -> CatalogFacets:
    """What the filter panel needs before anyone has filtered anything.

    A chip that says how many carpets it would leave is only useful if the
    number is true, and a price slider over a range this wide (roughly five to
    two hundred and fifty million toman) is a bare rail unless it can show
    where the carpets actually sit. Neither is derivable on the client: a page
    holds at most sixty rows out of the whole catalogue, so counting what
    arrived would describe the page rather than the shop.

    Deliberately unfiltered. These are the totals of the catalogue, not of the
    current selection — recomputing every facet against every other selection
    is a different and much more expensive feature, and the counts here answer
    the question a shopper actually asks first: how much of the shop is silk.
    """
    active = Carpet.is_active.is_(True)

    async def count_by(column) -> dict[str, int]:
        rows = await session.execute(
            select(column, func.count()).where(active).group_by(column)
        )
        return {str(getattr(v, "value", v)): n for v, n in rows.all()}

    patterns = await count_by(Carpet.pattern)
    materials = await count_by(Carpet.material)

    # `suitable_rooms` is an array column, so a carpet counts once per room it
    # suits; unnest first or the group key is the whole array.
    #
    # Unnesting steps outside the Enum type, so what comes back is the stored
    # name — `OFFICE` — while every other facet here reports the value the API
    # speaks, `office`. Shipping both cases in one payload would have handed the
    # storefront a key it cannot look a label up by, silently, for rooms only.
    room_col = func.unnest(Carpet.suitable_rooms).label("room")
    room_rows = await session.execute(
        select(room_col, func.count()).where(active).group_by(room_col)
    )
    rooms = {RoomType[str(name)].value: n for name, n in room_rows.all()}

    # No colour facet, deliberately. The dominant colours are exact hex values
    # taken off each photograph, so they are very nearly unique: grouping the
    # whole catalogue by colour returns twenty-four buckets holding one carpet
    # each. A facet like that teaches nothing, and the `color` filter it would
    # feed matches hex exactly, so it barely works either. Both need colours
    # bucketed into families first — recorded as a debt of this phase.

    price_stmt = (
        select(func.min(CarpetVariant.price), func.max(CarpetVariant.price))
        .select_from(CarpetVariant)
        .join(Carpet, Carpet.id == CarpetVariant.carpet_id)
        .where(active)
    )
    lo, hi = (await session.execute(price_stmt)).one()

    histogram: list[int] = []
    if lo is not None and hi is not None and hi > lo:
        buckets = 32
        # width_bucket clamps to [1, buckets]; the top price lands in an extra
        # bucket without the min(), which would shorten the last bar by one.
        bucket = func.least(
            func.width_bucket(CarpetVariant.price, lo, hi, buckets), buckets
        ).label("b")
        rows = await session.execute(
            select(bucket, func.count())
            .select_from(CarpetVariant)
            .join(Carpet, Carpet.id == CarpetVariant.carpet_id)
            .where(active)
            .group_by(text("b"))
        )
        counts = dict(rows.all())
        histogram = [counts.get(i, 0) for i in range(1, buckets + 1)]

    return CatalogFacets(
        patterns=patterns,
        materials=materials,
        rooms=rooms,
        min_price=lo,
        max_price=hi,
        price_histogram=histogram,
    )


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
