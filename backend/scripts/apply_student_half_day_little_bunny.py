"""
Migration script: Record the add_half_day_student_attendance revision in
little_bunny's alembic_version.

This migration is a no-op at the DDL level — student_attendance.status is a
plain VARCHAR(20) column (no enum/CHECK constraint), so the new "half_day"
status value fits the existing schema without any ALTER TABLE. This script
only bumps the version marker so little_bunny's migration history matches
head.

Usage:
    python scripts/apply_student_half_day_little_bunny.py
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

SCHEMA = "little_bunny"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        await db.execute(text(
            "UPDATE alembic_version SET version_num = 'c8d9e0f1a2b3' WHERE version_num = 'b7c8d9e0f1a2'"
        ))
        print("[OK] alembic_version bumped to c8d9e0f1a2b3")

        await db.commit()
        print()
        print(f"=== add_half_day_student_attendance revision recorded on {SCHEMA} (no DDL) ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
