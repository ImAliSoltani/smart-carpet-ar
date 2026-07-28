from fastapi import APIRouter, HTTPException

from app.api.deps import DbSession
from app.schemas.orders import OrderCreate, OrderOut, OrderTrackRequest
from app.services import orders as order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=201)
async def create_order(session: DbSession, payload: OrderCreate) -> OrderOut:
    """ثبت سفارش مهمان. پرداخت شبیه‌سازی‌شده است و سفارش «در انتظار تأیید» می‌ماند."""
    try:
        order = await order_service.place_order(session, payload)
    except order_service.OrderError as exc:
        raise HTTPException(409, detail=str(exc)) from exc
    await session.commit()
    return OrderOut.model_validate(order)


@router.post("/track", response_model=OrderOut)
async def track_order(session: DbSession, payload: OrderTrackRequest) -> OrderOut:
    """پیگیری با کد رهگیری + شماره‌ی موبایل (هر دو باید بخوانند تا اطلاعات لو نرود)."""
    order = await order_service.find_order(session, payload.reference, payload.customer_phone)
    if order is None:
        raise HTTPException(404, detail="سفارشی با این مشخصات پیدا نشد")
    return OrderOut.model_validate(order)
