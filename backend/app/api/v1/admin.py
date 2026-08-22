"""Admin panel API: session auth, carpet/variant/image management, orders."""

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from PIL import Image
from sqlalchemy import func, select

from app.api.deps import DbSession, EmbeddingDep, StorageDep
from app.ar import pipeline as ar_pipeline
from app.ar.rectify import detect_corners
from app.core.config import get_settings
from app.core.security import client_key, read_upload
from app.models import Carpet, CarpetImage, CarpetVariant, Order
from app.models.enums import ArAssetStatus, OrderStatus
from app.schemas.admin import (
    AdminCarpetDetail,
    AdminCarpetRow,
    AdminOrderOut,
    AdminStats,
    ArCornerSuggestion,
    ArGenerateRequest,
    ArVariantStatus,
    CarpetCreate,
    CarpetUpdate,
    CornerPoint,
    ImageUpdate,
    LoginRequest,
    OrderStatusUpdate,
    VariantCreate,
    VariantUpdate,
)
from app.schemas.catalog import CarpetDetail, ImageOut, Page, VariantOut
from app.services.auth import (
    SESSION_COOKIE,
    check_rate_limit,
    issue_session,
    record_failed_attempt,
    require_admin,
    verify_credentials,
)
from app.services.images import InvalidImageError, process_upload
from app.services.storage import Storage

router = APIRouter(prefix="/admin", tags=["admin"])


# --- auth -------------------------------------------------------------------


@router.post("/login")
async def login(request: Request, response: Response, payload: LoginRequest) -> dict[str, str]:
    caller = client_key(request)
    check_rate_limit(caller)
    if not verify_credentials(payload.username, payload.password):
        record_failed_attempt(caller)
        raise HTTPException(401, detail="نام کاربری یا رمز عبور نادرست است")

    settings = get_settings()
    response.set_cookie(
        SESSION_COOKIE,
        issue_session(),
        max_age=settings.session_max_age_hours * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )
    return {"status": "ok"}


@router.post("/logout", dependencies=[Depends(require_admin)])
async def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"status": "ok"}


@router.get("/me", dependencies=[Depends(require_admin)])
async def me() -> dict[str, str]:
    return {"username": get_settings().admin_username}


# --- dashboard --------------------------------------------------------------


@router.get("/stats", response_model=AdminStats, dependencies=[Depends(require_admin)])
async def stats(session: DbSession) -> AdminStats:
    """Counters for the dashboard, counted in the database."""

    async def count(stmt) -> int:  # noqa: ANN001 - a select of one aggregate
        return (await session.execute(stmt)).scalar_one() or 0

    carpets = select(func.count(Carpet.id))
    orders = select(func.count(Order.id))
    ar = select(func.count(CarpetVariant.id))

    return AdminStats(
        carpets_active=await count(carpets.where(Carpet.is_active.is_(True))),
        carpets_inactive=await count(carpets.where(Carpet.is_active.is_(False))),
        variants_total=await count(select(func.count(CarpetVariant.id))),
        orders_pending=await count(orders.where(Order.status == OrderStatus.PENDING)),
        orders_confirmed=await count(orders.where(Order.status == OrderStatus.CONFIRMED)),
        orders_cancelled=await count(orders.where(Order.status == OrderStatus.CANCELLED)),
        confirmed_total=(
            await session.execute(
                select(func.coalesce(func.sum(Order.total), 0)).where(
                    Order.status == OrderStatus.CONFIRMED
                )
            )
        ).scalar_one(),
        ar_ready=await count(ar.where(CarpetVariant.ar_status == ArAssetStatus.READY)),
        ar_missing=await count(ar.where(CarpetVariant.ar_status == ArAssetStatus.MISSING)),
        ar_processing=await count(
            ar.where(CarpetVariant.ar_status == ArAssetStatus.PROCESSING)
        ),
        ar_failed=await count(ar.where(CarpetVariant.ar_status == ArAssetStatus.FAILED)),
    )


# --- carpets ----------------------------------------------------------------


