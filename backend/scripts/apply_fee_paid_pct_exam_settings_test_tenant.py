"""
Migration script: Add hall_ticket_min_fee_paid_pct column to exam_settings in test_tenant_schema.

Usage:
    python scripts/apply_fee_paid_pct_exam_settings_test_tenant.py
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
                      AND table_name = 'exam_settings'
                      AND column_name = 'hall_ticket_min_fee_paid_pct'
                ) THEN
                    ALTER TABLE exam_settings ADD COLUMN hall_ticket_min_fee_paid_pct NUMERIC(5, 2);
                END IF;
            END $$;
        """))
        print("[OK] exam_settings.hall_ticket_min_fee_paid_pct (NUMERIC(5,2))")

        await db.commit()
        print()
        print(f"=== hall_ticket_min_fee_paid_pct column applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
