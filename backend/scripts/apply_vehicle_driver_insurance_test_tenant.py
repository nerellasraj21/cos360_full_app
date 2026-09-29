"""
Migration script: Add co-driver and insurance fields to vehicles table in test_tenant_schema.

Columns added:
  - co_driver_name         (VARCHAR)
  - driving_licence_no     (VARCHAR)
  - driving_licence_exp_date (DATE)
  - bus_insurance_vendor   (VARCHAR)
  - insurance_expiry_date  (DATE)

Usage:
    python scripts/apply_vehicle_driver_insurance_test_tenant.py
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

COLUMNS = [
    ("co_driver_name",            "VARCHAR"),
    ("driving_licence_no",        "VARCHAR"),
    ("driving_licence_exp_date",  "DATE"),
    ("bus_insurance_vendor",      "VARCHAR"),
    ("insurance_expiry_date",     "DATE"),
]


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        for col_name, col_type in COLUMNS:
            await db.execute(text(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = '{SCHEMA}'
                          AND table_name   = 'vehicles'
                          AND column_name  = '{col_name}'
                    ) THEN
                        ALTER TABLE vehicles ADD COLUMN {col_name} {col_type};
                    END IF;
                END $$;
            """))
            print(f"[OK] vehicles.{col_name} ({col_type})")

        await db.commit()
        print()
        print(f"=== Driver & insurance columns applied to {SCHEMA}.vehicles ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
