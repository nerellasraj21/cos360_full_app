"""add_transport_pricing

Add pickup_time, drop_time to route_stops.
Create billingcycleenum enum type and transport_pricing table.
Add pricing_id column to student_transport_assignments.

Revision ID: h4i5j6k7l8m9
Revises: g3h4i5j6k7l8
Create Date: 2026-03-10 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h4i5j6k7l8m9"
down_revision: Union[str, None] = "g3h4i5j6k7l8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add pickup_time and drop_time to route_stops
    op.add_column("route_stops", sa.Column("pickup_time", sa.Time(), nullable=True))
    op.add_column("route_stops", sa.Column("drop_time", sa.Time(), nullable=True))

    # 2. Create billingcycleenum enum type
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billingcycleenum') THEN
                CREATE TYPE billingcycleenum AS ENUM ('annual', 'semester', 'monthly', 'custom');
            END IF;
        END $$;
    """)

    # 3. Create transport_pricing table
    op.create_table(
        "transport_pricing",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vehicle_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("route_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("routes.id"), nullable=True),
        sa.Column(
            "billing_cycle",
            sa.Enum("annual", "semester", "monthly", "custom", name="billingcycleenum", create_type=False),
            nullable=False,
        ),
        sa.Column("cycle_name", sa.String(100), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_transport_pricing_id", "transport_pricing", ["id"])

    # 4. Add pricing_id to student_transport_assignments
    op.add_column(
        "student_transport_assignments",
        sa.Column(
            "pricing_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("transport_pricing.id"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("student_transport_assignments", "pricing_id")
    op.drop_index("ix_transport_pricing_id", table_name="transport_pricing")
    op.drop_table("transport_pricing")
    op.execute("DROP TYPE IF EXISTS billingcycleenum")
    op.drop_column("route_stops", "drop_time")
    op.drop_column("route_stops", "pickup_time")
