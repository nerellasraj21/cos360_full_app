"""
Migration script: Apply make_notification_queue_template_optional to
little_bunny and record the revision in its alembic_version.

DDL: ALTER TABLE notification_queue ALTER COLUMN template_id DROP NOT NULL
(idempotent — re-running is safe, DROP NOT NULL on an already-nullable
column is a no-op).

Usage:
    python scripts/apply_communication_optional_whatsapp_template_little_bunny.py
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
            "ALTER TABLE notification_queue ALTER COLUMN template_id DROP NOT NULL"
        ))
        print("[OK] notification_queue.template_id is now nullable")

        await db.execute(text(
            "UPDATE alembic_version SET version_num = 'd9e0f1a2b3c4' WHERE version_num = 'c8d9e0f1a2b3'"
        ))
        print("[OK] alembic_version bumped to d9e0f1a2b3c4")

        await db.commit()
        print()
        print(f"=== make_notification_queue_template_optional applied on {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
