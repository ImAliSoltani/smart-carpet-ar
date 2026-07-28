"""API schemas for guest checkout and order tracking."""

import re
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import OrderStatus

# Iranian mobile numbers; accepts 09xxxxxxxxx or +989xxxxxxxxx
_PHONE_RE = re.compile(r"^(\+98|0)9\d{9}$")


def normalize_phone(value: str) -> str:
    """Normalize Persian/Arabic-Indic digits and validate an Iranian mobile number."""
    cleaned = value.replace(" ", "").replace("-", "")
    for i, d in enumerate("۰۱۲۳۴۵۶۷۸۹"):
        cleaned = cleaned.replace(d, str(i))
    for i, d in enumerate("٠١٢٣٤٥٦٧٨٩"):
        cleaned = cleaned.replace(d, str(i))
    if not _PHONE_RE.match(cleaned):
        raise ValueError("شماره‌ی موبایل معتبر نیست")
    return cleaned


class OrderItemIn(BaseModel):
    variant_id: int
    quantity: int = Field(default=1, ge=1, le=20)


class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=3, max_length=150)
    customer_phone: str
    address: str = Field(min_length=10, max_length=1000)
    note: str | None = Field(default=None, max_length=1000)
    items: list[OrderItemIn] = Field(min_length=1, max_length=20)

    @field_validator("customer_phone")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        return normalize_phone(value)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    carpet_name: str
    width_cm: int
    length_cm: int
    unit_price: Decimal
    quantity: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reference: str
    status: OrderStatus
    total: Decimal
    customer_name: str
    items: list[OrderItemOut]


class OrderTrackRequest(BaseModel):
    reference: str = Field(min_length=6, max_length=20)
    customer_phone: str

    @field_validator("customer_phone")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        return normalize_phone(value)
