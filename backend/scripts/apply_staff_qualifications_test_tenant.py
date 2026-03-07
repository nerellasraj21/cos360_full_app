"""
Migration script: Apply staff_qualifications table to test_tenant_schema.

Creates:
  - qualificationlevelenum type (Below Graduation, Graduation, Post Graduation, PhD)
  - staff_qualifications table with staff_id FK -> staff.id

Usage:
    python scripts/apply_staff_qualifications_test_tenant.py
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

        # 1. Create enum type if not exists (inline schema — asyncpg can't bind params in DO blocks)
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qualificationlevelenum'
                               AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = '{SCHEMA}')) THEN
                    CREATE TYPE qualificationlevelenum AS ENUM (
                        'Below Graduation',
                        'Graduation',
                        'Post Graduation',
                        'PhD'
                    );
                END IF;
            END
            $$;
        """))
        print(f"[OK] qualificationlevelenum type ready in {SCHEMA}")

        # 2. Create staff_qualifications table if not exists
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS staff_qualifications (
                id          UUID PRIMARY KEY,
                staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
                level       qualificationlevelenum NOT NULL,
                name        VARCHAR(200) NOT NULL,
                passed_out_year INTEGER,
                percentage  NUMERIC(5, 2),
                university  VARCHAR(255)
            );
        """))
        print(f"[OK] staff_qualifications table ready in {SCHEMA}")

        # 3. Create indexes if not exist
        await db.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_staff_qualifications_id
                ON staff_qualifications (id);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_staff_qualifications_staff_id
                ON staff_qualifications (staff_id);
        """))
        print("[OK] Indexes ready")

        await db.commit()
        print()
        print(f"=== staff_qualifications migration applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
