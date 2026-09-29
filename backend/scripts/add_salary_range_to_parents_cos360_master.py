"""
Migration script: Add salary_range column to parents table in cos360_master (production schema).

This column is required for storing parent/guardian salary information and is already present
in test_tenant_schema but missing from cos360_master.

Usage:
    python scripts/add_salary_range_to_parents_cos360_master.py
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

SCHEMA = "cos360_master"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # Add salary_range column to parents table if it doesn't exist
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'parents' AND column_name = 'salary_range'
                ) THEN
                    ALTER TABLE parents ADD COLUMN salary_range VARCHAR(20);
                END IF;
            END $$;
        """))
        print("[OK] salary_range column added to parents table (if it didn't exist)")

        # Add timestamps if they're missing
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'parents' AND column_name = 'created_at'
                ) THEN
                    ALTER TABLE parents ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        """))
        print("[OK] created_at column added to parents table (if it didn't exist)")

        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'parents' AND column_name = 'updated_at'
                ) THEN
                    ALTER TABLE parents ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        """))
        print("[OK] updated_at column added to parents table (if it didn't exist)")

        # Add timestamps to student_parent_links if missing
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'student_parent_links' AND column_name = 'created_at'
                ) THEN
                    ALTER TABLE student_parent_links ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        """))
        print("[OK] created_at column added to student_parent_links (if it didn't exist)")

        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'student_parent_links' AND column_name = 'updated_at'
                ) THEN
                    ALTER TABLE student_parent_links ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        """))
        print("[OK] updated_at column added to student_parent_links (if it didn't exist)")

        await db.commit()
        print("\n[SUCCESS] cos360_master parents tables schema synchronized with test_tenant_schema")


if __name__ == "__main__":
    asyncio.run(run())
