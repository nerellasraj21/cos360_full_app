"""
Seed permissions for the issuable certificates module.

Layer 1: public.plan_resource_access (all active plans)
Layer 2: test_tenant_schema.resource_permissions (per role)

Resources:
  - issuable_certificates: create, read, list, update, delete

Role matrix:
  Admin   → all actions
  Staff   → create, read, list
  Teacher → read, list
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

RESOURCES_ALL_ACTIONS = {
    "issuable_certificates": ["create", "read", "list", "update", "delete"],
}

ROLE_PERMISSIONS = {
    "Admin": {
        "issuable_certificates": ["create", "read", "list", "update", "delete"],
    },
    "Staff": {
        "issuable_certificates": ["create", "read", "list"],
    },
    "Teacher": {
        "issuable_certificates": ["read", "list"],
    },
}


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # Layer 1: public.plan_resource_access
        print("=== Layer 1: public.plan_resource_access ===")
        await db.execute(text("SET search_path TO public"))

        result = await db.execute(
            text("SELECT id, name FROM public.plans WHERE is_active = true ORDER BY name")
        )
        plans = result.fetchall()

        if not plans:
            print("[WARN] No active plans found — skipping Layer 1")
        else:
            for resource, actions in RESOURCES_ALL_ACTIONS.items():
                for plan in plans:
                    existing = await db.execute(
                        text("""
                            SELECT id FROM public.plan_resource_access
                            WHERE plan_id = :plan_id AND resource_name = :resource
                        """),
                        {"plan_id": plan.id, "resource": resource},
                    )
                    if existing.scalar_one_or_none():
                        print(f"  [SKIP] plan='{plan.name}' resource='{resource}' already exists")
                        continue
                    await db.execute(
                        text("""
                            INSERT INTO public.plan_resource_access
                                (id, plan_id, resource_name, actions, is_active)
                            VALUES (gen_random_uuid(), :plan_id, :resource, :actions, true)
                        """),
                        {"plan_id": plan.id, "resource": resource, "actions": actions},
                    )
                    print(f"  [OK] plan='{plan.name}' -> {resource}: {actions}")

        await db.commit()

        # Layer 2: tenant resource_permissions
        print(f"\n=== Layer 2: {SCHEMA}.resource_permissions ===")
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        for role_name, resources in ROLE_PERMISSIONS.items():
            role_result = await db.execute(
                text("SELECT id FROM roles WHERE name = :name"),
                {"name": role_name},
            )
            role_row = role_result.fetchone()
            if not role_row:
                print(f"  [WARN] Role '{role_name}' not found — skipping")
                continue

            role_id = role_row.id
            inserted = skipped = 0

            for resource, actions in resources.items():
                for action in actions:
                    existing = await db.execute(
                        text("""
                            SELECT id FROM resource_permissions
                            WHERE role_id = :role_id AND resource = :resource AND action = :action
                        """),
                        {"role_id": role_id, "resource": resource, "action": action},
                    )
                    if existing.scalar_one_or_none():
                        skipped += 1
                        continue
                    await db.execute(
                        text("""
                            INSERT INTO resource_permissions
                                (id, role_id, resource, action, is_granted)
                            VALUES (gen_random_uuid(), :role_id, :resource, :action, true)
                        """),
                        {"role_id": role_id, "resource": resource, "action": action},
                    )
                    inserted += 1

            print(f"  [OK] Role '{role_name}': {inserted} inserted, {skipped} skipped")

        await db.commit()
        print("\n[DONE] Issuable certificate permissions seeded.")


if __name__ == "__main__":
    asyncio.run(run())
