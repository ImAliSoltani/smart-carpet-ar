"""Make sure the end-to-end database exists, with pgvector in it.

Alembic can create tables but not the database that holds them, and `CREATE
EXTENSION vector` needs to run before the first migration that declares a vector
column. On a developer's machine both are usually already there; on a fresh CI
runner neither is, and the failure is a connection error several steps away from
the cause.

Idempotent, so `npm run e2e` can call it every time.
"""

import asyncio
import os
import re
import sys

import asyncpg

DEFAULT_URL = "postgresql+asyncpg://farsh:farsh@localhost:5432/farsh_e2e"


def _split(url: str) -> tuple[str, str]:
    """(admin connection to `postgres`, target database name)."""
    dsn = re.sub(r"^postgresql\+\w+://", "postgresql://", url)
    name = dsn.rsplit("/", 1)[-1].split("?")[0]
    return dsn.rsplit("/", 1)[0] + "/postgres", name


async def main() -> None:
    url = os.environ.get("DATABASE_URL", DEFAULT_URL)
    if "e2e" not in url:
        # A guard, not a formality. This script's next act is to hand a
        # connection to a suite whose first statement is TRUNCATE.
        sys.exit(f"DATABASE_URL باید به دیتابیس e2e اشاره کند، نه {url}")

    admin_dsn, name = _split(url)
    conn = await asyncpg.connect(admin_dsn)
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", name)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{name}"')
            print(f"دیتابیس {name} ساخته شد")
    finally:
        await conn.close()

    target = await asyncpg.connect(re.sub(r"^postgresql\+\w+://", "postgresql://", url))
    try:
        await target.execute("CREATE EXTENSION IF NOT EXISTS vector")
        await target.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    finally:
        await target.close()


if __name__ == "__main__":
    asyncio.run(main())
