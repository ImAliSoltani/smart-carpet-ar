"""Catalog queries: listing with filters, text search, visual search, similar."""

from decimal import Decimal
from typing import NamedTuple

from sqlalchemy import Select, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Carpet, CarpetImage, CarpetVariant
from app.models.enums import ColorFamily, RoomType
from app.schemas.catalog import CarpetListItem, CatalogFacets, CatalogFilters
from app.services import color as color_service

# How the two signals are weighted when visual search ranks a candidate.
# Structure leads because it is the reliable one and because it is what a
# shopper photographing a carpet is usually pointing at; colour is heavy enough
# to reorder a shelf of same-shaped rugs, which is exactly the failure it was
# added to fix, and light enough that it cannot promote a carpet that merely
# shares a palette. The split is a starting point to be measured rather than a
# derived constant — the phase 5 evaluation notebook records Precision@k for it
# against the structure-only ranking it replaced.
STRUCTURE_WEIGHT = 0.7
COLOR_WEIGHT = 0.3

# How far past `limit` stage one reaches. Re-ranking can only reorder what it is
# given, so a pool the size of the answer is not a second stage at all; eight
# times leaves room for a carpet ranked thirtieth on structure to win on colour,
# while staying small enough that the whole pool fits in one round trip.
CANDIDATE_MULTIPLIER = 8


class ListingRow(NamedTuple):
    carpet: Carpet
    primary_image: str | None
    cover_image: str | None
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
    # The styled photograph beside the flat one, for the grid to lead with. The
    # primary image is the rug seen square-on — it is the honest view and the
    # one AR needs, but forty of them side by side is forty rectangles of pure
    # pattern, and a کناره shown that way is a narrow strip adrift in a card.
    #
    # Identified as "the first image that is not the primary", which is exactly
    # what it is rather than a new convention: `ingest_catalog.py` writes the
    # flat at position 0 and the styled shots after it, and the admin panel
    # makes the first upload primary and appends the rest. Null when a carpet
    # has only the one photograph, and then the card simply keeps showing it.
    cover_image = (
        select(CarpetImage.url)
        .where(CarpetImage.carpet_id == Carpet.id, CarpetImage.is_primary.is_(False))
        .order_by(CarpetImage.position)
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
        cover_image.label("cover_image"),
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
        # `overlap` again: a carpet is filed under up to three families, and one
        # of them matching is what «فرش آبی» means. It is also what rescues the
        # carpets whose largest colour is not their memorable one — a navy field
        # under a wide cream border is filed cream first and blue second, and a
        # shopper looking for blue should still find it.
        stmt = stmt.where(Carpet.color_families.overlap(filters.color))

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
    item.cover_image = row.cover_image
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

    # Colour counts the same way, and for the same reason: a carpet is filed
    # under up to three families and belongs in each of their counts. This facet
    # did not exist while colour was stored as exact hex — grouping the
    # catalogue that way returned twenty-four buckets holding one carpet each,
    # which teaches a shopper nothing. `color_families` is what made it possible.
    color_col = func.unnest(Carpet.color_families).label("color")
    color_rows = await session.execute(
        select(color_col, func.count()).where(active).group_by(color_col)
    )
    # Same case correction as rooms above: unnest steps outside the Enum type
    # and returns the stored name, while the rest of this payload speaks values.
    colors = {ColorFamily[str(name)].value: n for name, n in color_rows.all()}

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
        colors=colors,
        min_price=lo,
        max_price=hi,
        price_histogram=histogram,
    )


async def stocked_sizes(session: AsyncSession) -> list[tuple[int, int, int]]:
    """Every size the shop actually sells, with how many carpets come in it.

    (width_cm, length_cm, carpet_count), largest first. The size guide needs the
    real list rather than a table of standard sizes: recommending 250×350 to
    somebody whose room takes it is only useful if the shop has one.
    """
    rows = await session.execute(
        select(
            CarpetVariant.width_cm,
            CarpetVariant.length_cm,
            func.count(func.distinct(CarpetVariant.carpet_id)),
        )
        .join(Carpet, Carpet.id == CarpetVariant.carpet_id)
        .where(Carpet.is_active.is_(True), CarpetVariant.stock > 0)
        .group_by(CarpetVariant.width_cm, CarpetVariant.length_cm)
    )
    sizes = [(int(w), int(length), int(n)) for w, length, n in rows.all()]
    return sorted(sizes, key=lambda row: row[0] * row[1], reverse=True)


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
    color_histogram: list[float] | None = None,
    limit: int = 12,
    exclude_carpet_id: int | None = None,
) -> list[tuple[CarpetListItem, float]]:
    """Nearest carpets to a query vector; one hit per carpet (its best image).

    Ranked in two stages, because no single vector answers the question. DINOv2
    reads a carpet's *structure* — it tells لچک‌ترنج from افشان with almost no
    mistakes — and is close to colour-blind, so on its own it answers a photo of
    a green carpet with structurally identical red ones. That was measured on
    this catalogue, not assumed.

    So the embedding index proposes and the colour histogram disposes: stage one
    is the HNSW nearest-neighbour search, over-fetched well past `limit` so that
    stage two has something to reorder, and stage two scores each candidate on
    both and sorts by the combination. Colour is the *second* stage rather than
    a second index because structure is the stronger signal and the one worth
    trusting to narrow the catalogue; colour decides among things already known
    to be shaped alike.

    A candidate with no histogram keeps its structure score alone rather than
    being penalised. Missing is not "no colours in common": those rows predate
    the histogram, and scoring them as maximally different would bury them.
    """
    distance = CarpetImage.embedding.cosine_distance(embedding)
    stmt = (
        select(CarpetImage.carpet_id, distance.label("dist"), CarpetImage.color_histogram)
        .join(Carpet, Carpet.id == CarpetImage.carpet_id)
        .where(CarpetImage.embedding.is_not(None), Carpet.is_active.is_(True))
    )
    if exclude_carpet_id is not None:
        stmt = stmt.where(CarpetImage.carpet_id != exclude_carpet_id)
    stmt = stmt.order_by(distance).limit(limit * CANDIDATE_MULTIPLIER)
    rows = (await session.execute(stmt)).all()

    # Best image per carpet, by structure — the whole candidate pool, not the
    # first `limit` of it. Cutting to `limit` here is what the single-stage
    # version did, and it would leave the re-ranking below nothing to do but
    # shuffle a list already chosen without reference to colour.
    best: dict[int, tuple[float, list[float] | None]] = {}
    for carpet_id, dist, histogram in rows:
        if carpet_id not in best:
            best[carpet_id] = (float(dist), list(histogram) if histogram is not None else None)

    if not best:
        return []

    scored: list[tuple[int, float]] = []
    for carpet_id, (dist, histogram) in best.items():
        structure = 1.0 - dist
        if color_histogram is None or histogram is None:
            scored.append((carpet_id, structure))
            continue
        colour = color_service.histogram_similarity(color_histogram, histogram)
        scored.append(
            (carpet_id, STRUCTURE_WEIGHT * structure + COLOR_WEIGHT * colour)
        )
    scored.sort(key=lambda pair: pair[1], reverse=True)
    scored = scored[:limit]

    listing_rows = (
        await session.execute(_listing_select().where(Carpet.id.in_([c for c, _ in scored])))
    ).all()
    by_id = {row[0].id: row_to_list_item(ListingRow(*row)) for row in listing_rows}
    return [(by_id[cid], score) for cid, score in scored if cid in by_id]
