from fastapi import APIRouter

from app.api.v1 import admin, catalog, orders, search

router = APIRouter(prefix="/api/v1")
router.include_router(catalog.router)
router.include_router(search.router)
router.include_router(orders.router)
router.include_router(admin.router)
