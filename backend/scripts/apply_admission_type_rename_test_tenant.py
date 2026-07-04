"""
Migration script: Fix ck_admission_type constraint and backfill legacy
admission_type values in test_tenant_schema.

admission_type was renamed from primary/non_primary to pre_primary/regular.
This script updates the check constraint and relabels existing rows to match.

Usage:
    python scripts/apply_admission_type_rename_test_tenant.py
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

        await db.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'ck_admission_type'
                ) THEN
                    ALTER TABLE student_admissions DROP CONSTRAINT ck_admission_type;
                END IF;

                UPDATE student_admissions SET admission_type = 'pre_primary' WHERE admission_type = 'primary';
                UPDATE student_admissions SET admission_type = 'regular' WHERE admission_type = 'non_primary';

                ALTER TABLE student_admissions
                    ADD CONSTRAINT ck_admission_type CHECK (admission_type IN ('pre_primary', 'regular'));
            END $$;
        """))
        print("[OK] ck_admission_type constraint updated + legacy rows relabeled")

        await db.commit()
        print()
        print(f"=== admission_type rename applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
