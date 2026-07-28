"""Orders.

Checkout runs to order placement only — a real payment gateway needs a
registered business, which is out of reach here, so payment is simulated and
this is stated openly in the report.

Line items copy the price and size that were shown at the time of ordering, so
a later catalog edit cannot rewrite the history of an existing order.
"""

from decimal import Decimal

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import OrderStatus


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    customer_name: Mapped[str] = mapped_column(String(150))
    customer_phone: Mapped[str] = mapped_column(String(20))
    address: Mapped[str] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)

    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, native_enum=False), default=OrderStatus.PENDING, index=True
    )
    total: Mapped[Decimal] = mapped_column(Numeric(12, 0), default=0)

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_order_item_quantity_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    # Kept if the variant is later removed, so the order stays readable.
    variant_id: Mapped[int | None] = mapped_column(
        ForeignKey("carpet_variants.id", ondelete="SET NULL")
    )

    carpet_name: Mapped[str] = mapped_column(String(200))
    width_cm: Mapped[int] = mapped_column(Integer)
    length_cm: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 0))
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    order: Mapped[Order] = relationship(back_populates="items")

    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity
