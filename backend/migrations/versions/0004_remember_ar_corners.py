"""Remember the crop the AR files were actually built from.

The corner editor re-detected on every visit. Detection is deterministic, so a
carpet nobody had corrected looked fine — but a shopkeeper who dragged the four
handles, built the files and later came back was shown the automatic corners
again, with nothing on the screen saying that the files on disk had been made
from different ones. Their correction survived in the `.glb` and vanished from
the only view of it.

`ar_corners` is that crop, in the photograph's own pixel space, ordered
tl, tr, br, bl. `ar_corners_manual` is whether a person placed it, which the
panel says out loud and which is also what decides whether a low detection
confidence is still worth warning about.

Both are on the image rather than on the carpet, because the numbers only mean
anything against one photograph. Nullable and false for every existing row: the
files already on disk were built before anything recorded this, and guessing
retroactively would be inventing a record of a decision nobody made. Those rows
simply fall back to detection, which is what they did before.

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-24

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "carpet_images",
        sa.Column("ar_corners", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "carpet_images",
        sa.Column(
            "ar_corners_manual",
            sa.Boolean(),
            nullable=False,
            # The default is for the rows that already exist; the model supplies
            # its own for new ones, so the constraint is not left in the schema
            # to be inherited by inserts that should have said what they mean.
            server_default=sa.false(),
        ),
    )
    op.alter_column("carpet_images", "ar_corners_manual", server_default=None)


def downgrade() -> None:
    op.drop_column("carpet_images", "ar_corners_manual")
    op.drop_column("carpet_images", "ar_corners")
