"""
Migration script: Add pickup_time/drop_time to route_stops, create billingcycleenum
enum and transport_pricing table, add pricing_id to student_transport_assignments
in test_tenant_schema.

Usage:
    python scripts/apply_transport_pricing_test_tenant.py
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

        # 1. Add pickup_time column to route_stops
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'route_stops'
                      AND column_name = 'pickup_time'
                ) THEN
                    ALTER TABLE route_stops ADD COLUMN pickup_time TIME;
                END IF;
            END $$;
        """))
        print("[OK] route_stops.pickup_time added")

        # 2. Add drop_time column to route_stops
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'route_stops'
                      AND column_name = 'drop_time'
                ) THEN
                    ALTER TABLE route_stops ADD COLUMN drop_time TIME;
                END IF;
            END $$;
        """))
        print("[OK] route_stops.drop_time added")

        # 3. Ensure PRIMARY KEY constraints on referenced tables (may be missing)
        for tbl in ["vehicles", "routes"]:
            await db.execute(text(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE table_schema = '{SCHEMA}'
                          AND table_name = '{tbl}'
                          AND constraint_type = 'PRIMARY KEY'
                    ) THEN
                        ALTER TABLE {tbl} ADD PRIMARY KEY (id);
                    END IF;
                END $$;
            """))
        print("[OK] PRIMARY KEY constraints ensured on vehicles, routes")

        # 4a. Create billingcycleenum enum type if not exists
        await db.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billingcycleenum') THEN
                    CREATE TYPE billingcycleenum AS ENUM ('annual', 'semester', 'monthly', 'custom');
                END IF;
            END $$;
        """))
        print("[OK] billingcycleenum type ensured")

        # 4b. Create transport_pricing table if not exists
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'transport_pricing'
                ) THEN
                    CREATE TABLE transport_pricing (
                        id UUID PRIMARY KEY,
                        vehicle_id UUID NOT NULL REFERENCES vehicles(id),
                        route_id UUID REFERENCES routes(id),
                        billing_cycle billingcycleenum NOT NULL,
                        cycle_name VARCHAR(100) NOT NULL,
                        amount NUMERIC(10,2) NOT NULL,
                        start_date DATE NOT NULL,
                        end_date DATE NOT NULL,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    );
                    CREATE INDEX ix_transport_pricing_id ON transport_pricing(id);
                END IF;
            END $$;
        """))
        print("[OK] transport_pricing table ensured")

        # 5. Add pricing_id to student_transport_assignments
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'student_transport_assignments'
                      AND column_name = 'pricing_id'
                ) THEN
                    ALTER TABLE student_transport_assignments
                        ADD COLUMN pricing_id UUID REFERENCES transport_pricing(id);
                END IF;
            END $$;
        """))
        print("[OK] student_transport_assignments.pricing_id added")

        await db.commit()
        print()
        print(f"=== Transport pricing migration applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
