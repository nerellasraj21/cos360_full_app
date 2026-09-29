"""
Seed permissions for the subjects and subject_categories resources.

Layer 1: public.plan_resource_access
  - resource "subjects":           actions [create, read, list, update, delete]
  - resource "subject_categories": actions [create, read, list, update, delete]
  Applies to ALL active plans.

Layer 2: test_tenant_schema.resource_permissions
  - Admin:   subjects + subject_categories -> create, read, list, update, delete
  - Staff:   subjects + subject_categories -> read, list
  - Teacher: subjects + subject_categories -> read, list
  - Student: subjects                      -> read, list  (reference data)
  - Parent:  subjects                      -> read, list  (reference data)
  Note: Student/Parent already have subjects:read,list via reseed_student_parent_permissions.py
        This script is idempotent (INSERT OR SKIP) so running both is safe.

Usage:
    python scripts/seed_subjects_permissions.py
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

TENANT_SCHEMA = "test_tenant_schema"
ALL_ACTIONS = ["create", "read", "list", "update", "delete"]
READ_LIST = ["read", "list"]

# Layer 2: (role_name, resource, actions_list)
ROLE_PERMISSIONS = [
    ("Admin",   "subjects",           ALL_ACTIONS),
    ("Admin",   "subject_categories", ALL_ACTIONS),
    ("Staff",   "subjects",           READ_LIST),
    ("Staff",   "subject_categories", READ_LIST),
    ("Teacher", "subjects",           READ_LIST),
    ("Teacher", "subject_categories", READ_LIST),
    ("Student", "subjects",           READ_LIST),
    ("Parent",  "subjects",           READ_LIST),
]


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # ── Layer 1: public.plan_resource_access ─────────────────────────────
        print("=== Layer 1: public.plan_resource_access ===")
        await db.execute(text("SET search_path TO public"))

        result = await db.execute(
            text("SELECT id, name FROM public.plans WHERE is_active = true ORDER BY name")
        )
        plans = result.fetchall()

        if not plans:
            print("[WARN] No active plans found in public.plans")
            await engine.dispose()
            return

        print(f"Found {len(plans)} active plan(s): {[p.name for p in plans]}")

        for resource in ("subjects", "subject_categories"):
            inserted = skipped = 0
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
                    skipped += 1
                    continue

                await db.execute(
                    text("""
                        INSERT INTO public.plan_resource_access
                            (id, plan_id, resource_name, actions, is_active)
                        VALUES
                            (gen_random_uuid(), :plan_id, :resource, :actions, true)
                    """),
                    {"plan_id": plan.id, "resource": resource, "actions": ALL_ACTIONS},
                )
                print(f"  [OK]   plan='{plan.name}' -> {resource}: {ALL_ACTIONS}")
                inserted += 1

            await db.commit()
            print(f"  --- {resource}: inserted={inserted}, skipped={skipped} ---\n")

        # ── Layer 2: test_tenant_schema.resource_permissions ─────────────────
        print(f"=== Layer 2: {TENANT_SCHEMA}.resource_permissions ===")
        await db.execute(text(f"SET search_path TO {TENANT_SCHEMA}, public"))

        # Cache role IDs by name
        role_ids: dict[str, str] = {}
        for role_name in {r for r, _, _ in ROLE_PERMISSIONS}:
            r = await db.execute(
                text("SELECT id FROM roles WHERE name = :name"), {"name": role_name}
            )
            rid = r.scalar_one_or_none()
            if rid:
                role_ids[role_name] = str(rid)
            else:
                print(f"  [WARN] Role '{role_name}' not found in DB — skipping")

        total_inserted = total_skipped = 0

        for role_name, resource, actions in ROLE_PERMISSIONS:
            role_id = role_ids.get(role_name)
            if not role_id:
                continue

            for action in actions:
                existing = await db.execute(
                    text("""
                        SELECT id FROM resource_permissions
                        WHERE role_id = :role_id AND resource = :resource AND action = :action
                    """),
                    {"role_id": role_id, "resource": resource, "action": action},
                )
                if existing.scalar_one_or_none():
                    print(f"  [SKIP] {role_name} -> {resource}.{action} already exists")
                    total_skipped += 1
                    continue

                await db.execute(
                    text("""
                        INSERT INTO resource_permissions (id, role_id, resource, action, is_granted)
                        VALUES (gen_random_uuid(), :role_id, :resource, :action, true)
                    """),
                    {"role_id": role_id, "resource": resource, "action": action},
                )
                print(f"  [OK]   {role_name} -> {resource}.{action} = granted")
                total_inserted += 1

        await db.commit()
        print(f"\n  --- Layer 2 done: inserted={total_inserted}, skipped={total_skipped} ---")

        print("\n=== subjects + subject_categories permissions seeded ===")
        print("  subjects:           Admin(all), Staff/Teacher/Student/Parent(read,list)")
        print("  subject_categories: Admin(all), Staff/Teacher(read,list)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
