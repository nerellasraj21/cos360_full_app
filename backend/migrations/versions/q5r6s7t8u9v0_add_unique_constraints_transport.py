"""add unique constraints to routes, route_stops, trips

Revision ID: q5r6s7t8u9v0
Revises: p4q5r6s7t8u9
Create Date: 2026-05-21
"""
from alembic import op

revision = "q5r6s7t8u9v0"
down_revision = "p4q5r6s7t8u9"
branch_labels = None
depends_on = None


def upgrade():
    # ── routes ──────────────────────────────────────────────────────────────
    # Remove duplicate route_name rows, keeping the earliest created row
    op.execute("""
        DELETE FROM routes
        WHERE id NOT IN (
            SELECT MIN(id::text)::uuid
            FROM routes
            GROUP BY route_name
        )
    """)
    op.create_unique_constraint("uq_route_name", "routes", ["route_name"])

    # ── route_stops ──────────────────────────────────────────────────────────
    # Remove duplicate (route_id, number) rows, keeping the earliest created row
    op.execute("""
        DELETE FROM route_stops
        WHERE id NOT IN (
            SELECT MIN(id::text)::uuid
            FROM route_stops
            GROUP BY route_id, number
        )
    """)
    op.create_unique_constraint("uq_route_stop_number", "route_stops", ["route_id", "number"])

    # ── trips ────────────────────────────────────────────────────────────────
    # Remove duplicate (vehicle_id, route_id) rows, keeping the earliest created row
    op.execute("""
        DELETE FROM trips
        WHERE id NOT IN (
            SELECT MIN(id::text)::uuid
            FROM trips
            GROUP BY vehicle_id, route_id
        )
    """)
    op.create_unique_constraint("uq_trip_vehicle_route", "trips", ["vehicle_id", "route_id"])


def downgrade():
    op.drop_constraint("uq_trip_vehicle_route", "trips", type_="unique")
    op.drop_constraint("uq_route_stop_number", "route_stops", type_="unique")
    op.drop_constraint("uq_route_name", "routes", type_="unique")
