"""add_fee_collection_tables

Create concessionapproverenum and oldfeesourceenum enum types.
Create fee_concessions and fee_old tables.

Revision ID: i5j6k7l8m9n0
Revises: h4i5j6k7l8m9
Create Date: 2026-03-11 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "i5j6k7l8m9n0"
down_revision: Union[str, None] = "h4i5j6k7l8m9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'concessionapproverenum') THEN
                CREATE TYPE concessionapproverenum AS ENUM
                    ('owner', 'principal', 'management', 'correspondent');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oldfeesourceenum') THEN
                CREATE TYPE oldfeesourceenum AS ENUM
                    ('auto_carryforward', 'manual_entry');
            END IF;
        END $$;
    """)

    # Create fee_concessions table
    op.create_table(
        "fee_concessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("students.id"), nullable=False, index=True),
        sa.Column("student_admission_num", sa.String(50), nullable=False),
        sa.Column("fee_type_id", UUID(as_uuid=True), sa.ForeignKey("fee_types.id"), nullable=False, index=True),
        sa.Column("fee_student_map_id", UUID(as_uuid=True), sa.ForeignKey("fee_student_mappings.id"), nullable=False),
        sa.Column("academic_year_id", UUID(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=False, index=True),
        sa.Column("assigned_fee", sa.Numeric(10, 2), nullable=False),
        sa.Column("concession_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column(
            "approved_by",
            sa.Enum("owner", "principal", "management", "correspondent", name="concessionapproverenum", create_type=False),
            nullable=False,
        ),
        sa.Column("approved_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("recorded_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.TIMESTAMP, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("student_id", "fee_type_id", "academic_year_id", name="uq_concession_student_fee_year"),
    )

    # Create fee_old table
    op.create_table(
        "fee_old",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("students.id"), nullable=False, index=True),
        sa.Column("student_admission_num", sa.String(50), nullable=False),
        sa.Column("academic_year_label", sa.String(20), nullable=False),
        sa.Column("source_academic_year_id", UUID(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=True),
        sa.Column("fee_type_name", sa.String(100), nullable=False),
        sa.Column("fee_type_id", UUID(as_uuid=True), sa.ForeignKey("fee_types.id"), nullable=True),
        sa.Column(
            "source",
            sa.Enum("auto_carryforward", "manual_entry", name="oldfeesourceenum", create_type=False),
            nullable=False,
        ),
        sa.Column("original_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("paid_amount", sa.Numeric(10, 2), nullable=False, server_default=sa.text("0")),
        sa.Column("paid_date", sa.Date, nullable=True),
        sa.Column("receipt_manual", sa.String(100), nullable=True),
        sa.Column("receipt_system", sa.String(100), nullable=True),
        sa.Column("is_settled", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("remarks", sa.String(500), nullable=True),
        sa.Column("current_academic_year_id", UUID(as_uuid=True), sa.ForeignKey("academic_years.id"), nullable=True),
        sa.Column("created_by_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP, nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("fee_old")
    op.drop_table("fee_concessions")
    op.execute("DROP TYPE IF EXISTS oldfeesourceenum")
    op.execute("DROP TYPE IF EXISTS concessionapproverenum")
