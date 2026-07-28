"""Test fixtures.

Environment is pinned BEFORE any app import so every module (settings cache,
engine) sees test values. Integration tests need a reachable Postgres with the
pgvector extension — CI provides one as a service container; locally they skip
automatically when no server is listening.
"""

import asyncio
import os

import bcrypt

os.environ.setdefault("SESSION_SECRET", "test-secret")
os.environ.setdefault("ADMIN_USERNAME", "admin")
os.environ.setdefault("STORAGE_DIR", "data/test-storage")
# cost 4 keeps the suite fast; production uses the default cost
os.environ.setdefault(
    "ADMIN_PASSWORD_HASH",
    bcrypt.hashpw(b"test-password", bcrypt.gensalt(rounds=4)).decode(),
)

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import get_settings
from app.services.embeddings import HashEmbeddingBackend, set_embedding_backend

TABLES = ("order_items", "orders", "carpet_images", "carpet_variants", "carpets")


def _database_reachable() -> bool:
    from app.db.session import engine

    async def probe() -> bool:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    return asyncio.run(probe())


@pytest.fixture(scope="session")
def db_available() -> bool:
    return _database_reachable()


@pytest.fixture(scope="session")
def migrated(db_available: bool) -> bool:
    if not db_available:
        return False
    command.upgrade(Config("alembic.ini"), "head")
    return True


@pytest.fixture
def db(migrated: bool):
    """Clean database for one integration test; skips when Postgres is absent."""
    if not migrated:
        pytest.skip("Postgres (pgvector) در دسترس نیست — در CI اجرا می‌شود")

    from app.db.session import engine

    async def truncate() -> None:
        async with engine.begin() as conn:
            await conn.execute(
                text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE")
            )

    asyncio.run(truncate())
    yield


@pytest.fixture
def client(db) -> TestClient:
    set_embedding_backend(HashEmbeddingBackend())
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
    set_embedding_backend(None)


@pytest.fixture
def admin_client(client: TestClient) -> TestClient:
    response = client.post(
        "/api/v1/admin/login", json={"username": "admin", "password": "test-password"}
    )
    assert response.status_code == 200, response.text
    return client


@pytest.fixture(autouse=True)
def _clean_storage():
    yield
    import shutil

    storage_dir = get_settings().storage_dir
    if storage_dir.exists() and "test-storage" in str(storage_dir):
        shutil.rmtree(storage_dir, ignore_errors=True)
