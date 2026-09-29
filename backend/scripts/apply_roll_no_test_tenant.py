"""
Apply roll_no column to test_tenant_schema.student_admissions table.
Mirrors migration u9v0w1x2y3z4 already applied to cos360_master.

Usage:
    python scripts/apply_roll_no_test_tenant.py
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

        result = await db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = :schema AND table_name = 'student_admissions' AND column_name = 'roll_no'
        """), {"schema": SCHEMA})

        if result.scalar_one_or_none():
            print(f"[SKIP] Column 'roll_no' already exists in {SCHEMA}.student_admissions")
        else:
            await db.execute(text(
                "ALTER TABLE student_admissions ADD COLUMN roll_no VARCHAR(50) NULL"
            ))
            await db.commit()
            print(f"[OK]   Column 'roll_no' added to {SCHEMA}.student_admissions")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
