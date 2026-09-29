"""
Migration script: Apply pending migrations up to add_leave_student_attendance
on cos360_master.

cos360_master was at c8d9e0f1a2b3 (add_half_day_student_attendance), one
revision behind head on this branch. This script catches it up:

1. make_notification_queue_template_optional (d9e0f1a2b3c4)
   DDL: ALTER TABLE notification_queue ALTER COLUMN template_id DROP NOT NULL
   (idempotent — re-running is safe, DROP NOT NULL on an already-nullable
   column is a no-op).

2. add_leave_student_attendance (e0f1a2b3c4d5)
   No DDL — student_attendance.status is a plain VARCHAR(20) column with no
   enum/CHECK constraint, so the new "leave" value fits the existing schema
   without any ALTER TABLE.

Usage:
    python scripts/apply_leave_student_attendance_cos360_master.py
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

        current = (await db.execute(text("SELECT version_num FROM alembic_version"))).scalar()
        print(f"[INFO] current alembic_version: {current}")

        if current == "c8d9e0f1a2b3":
            await db.execute(text(
                "ALTER TABLE notification_queue ALTER COLUMN template_id DROP NOT NULL"
            ))
            print("[OK] notification_queue.template_id set nullable")

            await db.execute(text(
                "UPDATE alembic_version SET version_num = 'd9e0f1a2b3c4' WHERE version_num = 'c8d9e0f1a2b3'"
            ))
            print("[OK] alembic_version bumped to d9e0f1a2b3c4")
            current = "d9e0f1a2b3c4"

        if current == "d9e0f1a2b3c4":
            await db.execute(text(
                "UPDATE alembic_version SET version_num = 'e0f1a2b3c4d5' WHERE version_num = 'd9e0f1a2b3c4'"
            ))
            print("[OK] alembic_version bumped to e0f1a2b3c4d5")
        else:
            print(f"[SKIP] unexpected starting version {current!r} — not touching alembic_version further")

        await db.commit()
        print()
        print(f"=== add_leave_student_attendance revision recorded on {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
