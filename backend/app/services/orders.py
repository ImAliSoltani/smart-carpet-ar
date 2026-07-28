"""Order placement and lookup."""

import secrets
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Carpet, CarpetVariant, Order, OrderItem
from app.schemas.orders import OrderCreate

# unambiguous alphabet (no 0/O/1/I) — read over the phone without mistakes
_REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


class OrderError(ValueError):
    """User-facing order failure (Persian message)."""


def generate_reference() -> str:
    return "FR-" + "".join(secrets.choice(_REFERENCE_ALPHABET) for _ in range(8))


async def place_order(session: AsyncSession, payload: OrderCreate) -> Order:
    variant_ids = [item.variant_id for item in payload.items]
    result = await session.execute(
        select(CarpetVariant, Carpet.name)
        .join(Carpet, CarpetVariant.carpet_id == Carpet.id)
        .where(CarpetVariant.id.in_(variant_ids), Carpet.is_active.is_(True))
    )
    by_id = {variant.id: (variant, carpet_name) for variant, carpet_name in result.all()}

    missing = [vid for vid in variant_ids if vid not in by_id]
    if missing:
        raise OrderError("برخی اقلام سبد دیگر موجود نیستند؛ سبد را به‌روز کنید")

    order = Order(
        reference=generate_reference(),
        customer_name=payload.customer_name.strip(),
        customer_phone=payload.customer_phone,
        address=payload.address.strip(),
        note=payload.note,
    )

    total = Decimal(0)
    for item in payload.items:
        variant, carpet_name = by_id[item.variant_id]
        if variant.stock < item.quantity:
            raise OrderError(f"موجودی «{carpet_name}» کافی نیست")
        variant.stock -= item.quantity
        line = OrderItem(
            variant_id=variant.id,
            carpet_name=carpet_name,
            width_cm=variant.width_cm,
            length_cm=variant.length_cm,
            unit_price=variant.price,
            quantity=item.quantity,
        )
        order.items.append(line)
        total += variant.price * item.quantity

    order.total = total
    session.add(order)
    await session.flush()
    return order


async def find_order(session: AsyncSession, reference: str, phone: str) -> Order | None:
    result = await session.execute(
        select(Order).where(
            Order.reference == reference.strip().upper(),
            Order.customer_phone == phone,
        )
    )
    return result.scalar_one_or_none()
