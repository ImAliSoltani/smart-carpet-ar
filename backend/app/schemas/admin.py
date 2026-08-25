"""API schemas for the admin panel."""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import CarpetMaterial, CarpetPattern, OrderStatus, RoomType
from app.schemas.catalog import CarpetDetail
from app.schemas.orders import OrderItemOut

_HEX = r"^#[0-9a-fA-F]{6}$"


class LoginRequest(BaseModel):
    username: str = Field(max_length=100)
    password: str = Field(max_length=200)


class CarpetCreate(BaseModel):
    slug: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    pattern: CarpetPattern
    material: CarpetMaterial
    colors: list[str] = Field(default_factory=list, max_length=8)
    suitable_rooms: list[RoomType] = Field(default_factory=list)
    origin: str | None = Field(default=None, max_length=100)

    @field_validator("colors")
    @classmethod
    def normalize_colors(cls, values: list[str]) -> list[str]:
        import re

        for value in values:
            if not re.match(_HEX, value):
                raise ValueError(f"رنگ نامعتبر: {value}")
        return [v.lower() for v in values]


class CarpetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    pattern: CarpetPattern | None = None
    material: CarpetMaterial | None = None
    colors: list[str] | None = Field(default=None, max_length=8)
    suitable_rooms: list[RoomType] | None = None
    origin: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None

    @field_validator("colors")
    @classmethod
    def normalize_colors(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        return CarpetCreate.normalize_colors(values)


class VariantCreate(BaseModel):
    width_cm: int = Field(ge=30, le=2000)
    length_cm: int = Field(ge=30, le=3000)
    price: Decimal = Field(ge=0)
    stock: int = Field(default=0, ge=0)


class VariantUpdate(BaseModel):
    price: Decimal | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)


class ImageUpdate(BaseModel):
    position: int | None = Field(default=None, ge=0)
    is_primary: bool | None = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class AdminOrderItemOut(OrderItemOut):
    """A line of an order, with enough of the carpet to recognise and open it.

    A subclass rather than three more fields on `OrderItemOut`, for the reason
    the panel's other shapes are also subclasses: the public line is what a
    buyer is shown when they track a parcel, and it should carry the name and
    the size they bought and nothing else. None of this is secret — it is the
    catalogue — it is simply not part of the answer to «where is my order».

    Every one of them is optional, and that is the data model rather than
    caution. `OrderItem.variant_id` is `ON DELETE SET NULL` on purpose, so that
    removing a size a shop no longer sells leaves the orders that bought it
    readable; the line keeps its own copy of the name, the size and the price.
    What it cannot keep is the way back to the carpet. So a line whose size has
    since been deleted arrives with the text and no picture, which is exactly
    what is true about it.
    """

    variant_id: int | None = None
    # The panel's own link, `/admin/carpets/{id}` — an id, because that is what
    # the panel navigates by, and the slug is one of the things it can edit.
    carpet_id: int | None = None
    # The thumbnail derivative where there is one; older rows only have `url`.
    carpet_image: str | None = None


class AdminOrderOut(BaseModel):
    """An order as the shopkeeper needs to see it (ROADMAP §6-17).

    Separate from the public `OrderOut` in both directions.

    It carries **more**: the phone number and address, without which an order
    cannot be fulfilled, and `created_at`, without which a list of orders has
    no order. And `id` — the status endpoint is keyed by id, so a management
    table built on the public shape could list orders and never change one.

    It also leaves the public shape **alone**, which is the point. Someone
    tracking a parcel proves who they are with a reference and a phone number;
    echoing the delivery address back into that response would put it one
    guessed reference away from a stranger.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    status: OrderStatus
    total: Decimal
    created_at: datetime

    customer_name: str
    customer_phone: str
    address: str
    note: str | None

    items: list[AdminOrderItemOut]


class AdminStats(BaseModel):
    """The dashboard's counters (ROADMAP §6-14).

    Counted in the database rather than by measuring the length of a list the
    API returned. `/admin/orders` caps at 200 rows, so counting its response
    would quietly stop being true on the two-hundred-and-first order — and a
    dashboard that is wrong only once the shop gets busy is worse than none.
    """

    carpets_active: int
    carpets_inactive: int
    variants_total: int

    orders_pending: int
    orders_confirmed: int
    orders_cancelled: int
    # Confirmed orders only. Pending ones have not been agreed with the buyer
    # yet, and counting them as sales would flatter the number.
    confirmed_total: Decimal

    # Per size, not per carpet: an AR asset belongs to one size.
    ar_ready: int
    ar_missing: int
    ar_processing: int
    ar_failed: int


class AdminCarpetRow(BaseModel):
    """One row of the carpet management table (ROADMAP §6-15).

    Deliberately not `CarpetListItem`. That one is the shop's view and hides
    everything a shopper must not see — above all it only ever returns active
    carpets, so an admin who deactivated a carpet could never find it again to
    turn it back on.
    """

    id: int
    slug: str
    name: str
    pattern: CarpetPattern
    material: CarpetMaterial
    origin: str | None
    is_active: bool

    variants_count: int
    images_count: int
    min_price: Decimal | None
    max_price: Decimal | None
    primary_image: str | None

    # Enough to show «۳ از ۴ آماده» without asking for each carpet's AR status
    # one request at a time.
    ar_ready: int


class AdminCarpetDetail(CarpetDetail):
    """A carpet as the edit screen needs it: everything the shop sees, plus
    whether the shop is allowed to see it.

    `is_active` is absent from the public shape for a good reason — the
    storefront only ever receives active carpets, so the field would be a
    constant `true` on every response and mean nothing. Here it is the state a
    whole button exists to change.
    """

    is_active: bool


class CornerPoint(BaseModel):
    x: float = Field(ge=0)
    y: float = Field(ge=0)


class ArGenerateRequest(BaseModel):
    """Optional manual corners from the admin panel's draggable handles.

    Order is top-left, top-right, bottom-right, bottom-left, in pixels of the
    original photo. Omit to let detection choose.
    """

    corners: list[CornerPoint] | None = Field(default=None, min_length=4, max_length=4)

    def as_tuple(self) -> tuple[tuple[float, float], ...] | None:
        if self.corners is None:
            return None
        return tuple((point.x, point.y) for point in self.corners)


class ArVariantStatus(BaseModel):
    variant_id: int
    width_cm: int
    length_cm: int
    ar_status: str
    glb_url: str | None
    usdz_url: str | None
    ar_error: str | None


class ArCornerSuggestion(BaseModel):
    """Where the corner editor should open, and where automatic detection is.

    Two sets, because the screen needs both. `corners` is what the handles are
    placed on: the crop the AR files on disk were built from, if any have been
    built, and detection otherwise. `detected` is always what detection says
    right now, which is what «بازگرداندن گوشه‌های تشخیص‌داده‌شده» puts back —
    a button that could not exist while the two were the same field.
    """

    corners: list[CornerPoint]
    detected: list[CornerPoint]
    # `manual`: a person placed `corners` and the current files were built from
    # them. `automatic`: files were built, from detection. `detected`: nothing
    # has been built for this photograph yet.
    source: Literal["manual", "automatic", "detected"]
    confidence: float
    needs_review: bool
    image_width: int
    image_height: int
