"""
Migration script: Add primary_phone column to students table in test_tenant_schema.

Usage:
    python scripts/apply_student_primary_phone_test_tenant.py
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
                      AND table_name = 'students'
                      AND column_name = 'primary_phone'
                ) THEN
                    ALTER TABLE students ADD COLUMN primary_phone VARCHAR(15);
                END IF;
            END $$;
        """))
        print("[OK] students.primary_phone (VARCHAR(15))")

        await db.commit()
        print()
        print(f"=== students primary_phone column applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
