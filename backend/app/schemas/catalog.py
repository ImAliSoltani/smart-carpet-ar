"""API schemas for the public catalog."""

from decimal import Decimal
from typing import Annotated, Literal

from fastapi import Query
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    ArAssetStatus,
    CarpetMaterial,
    CarpetPattern,
    ColorFamily,
    RoomType,
)


class VariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    width_cm: int
    length_cm: int
    price: Decimal
    stock: int
    glb_url: str | None
    usdz_url: str | None
    ar_status: ArAssetStatus


class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # `url` is the 800px derivative and stays the safe default; the other two
    # are null on rows predating the derivative columns, so a client that wants
    # a specific size asks for it and falls back to `url` when it is absent.
    url: str
    thumb_url: str | None = None
    full_url: str | None = None
    position: int
    is_primary: bool


class CarpetListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    pattern: CarpetPattern
    material: CarpetMaterial
    colors: list[str]
    color_families: list[ColorFamily]
    primary_image: str | None = None
    min_price: Decimal | None = None
    sizes_count: int = 0


class CarpetDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    description: str | None
    pattern: CarpetPattern
    material: CarpetMaterial
    colors: list[str]
    color_families: list[ColorFamily]
    suitable_rooms: list[RoomType]
    origin: str | None
    variants: list[VariantOut]
    images: list[ImageOut]


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int


class CatalogFilters(BaseModel):
    """Query params of the listing endpoint — one source of truth for the API contract."""

    q: str | None = Field(default=None, max_length=100, description="جست‌وجوی متنی")
    # Repeatable. A shopper narrowing to "silk" almost always means "silk or
    # wool, not polyester" — a single value forces them to look twice and
    # compare from memory. Repeat the parameter: ?material=silk&material=wool.
    # `Query()` is not decoration. Inside a model used as a dependency, FastAPI
    # only treats a list field as a repeatable query parameter when it is
    # annotated; without it the values are silently dropped and every request
    # comes back unfiltered — which is what happened, and it returns 200.
    _repeat = "چند مقدار، با تکرار همین پارامتر"
    pattern: Annotated[list[CarpetPattern] | None, Query(description=_repeat)] = None
    material: Annotated[list[CarpetMaterial] | None, Query(description=_repeat)] = None
    room: Annotated[list[RoomType] | None, Query(description=_repeat)] = None
    # Named carpets, for a list the device is holding rather than one the
    # shopper is narrowing: favourites and comparison (§6-11) keep ids and have
    # no other way to ask for them. It composes with the rest like any other
    # filter — an id outside the set simply does not match.
    id: Annotated[list[int] | None, Query(description=_repeat)] = None
    # A named family, not a hex. The hex version of this filter matched exact
    # dominant colours, which are read off each photograph and so are all but
    # unique — it could be satisfied only by pasting a value the shopper had no
    # way to know. Families are the same colours bucketed into words, and the
    # parameter repeats like the others: ?color=blue&color=cream.
    color: Annotated[list[ColorFamily] | None, Query(description=_repeat)] = None
    min_width_cm: int | None = Field(default=None, ge=1)
    max_width_cm: int | None = Field(default=None, ge=1)
    min_length_cm: int | None = Field(default=None, ge=1)
    max_length_cm: int | None = Field(default=None, ge=1)
    min_price: Decimal | None = Field(default=None, ge=0)
    max_price: Decimal | None = Field(default=None, ge=0)
    sort: Literal["newest", "price_asc", "price_desc"] = "newest"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=24, ge=1, le=60)


class CatalogFacets(BaseModel):
    """Counts and ranges the filter panel needs before any filter is applied.

    Keys are the enum *values* the API speaks (`silk`, `lachak_toranj`), so the
    storefront can look a count up by the same string it puts in the query.
    Members with no stock are simply absent rather than present with a zero.
    """

    patterns: dict[str, int]
    materials: dict[str, int]
    rooms: dict[str, int]
    colors: dict[str, int]
    min_price: Decimal | None
    max_price: Decimal | None
    price_histogram: list[int] = Field(
        default_factory=list,
        description="۳۲ سطل هم‌عرض بین min_price و max_price؛ تعداد سایزهای فروشی در هر سطل",
    )


class SimilarItem(BaseModel):
    carpet: CarpetListItem
    similarity: float = Field(
        description=(
            "۱ = عین هم. ترکیب وزنی شباهت ساختار (امبدینگ) و شباهت رنگ "
            "(هیستوگرام HSV)؛ وقتی تصویر پرس‌وجو یا کاندید هیستوگرام نداشته "
            "باشد، فقط ساختار."
        )
    )


class VisualSearchResponse(BaseModel):
    results: list[SimilarItem]
