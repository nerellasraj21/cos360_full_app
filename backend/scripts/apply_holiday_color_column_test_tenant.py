"""
Migration script: Add color column to holidays table in test_tenant_schema.

Usage:
    python scripts/apply_holiday_color_column_test_tenant.py
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
            ALTER TABLE holidays
            ADD COLUMN IF NOT EXISTS color VARCHAR(7) NULL;
        """))

        await db.commit()
        print("Done: color column added to holidays table in test_tenant_schema.")


if __name__ == "__main__":
    asyncio.run(run())
