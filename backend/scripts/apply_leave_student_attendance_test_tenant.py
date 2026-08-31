"""
Migration script: Record the add_leave_student_attendance revision in
test_tenant_schema's alembic_version.

test_tenant_schema's migration history is far behind this branch (it is on
an old merge point, 80f08c062489, unrelated to the recent communication /
attendance chain), so this script does not attempt to walk it through every
intermediate revision. It only applies what this specific feature needs:

student_attendance.status is a plain VARCHAR(20) column (no enum/CHECK
constraint), so the new "leave" status value fits the existing schema
without any ALTER TABLE. This script stamps the alembic_version marker
directly to this revision, matching the existing per-feature scripts already
used for test_tenant_schema (e.g. apply_student_type_test_tenant.py).

Usage:
    python scripts/apply_leave_student_attendance_test_tenant.py
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

        current = (await db.execute(text("SELECT version_num FROM alembic_version"))).scalar()
        print(f"[INFO] current alembic_version: {current}")

        await db.execute(text(
            "UPDATE alembic_version SET version_num = 'e0f1a2b3c4d5'"
        ))
        print("[OK] alembic_version set to e0f1a2b3c4d5")

        await db.commit()
        print()
        print(f"=== add_leave_student_attendance revision recorded on {SCHEMA} (no DDL) ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
