"""Keep every image derivative, not only the card-sized one.

The upload pipeline has always produced four WebP sizes — thumb 400, card 800,
full 1600, texture 2048 — and written all four to disk, but `carpet_images` had
a single `url` column, so the other three were unreachable the moment the
request ended. Storage is content-addressed on the derivative's own bytes, so a
lost URL cannot be derived from a sibling; it has to be recomputed from the
source photo (`scripts/backfill_image_derivatives.py` does that).

`url` keeps its meaning — the card-sized derivative — so nothing that reads it
today changes. The new columns are nullable because rows written before the
backfill have no honest value to put there, and a caller that finds `full_url`
empty should fall back to `url` rather than trust a fabricated path.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-04

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for column in ("thumb_url", "full_url", "texture_url"):
        op.add_column("carpet_images", sa.Column(column, sa.String(500), nullable=True))


def downgrade() -> None:
    for column in ("thumb_url", "full_url", "texture_url"):
        op.drop_column("carpet_images", column)