@router.get(
    "/carpets", response_model=Page[AdminCarpetRow], dependencies=[Depends(require_admin)]
)
async def list_admin_carpets(
    session: DbSession,
    q: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> Page[AdminCarpetRow]:
    """The management table's own listing — inactive carpets included.

    `is_active` defaults to None meaning «both», which is the whole point: the
    shop's listing hides deactivated carpets, so without this the only way back
    to one would be to remember its id.
    """
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    where = []
    if q:
        where.append(Carpet.name.ilike(f"%{q}%"))
    if is_active is not None:
        where.append(Carpet.is_active.is_(is_active))

    total = (
        await session.execute(select(func.count(Carpet.id)).where(*where))
    ).scalar_one()

    rows = (
        await session.execute(
            select(Carpet)
            .where(*where)
            # Newest first: the carpet just added is the one being worked on.
            .order_by(Carpet.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    items = []
    for carpet in rows:
        prices = [variant.price for variant in carpet.variants]
        primary = next(
            iter(sorted(carpet.images, key=lambda i: (not i.is_primary, i.position))), None
        )
        items.append(
            AdminCarpetRow(
                id=carpet.id,
                slug=carpet.slug,
                name=carpet.name,
                pattern=carpet.pattern,
                material=carpet.material,
                origin=carpet.origin,
                is_active=carpet.is_active,
                variants_count=len(carpet.variants),
                images_count=len(carpet.images),
                min_price=min(prices) if prices else None,
                max_price=max(prices) if prices else None,
                primary_image=primary.url if primary else None,
                ar_ready=sum(
                    1 for v in carpet.variants if v.ar_status == ArAssetStatus.READY
                ),
            )
        )

    return Page[AdminCarpetRow](items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/carpets/{carpet_id}", response_model=AdminCarpetDetail,
    dependencies=[Depends(require_admin)],
)
async def get_admin_carpet(session: DbSession, carpet_id: int) -> AdminCarpetDetail:
    """One carpet for the edit screen — by id, and without the active filter.

    The shop's own `/carpets/{slug}` cannot serve this. It looks up by slug and
    requires `is_active`, so the moment a carpet is deactivated the panel could
    no longer open the page that would turn it back on. By id, because the slug
    is one of the things being edited.
    """
    carpet = await session.get(Carpet, carpet_id)
    if carpet is None:
        raise HTTPException(404, detail="فرش پیدا نشد")
    return AdminCarpetDetail.model_validate(carpet)


@router.post(
    "/carpets", response_model=CarpetDetail, status_code=201,
    dependencies=[Depends(require_admin)],
)
async def create_carpet(session: DbSession, payload: CarpetCreate) -> CarpetDetail:
    duplicate = await session.execute(select(Carpet.id).where(Carpet.slug == payload.slug))
    if duplicate.scalar_one_or_none() is not None:
        raise HTTPException(409, detail="این شناسه (slug) قبلاً استفاده شده")
    carpet = Carpet(**payload.model_dump())
    session.add(carpet)
    await session.commit()
    await session.refresh(carpet)
    return CarpetDetail.model_validate(carpet)


@router.patch(
    "/carpets/{carpet_id}", response_model=CarpetDetail,
    dependencies=[Depends(require_admin)],
)
async def update_carpet(
    session: DbSession, carpet_id: int, payload: CarpetUpdate
) -> CarpetDetail:
    carpet = await session.get(Carpet, carpet_id)
    if carpet is None:
        raise HTTPException(404, detail="فرش پیدا نشد")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(carpet, field, value)
    await session.commit()
    await session.refresh(carpet)
    return CarpetDetail.model_validate(carpet)


# --- variants ---------------------------------------------------------------


@router.post(
    "/carpets/{carpet_id}/variants", response_model=VariantOut, status_code=201,
    dependencies=[Depends(require_admin)],
)
async def add_variant(
    session: DbSession, carpet_id: int, payload: VariantCreate
) -> VariantOut:
    if await session.get(Carpet, carpet_id) is None:
        raise HTTPException(404, detail="فرش پیدا نشد")
    exists_stmt = select(CarpetVariant.id).where(
        CarpetVariant.carpet_id == carpet_id,
        CarpetVariant.width_cm == payload.width_cm,
        CarpetVariant.length_cm == payload.length_cm,
    )
    if (await session.execute(exists_stmt)).scalar_one_or_none() is not None:
        raise HTTPException(409, detail="این سایز قبلاً ثبت شده")
    variant = CarpetVariant(carpet_id=carpet_id, **payload.model_dump())
    session.add(variant)
    await session.commit()
    await session.refresh(variant)
    return VariantOut.model_validate(variant)


@router.patch(
    "/variants/{variant_id}", response_model=VariantOut,
    dependencies=[Depends(require_admin)],
)
async def update_variant(
    session: DbSession, variant_id: int, payload: VariantUpdate
) -> VariantOut:
    variant = await session.get(CarpetVariant, variant_id)
    if variant is None:
        raise HTTPException(404, detail="سایز پیدا نشد")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(variant, field, value)
    await session.commit()
    await session.refresh(variant)
    return VariantOut.model_validate(variant)


@router.delete(
    "/variants/{variant_id}", status_code=204, dependencies=[Depends(require_admin)]
)
async def delete_variant(session: DbSession, variant_id: int) -> None:
    variant = await session.get(CarpetVariant, variant_id)
    if variant is None:
        raise HTTPException(404, detail="سایز پیدا نشد")
    await session.delete(variant)
    await session.commit()


# --- images -----------------------------------------------------------------


@router.post(
    "/carpets/{carpet_id}/images", response_model=ImageOut, status_code=201,
    dependencies=[Depends(require_admin)],
)
async def upload_image(
    session: DbSession,
    storage: StorageDep,
    embedder: EmbeddingDep,
    carpet_id: int,
    file: UploadFile,
) -> ImageOut:
    """آپلود عکس: مشتقات WebP ساخته می‌شود، امبدینگ محاسبه و ذخیره می‌شود."""
    carpet = await session.get(Carpet, carpet_id)
    if carpet is None:
        raise HTTPException(404, detail="فرش پیدا نشد")

    data = await read_upload(file, max_bytes=get_settings().max_upload_mb * 1024 * 1024)
    try:
        image_set = process_upload(data, storage)
    except InvalidImageError as exc:
        raise HTTPException(422, detail=str(exc)) from exc

    count = (
        await session.execute(
            select(func.count(CarpetImage.id)).where(CarpetImage.carpet_id == carpet_id)
        )
    ).scalar_one()

    # first photo also fills in the carpet's colors unless the admin already set them
    if count == 0 and not carpet.colors:
        carpet.colors = image_set.dominant_colors
    # Families follow the same rule but are tracked separately, because an admin
    # who hand-picked the swatches has not thereby picked the filter buckets —
    # the two fields are edited in different places and one being set says
    # nothing about the other.
    if count == 0 and not carpet.color_families:
        carpet.color_families = image_set.color_families

    record = CarpetImage(
        carpet_id=carpet_id,
        url=image_set.urls["card"],
        thumb_url=image_set.urls["thumb"],
        full_url=image_set.urls["full"],
        texture_url=image_set.urls["texture"],
        position=count,
        is_primary=count == 0,
        embedding=embedder.embed_image(data),
        color_histogram=image_set.color_histogram,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return ImageOut.model_validate(record)


@router.patch(
    "/images/{image_id}", response_model=ImageOut, dependencies=[Depends(require_admin)]
)
async def update_image(session: DbSession, image_id: int, payload: ImageUpdate) -> ImageOut:
    image = await session.get(CarpetImage, image_id)
    if image is None:
        raise HTTPException(404, detail="عکس پیدا نشد")
    if payload.position is not None:
        image.position = payload.position
    if payload.is_primary:
        siblings = await session.execute(
            select(CarpetImage).where(CarpetImage.carpet_id == image.carpet_id)
        )
        for sibling in siblings.scalars():
            sibling.is_primary = False
        image.is_primary = True
    await session.commit()
    await session.refresh(image)
    return ImageOut.model_validate(image)


@router.delete("/images/{image_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_image(session: DbSession, image_id: int) -> None:
    image = await session.get(CarpetImage, image_id)
    if image is None:
        raise HTTPException(404, detail="عکس پیدا نشد")
    await session.delete(image)
    await session.commit()


# --- AR assets --------------------------------------------------------------


async def _primary_image(session: DbSession, carpet_id: int) -> CarpetImage:
    carpet = await session.get(Carpet, carpet_id)
    if carpet is None:
        raise HTTPException(404, detail="فرش پیدا نشد")
    image = next(
        iter(sorted(carpet.images, key=lambda i: (not i.is_primary, i.position))), None
    )
    if image is None:
        raise HTTPException(409, detail="این فرش هنوز عکسی ندارد")
    return image


@router.get(
    "/carpets/{carpet_id}/ar/corners",
    response_model=ArCornerSuggestion,
    dependencies=[Depends(require_admin)],
)
async def suggest_corners(
    session: DbSession, storage: StorageDep, carpet_id: int
) -> ArCornerSuggestion:
    """گوشه‌های تشخیص‌داده‌شده برای پیش‌نمایش و اصلاح دستی در پنل."""
    image_row = await _primary_image(session, carpet_id)
    try:
        source = Image.open(storage.open_public_url(image_row.url))
    except (OSError, ValueError) as exc:
        raise HTTPException(422, detail="تصویر منبع قابل خواندن نیست") from exc

    corners, confidence = detect_corners(source)
    return ArCornerSuggestion(
        corners=[CornerPoint(x=x, y=y) for x, y in corners],
        confidence=confidence,
        needs_review=confidence < 0.55,
        image_width=source.width,
        image_height=source.height,
    )


@router.post(
    "/carpets/{carpet_id}/ar/generate",
    status_code=202,
    dependencies=[Depends(require_admin)],
)
async def generate_ar_assets(
    session: DbSession,
    carpet_id: int,
    background: BackgroundTasks,
    payload: ArGenerateRequest | None = None,
) -> dict[str, str]:
    """ساخت (یا بازسازی) فایل‌های AR برای همه‌ی سایزهای این فرش."""
    carpet = await session.get(Carpet, carpet_id)
    if carpet is None:
        raise HTTPException(404, detail="فرش پیدا نشد")
    if not carpet.variants:
        raise HTTPException(409, detail="ابتدا حداقل یک سایز ثبت کنید")
    if not carpet.images:
        raise HTTPException(409, detail="این فرش هنوز عکسی ندارد")

    corners = payload.as_tuple() if payload else None
    if corners is not None:
        # A human placed these — run inline so mistakes surface immediately.
        try:
            await ar_pipeline.generate_for_carpet(
                session, carpet_id, storage=Storage(), corners=corners
            )
        except ar_pipeline.ArPipelineError as exc:
            raise HTTPException(409, detail=str(exc)) from exc
        return {"status": "ready"}

    background.add_task(ar_pipeline.generate_in_background, carpet_id)
    return {"status": "processing"}


@router.get(
    "/carpets/{carpet_id}/ar",
    response_model=list[ArVariantStatus],
    dependencies=[Depends(require_admin)],
)
async def ar_status(session: DbSession, carpet_id: int) -> list[ArVariantStatus]:
    carpet = await session.get(Carpet, carpet_id)
    if carpet is None:
        raise HTTPException(404, detail="فرش پیدا نشد")
    return [
        ArVariantStatus(
            variant_id=variant.id,
            width_cm=variant.width_cm,
            length_cm=variant.length_cm,
            ar_status=variant.ar_status.value,
            glb_url=variant.glb_url,
            usdz_url=variant.usdz_url,
            ar_error=variant.ar_error,
        )
        for variant in carpet.variants
    ]


# --- orders -----------------------------------------------------------------


@router.get(
    "/orders", response_model=list[AdminOrderOut], dependencies=[Depends(require_admin)]
)
async def list_orders(
    session: DbSession, status: OrderStatus | None = None, limit: int = 50
) -> list[AdminOrderOut]:
    stmt = select(Order).order_by(Order.id.desc()).limit(min(limit, 200))
    if status is not None:
        stmt = stmt.where(Order.status == status)
    orders = (await session.execute(stmt)).scalars().all()
    return [AdminOrderOut.model_validate(order) for order in orders]


@router.patch(
    "/orders/{order_id}", response_model=AdminOrderOut, dependencies=[Depends(require_admin)]
)
async def update_order_status(
    session: DbSession, order_id: int, payload: OrderStatusUpdate
) -> AdminOrderOut:
    order = await session.get(Order, order_id)
    if order is None:
        raise HTTPException(404, detail="سفارش پیدا نشد")
    order.status = payload.status
    await session.commit()
    await session.refresh(order)
    return AdminOrderOut.model_validate(order)
