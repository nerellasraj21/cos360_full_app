"""
Migration script: Add unique constraint on name to remark_grade_sets table
in test_tenant_schema to prevent duplicate remark grade set names.

Usage:
    python scripts/apply_remark_grade_set_unique_constraint_test_tenant.py
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

        # Step 1: Remove duplicate name rows, keep the earliest row
        await db.execute(text("""
            DELETE FROM remark_grade_sets
            WHERE id NOT IN (
                SELECT MIN(id::text)::uuid
                FROM remark_grade_sets
                GROUP BY name
            )
        """))
        print("[OK] Duplicate remark_grade_sets removed")

        # Step 2: Add unique constraint if not already present
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'remark_grade_sets'
                      AND constraint_name = 'uq_remark_grade_set_name'
                ) THEN
                    ALTER TABLE remark_grade_sets
                        ADD CONSTRAINT uq_remark_grade_set_name UNIQUE (name);
                END IF;
            END $$;
        """))
        print("[OK] uq_remark_grade_set_name unique constraint applied to remark_grade_sets")

        await db.commit()
        print()
        print(f"=== remark_grade_sets unique constraint applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
