"""
Migration script: Add work experience, bank details, salary & PF columns to staff table
in test_tenant_schema.

Usage:
    python scripts/apply_staff_extra_columns_test_tenant.py
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

NEW_COLUMNS = [
    # (column_name, column_definition)
    # Work Experience
    ("work_org",        "VARCHAR(255)"),
    ("work_from_date",  "DATE"),
    ("work_to_date",    "DATE"),
    ("subjects_dealt",  "TEXT"),
    ("work_remarks",    "TEXT"),
    # Bank Details
    ("bank_name",           "VARCHAR(200)"),
    ("bank_branch",         "VARCHAR(200)"),
    ("account_number",      "VARCHAR(50)"),
    ("ifsc_code",           "VARCHAR(20)"),
    ("account_holder_name", "VARCHAR(200)"),
    ("account_type",        "VARCHAR(20)"),
    # Salary & PF
    ("last_drawn_salary",  "NUMERIC(10,2)"),
    ("pf_account_number",  "VARCHAR(50)"),
    ("uan_number",         "VARCHAR(20)"),
]


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        for col_name, col_def in NEW_COLUMNS:
            await db.execute(text(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = '{SCHEMA}'
                          AND table_name = 'staff'
                          AND column_name = '{col_name}'
                    ) THEN
                        ALTER TABLE staff ADD COLUMN {col_name} {col_def};
                    END IF;
                END $$;
            """))
            print(f"[OK] staff.{col_name} ({col_def})")

        await db.commit()
        print()
        print(f"=== staff extra columns applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
