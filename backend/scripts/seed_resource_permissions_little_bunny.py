"""
Seed little_bunny.resource_permissions from test_tenant_schema (known-good,
752 rows) — cos360_master's copy of this table is empty so it isn't usable
as a source. role_id is translated by role name, since little_bunny's 5
pre-existing roles (Admin/Staff/Teacher/Student/Parent) kept their own ids
while test_tenant_schema/cos360_master share the same ids for those roles.

Insert-only: skips any (role_id, resource, action) combo little_bunny
already has (e.g. its 2 existing school_settings rows are left untouched).

Usage:
    python scripts/seed_resource_permissions_little_bunny.py
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

SOURCE = "test_tenant_schema"
TARGET = "little_bunny"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # Build role name -> id map for both schemas
        await db.execute(text(f"SET search_path TO {SOURCE}, public"))
        source_roles = (await db.execute(text("SELECT id, name FROM roles"))).fetchall()

        await db.execute(text(f"SET search_path TO {TARGET}, public"))
        target_roles_by_name = {
            r.name: r.id for r in (await db.execute(text("SELECT id, name FROM roles"))).fetchall()
        }

        role_id_map = {}
        for r in source_roles:
            target_id = target_roles_by_name.get(r.name)
            if target_id:
                role_id_map[r.id] = target_id

        # Existing (role_id, resource, action) combos in little_bunny — skip these
        existing = {
            (row.role_id, row.resource, row.action)
            for row in (await db.execute(text(
                "SELECT role_id, resource, action FROM resource_permissions"
            ))).fetchall()
        }

        # Pull all resource_permissions from source
        await db.execute(text(f"SET search_path TO {SOURCE}, public"))
        perms = (await db.execute(text(
            "SELECT role_id, resource, action, is_granted FROM resource_permissions"
        ))).fetchall()

        await db.execute(text(f"SET search_path TO {TARGET}, public"))

        inserted = 0
        skipped_unmapped_role = 0
        skipped_existing = 0
        for p in perms:
            target_role_id = role_id_map.get(p.role_id)
            if target_role_id is None:
                skipped_unmapped_role += 1
                continue
            key = (target_role_id, p.resource, p.action)
            if key in existing:
                skipped_existing += 1
                continue
            await db.execute(text(
                "INSERT INTO resource_permissions (id, role_id, resource, action, is_granted) "
                "VALUES (gen_random_uuid(), :role_id, :resource, :action, :is_granted)"
            ), {"role_id": target_role_id, "resource": p.resource, "action": p.action,
                "is_granted": p.is_granted})
            existing.add(key)
            inserted += 1

        print(f"[OK] resource_permissions inserted: {inserted}")
        print(f"  skipped (role not found in {TARGET}): {skipped_unmapped_role}")
        print(f"  skipped (already present): {skipped_existing}")

        await db.commit()
        print(f"\n=== Done seeding resource_permissions for {TARGET} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
