"""
Migration script: Record the multi_target_communication_types revision in
little_bunny's alembic_version.

This migration is a no-op at the DDL level — notification_queue.target_type /
notification_log.target_type are plain VARCHAR(50) columns and target_ref is
JSON, so the new "multiple_parents" / "multiple_students" / "multiple_staff"
target_type values (and their list-shaped target_ref) fit the existing schema
without any ALTER TABLE. This script only bumps the version marker so
little_bunny's migration history matches head.

Usage:
    python scripts/apply_communication_multi_target_little_bunny.py
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
            "UPDATE alembic_version SET version_num = 'b7c8d9e0f1a2' WHERE version_num = 'f6a7b8c9d0e1'"
        ))
        print("[OK] alembic_version bumped to b7c8d9e0f1a2")

        await db.commit()
        print()
        print(f"=== multi_target_communication_types revision recorded on {SCHEMA} (no DDL) ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
