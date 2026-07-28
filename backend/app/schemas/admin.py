"""API schemas for the admin panel."""

from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.models.enums import CarpetMaterial, CarpetPattern, OrderStatus, RoomType

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
