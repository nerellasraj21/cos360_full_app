"""
Migration script: Add unique constraint on (vehicle_id, route_id) to trips table
in test_tenant_schema to prevent a vehicle being assigned to the same route twice.

Usage:
    python scripts/apply_trip_unique_constraint_test_tenant.py
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings

SCHEMA = "test_tenant_schema"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # Step 1: Remove duplicate (vehicle_id, route_id) rows, keep the earliest row
        await db.execute(text("""
            DELETE FROM trips
            WHERE id NOT IN (
                SELECT MIN(id::text)::uuid
                FROM trips
                GROUP BY vehicle_id, route_id
            )
        """))
        print("[OK] Duplicate trips removed")

        # Step 2: Add unique constraint if not already present
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'trips'
                      AND constraint_name = 'uq_trip_vehicle_route'
                ) THEN
                    ALTER TABLE trips
                        ADD CONSTRAINT uq_trip_vehicle_route UNIQUE (vehicle_id, route_id);
                END IF;
            END $$;
        """))
        print("[OK] uq_trip_vehicle_route unique constraint applied to trips")

        await db.commit()
        print()
        print(f"=== trips unique constraint applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
