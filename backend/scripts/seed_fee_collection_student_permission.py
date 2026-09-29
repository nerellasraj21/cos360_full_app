"""
Seed fee_collection:read_own permission for the Student role
into test_tenant_schema.

What this does:
  1. Inserts resource_permission: Student -> fee_collection:read_own
     so students can access /fee/collection/my-summary (403 fix)

Usage:
    python scripts/seed_fee_collection_student_permission.py
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
ROLE_NAME = "Student"
RESOURCE = "fee_collection"
ACTION = "read_own"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # Get Student role id
        role_result = await db.execute(
            text("SELECT id FROM roles WHERE name = :name"),
            {"name": ROLE_NAME},
        )
        role_id = role_result.scalar_one_or_none()
        if not role_id:
            print(f"[ERROR] Role '{ROLE_NAME}' not found — aborting")
            return

        # Check if already exists
        existing = await db.execute(
            text("""
                SELECT id FROM resource_permissions
                WHERE role_id = :role_id AND resource = :resource AND action = :action
            """),
            {"role_id": role_id, "resource": RESOURCE, "action": ACTION},
        )
        if existing.scalar_one_or_none():
            print(f"[SKIP] resource_permissions: {ROLE_NAME} -> {RESOURCE}:{ACTION} already exists")
        else:
            await db.execute(
                text("""
                    INSERT INTO resource_permissions (id, role_id, resource, action, is_granted)
                    VALUES (gen_random_uuid(), :role_id, :resource, :action, true)
                """),
                {"role_id": role_id, "resource": RESOURCE, "action": ACTION},
            )
            print(f"[OK]   resource_permissions: {ROLE_NAME} -> {RESOURCE}:{ACTION} (is_granted=true)")

        await db.commit()
        print()
        print("=== fee_collection student permission seeded ===")
        print(f"  Schema:   {SCHEMA}")
        print(f"  Role:     {ROLE_NAME}")
        print(f"  Resource: {RESOURCE}:{ACTION}")
        print()
        print("Student can now access /fee/collection/my-summary without 403.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
