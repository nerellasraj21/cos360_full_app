"""
Migration script: Add unique constraint on (route_id, number) to route_stops table
in test_tenant_schema to prevent duplicate stop numbers on the same route.

Usage:
    python scripts/apply_route_stop_unique_constraint_test_tenant.py
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

        # Step 1: Remove duplicate (route_id, number) rows, keep the earliest row
        await db.execute(text("""
            DELETE FROM route_stops
            WHERE id NOT IN (
                SELECT MIN(id::text)::uuid
                FROM route_stops
                GROUP BY route_id, number
            )
        """))
        print("[OK] Duplicate route_stops removed")

        # Step 2: Add unique constraint if not already present
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'route_stops'
                      AND constraint_name = 'uq_route_stop_number'
                ) THEN
                    ALTER TABLE route_stops
                        ADD CONSTRAINT uq_route_stop_number UNIQUE (route_id, number);
                END IF;
            END $$;
        """))
        print("[OK] uq_route_stop_number unique constraint applied to route_stops")

        await db.commit()
        print()
        print(f"=== route_stops unique constraint applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
