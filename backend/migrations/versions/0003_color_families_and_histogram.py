"""Give colour a form the shop can filter and rank by.

Two columns for two halves of the same gap. `carpets.color_families` buckets
the exact hex values in `carpets.colors` — which are so nearly unique that
grouping the catalogue by them returns one carpet per bucket — into families a
shopper would name, so the colour filter and its facet can exist at all.
`carpet_images.color_histogram` carries the continuous version of the same
description, because DINOv2 reads structure and not colour, and visual search
needs something to re-rank its candidates with.

Both are filled by `scripts/backfill_color.py` from the photographs already on
disk; the operation is deterministic, so re-running it is a no-op rather than a
second opinion. `color_families` defaults to the empty array rather than being
nullable, matching `colors` and `suitable_rooms` beside it — an unclassified
carpet has no colour families, which is a fact, not a missing value.
`color_histogram` is nullable, because a row whose photograph never went
through the pipeline genuinely has no histogram and must not be handed a
fabricated one: the ranking treats null as "cannot judge colour" and falls back
to the embedding alone.

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-14

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COLOR_HISTOGRAM_DIM = 42


def upgrade() -> None:
    op.add_column(
        "carpets",
        sa.Column(
            "color_families",
            postgresql.ARRAY(sa.String(30)),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "carpet_images",
        sa.Column("color_histogram", Vector(COLOR_HISTOGRAM_DIM), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("carpet_images", "color_histogram")
    op.drop_column("carpets", "color_families")
