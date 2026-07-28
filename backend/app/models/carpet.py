"""Catalog model.

A `Carpet` is the design (pattern, colours, story). A `CarpetVariant` is one
purchasable size of that design — this split matters here because the same rug
is sold in several standard sizes, and **each size needs its own AR asset**:
real-world dimensions are baked into the generated `.glb`/`.usdz`, so one file
cannot serve two sizes.

Dimensions are stored in centimetres as integers to avoid float drift; the AR
pipeline converts to metres at generation time.
"""

from decimal import Decimal

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import ArAssetStatus, CarpetMaterial, CarpetPattern, RoomType

# DINOv2 ViT-B/14 produces 768-d embeddings; a change here needs a migration.
EMBEDDING_DIM = 768


class Carpet(Base, TimestampMixin):
    __tablename__ = "carpets"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)

    pattern: Mapped[CarpetPattern] = mapped_column(Enum(CarpetPattern, native_enum=False))
    material: Mapped[CarpetMaterial] = mapped_column(Enum(CarpetMaterial, native_enum=False))

    # Dominant colours as hex, ordered by coverage — extracted from the photo at
    # ingest time and used for colour filtering and the room-matching engine.
    colors: Mapped[list[str]] = mapped_column(ARRAY(String(7)), default=list)
    suitable_rooms: Mapped[list[RoomType]] = mapped_column(
        ARRAY(Enum(RoomType, native_enum=False)), default=list
    )

    origin: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    variants: Mapped[list["CarpetVariant"]] = relationship(
        back_populates="carpet", cascade="all, delete-orphan", lazy="selectin"
    )
    images: Mapped[list["CarpetImage"]] = relationship(
        back_populates="carpet",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="CarpetImage.position",
    )


class CarpetVariant(Base, TimestampMixin):
    """One purchasable size of a carpet, with its own AR assets."""

    __tablename__ = "carpet_variants"
    __table_args__ = (
        UniqueConstraint("carpet_id", "width_cm", "length_cm", name="uq_variant_size"),
        CheckConstraint("width_cm > 0 AND length_cm > 0", name="ck_variant_positive_size"),
        CheckConstraint("price >= 0", name="ck_variant_price_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    carpet_id: Mapped[int] = mapped_column(
        ForeignKey("carpets.id", ondelete="CASCADE"), index=True
    )

    width_cm: Mapped[int] = mapped_column(Integer)
    length_cm: Mapped[int] = mapped_column(Integer)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 0))  # rial/toman, no minor unit
    stock: Mapped[int] = mapped_column(Integer, default=0)

    glb_url: Mapped[str | None] = mapped_column(String(500))
    usdz_url: Mapped[str | None] = mapped_column(String(500))
    ar_status: Mapped[ArAssetStatus] = mapped_column(
        Enum(ArAssetStatus, native_enum=False), default=ArAssetStatus.MISSING
    )
    ar_error: Mapped[str | None] = mapped_column(Text)

    carpet: Mapped[Carpet] = relationship(back_populates="variants")

    @property
    def area_sqm(self) -> float:
        return (self.width_cm * self.length_cm) / 10_000


class CarpetImage(Base, TimestampMixin):
    """A photo of a carpet. The `is_primary` one drives visual search and AR."""

    __tablename__ = "carpet_images"
    __table_args__ = (
        Index(
            "ix_carpet_images_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    carpet_id: Mapped[int] = mapped_column(
        ForeignKey("carpets.id", ondelete="CASCADE"), index=True
    )

    url: Mapped[str] = mapped_column(String(500))
    # Perspective-corrected top-down version, produced by the AR pipeline and
    # used as the texture. Null until that step runs.
    rectified_url: Mapped[str | None] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))

    carpet: Mapped[Carpet] = relationship(back_populates="images")
