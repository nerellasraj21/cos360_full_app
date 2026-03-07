"""
Migration script: Add current_salary column to staff table in test_tenant_schema.

Usage:
    python scripts/apply_staff_current_salary_test_tenant.py
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

        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'staff'
                      AND column_name = 'current_salary'
                ) THEN
                    ALTER TABLE staff ADD COLUMN current_salary NUMERIC(10,2);
                END IF;
            END $$;
        """))
        print("[OK] staff.current_salary (NUMERIC(10,2))")

        await db.commit()
        print()
        print(f"=== current_salary applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
