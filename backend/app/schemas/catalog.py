"""API schemas for the public catalog."""

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ArAssetStatus, CarpetMaterial, CarpetPattern, RoomType


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
    url: str
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
    pattern: CarpetPattern | None = None
    material: CarpetMaterial | None = None
    room: RoomType | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    min_width_cm: int | None = Field(default=None, ge=1)
    max_width_cm: int | None = Field(default=None, ge=1)
    min_length_cm: int | None = Field(default=None, ge=1)
    max_length_cm: int | None = Field(default=None, ge=1)
    min_price: Decimal | None = Field(default=None, ge=0)
    max_price: Decimal | None = Field(default=None, ge=0)
    sort: Literal["newest", "price_asc", "price_desc"] = "newest"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=24, ge=1, le=60)


class SimilarItem(BaseModel):
    carpet: CarpetListItem
    similarity: float = Field(description="1 = عین هم؛ بر اساس فاصله‌ی کسینوسی")


class VisualSearchResponse(BaseModel):
    results: list[SimilarItem]
