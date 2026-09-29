"""
Migration script: Add unique constraint on name to subject_grade_schemes table
in test_tenant_schema to prevent duplicate subject grade scheme names.

Usage:
    python scripts/apply_subject_grade_scheme_unique_constraint_test_tenant.py
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
            DELETE FROM subject_grade_schemes
            WHERE id NOT IN (
                SELECT MIN(id::text)::uuid
                FROM subject_grade_schemes
                GROUP BY name
            )
        """))
        print("[OK] Duplicate subject_grade_schemes removed")

        # Step 2: Add unique constraint if not already present
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'subject_grade_schemes'
                      AND constraint_name = 'uq_subject_grade_scheme_name'
                ) THEN
                    ALTER TABLE subject_grade_schemes
                        ADD CONSTRAINT uq_subject_grade_scheme_name UNIQUE (name);
                END IF;
            END $$;
        """))
        print("[OK] uq_subject_grade_scheme_name unique constraint applied to subject_grade_schemes")

        await db.commit()
        print()
        print(f"=== subject_grade_schemes unique constraint applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
