"""add_staff_qualifications_table

Revision ID: c1d2e3f4a5b6
Revises: 0adb3bb3d5cb, e5f6a7b8c9d0, f1a2b3c4d5e6
Create Date: 2026-03-06 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, tuple, None] = ("0adb3bb3d5cb", "e5f6a7b8c9d0", "f1a2b3c4d5e6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the qualification level enum type
    op.execute(
        "CREATE TYPE qualificationlevelenum AS ENUM "
        "('Below Graduation', 'Graduation', 'Post Graduation', 'PhD')"
    )

    op.create_table(
        "staff_qualifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "staff_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("staff.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "level",
            sa.Enum(
                "Below Graduation",
                "Graduation",
                "Post Graduation",
                "PhD",
                name="qualificationlevelenum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("passed_out_year", sa.Integer(), nullable=True),
        sa.Column("percentage", sa.Numeric(5, 2), nullable=True),
        sa.Column("university", sa.String(255), nullable=True),
    )
    op.create_index("ix_staff_qualifications_id", "staff_qualifications", ["id"], unique=True)
    op.create_index("ix_staff_qualifications_staff_id", "staff_qualifications", ["staff_id"])


def downgrade() -> None:
    op.drop_index("ix_staff_qualifications_staff_id", table_name="staff_qualifications")
    op.drop_index("ix_staff_qualifications_id", table_name="staff_qualifications")
    op.drop_table("staff_qualifications")
    op.execute("DROP TYPE IF EXISTS qualificationlevelenum")
