"""
Apply student_type column to test_tenant_schema.students table.
Mirrors migration t8u9v0w1x2y3 already applied to cos360_master.
No Alembic needed — data-definition only, no schema structure change beyond the column.

Usage:
    python scripts/apply_student_type_test_tenant.py
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

        # Check if column already exists
        result = await db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = :schema AND table_name = 'students' AND column_name = 'student_type'
        """), {"schema": SCHEMA})

        if result.scalar_one_or_none():
            print(f"[SKIP] Column 'student_type' already exists in {SCHEMA}.students")
        else:
            await db.execute(text(
                "ALTER TABLE students ADD COLUMN student_type VARCHAR(20) NULL"
            ))
            await db.commit()
            print(f"[OK]   Column 'student_type' added to {SCHEMA}.students")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
