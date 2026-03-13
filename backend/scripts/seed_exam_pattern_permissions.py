"""
Seed permissions for the exam patterns module:

Layer 1: public.plan_resource_access for resource "exam_patterns"
         actions: [create, read, list, update, delete]
         Applies to ALL active plans.

Layer 2: test_tenant_schema.resource_permissions for Admin role
         All 5 actions with is_granted=true.

Usage:
    python scripts/seed_exam_pattern_permissions.py
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

RESOURCE = "exam_patterns"
ACTIONS = ["create", "read", "list", "update", "delete"]
ADMIN_ROLE_ID = "2fe97570-0740-44c5-911f-9826e0258a9b"
TENANT_SCHEMA = "test_tenant_schema"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # ── Layer 1: public.plan_resource_access ─────────────────────────────
        await db.execute(text("SET search_path TO public"))

        result = await db.execute(
            text("SELECT id, name FROM public.plans WHERE is_active = true ORDER BY name")
        )
        plans = result.fetchall()

        if not plans:
            print("[WARN] No active plans found in public.plans")
            return

        print(f"Found {len(plans)} active plan(s): {[p.name for p in plans]}")

        inserted = 0
        skipped = 0

        for plan in plans:
            existing = await db.execute(
                text("""
                    SELECT id FROM public.plan_resource_access
                    WHERE plan_id = :plan_id AND resource_name = :resource
                """),
                {"plan_id": plan.id, "resource": RESOURCE},
            )
            if existing.scalar_one_or_none():
                print(f"[SKIP] plan='{plan.name}' resource='{RESOURCE}' already exists")
                skipped += 1
                continue

            await db.execute(
                text("""
                    INSERT INTO public.plan_resource_access
                        (id, plan_id, resource_name, actions, is_active)
                    VALUES
                        (gen_random_uuid(), :plan_id, :resource, :actions, true)
                """),
                {"plan_id": plan.id, "resource": RESOURCE, "actions": ACTIONS},
            )
            print(f"[OK] plan='{plan.name}' -> {RESOURCE}: {ACTIONS}")
            inserted += 1

        await db.commit()
        print(f"\n--- Layer 1 done: inserted={inserted}, skipped={skipped} ---")

        # ── Layer 2: test_tenant_schema.resource_permissions ─────────────────
        await db.execute(text(f"SET search_path TO {TENANT_SCHEMA}, public"))

        rp_inserted = 0
        rp_skipped = 0

        for action in ACTIONS:
            existing = await db.execute(
                text("""
                    SELECT id FROM resource_permissions
                    WHERE role_id = :role_id AND resource = :resource AND action = :action
                """),
                {"role_id": ADMIN_ROLE_ID, "resource": RESOURCE, "action": action},
            )
            if existing.scalar_one_or_none():
                print(f"[SKIP] Admin {RESOURCE}.{action} already exists")
                rp_skipped += 1
                continue

            await db.execute(
                text("""
                    INSERT INTO resource_permissions (id, role_id, resource, action, is_granted)
                    VALUES (gen_random_uuid(), :role_id, :resource, :action, true)
                """),
                {"role_id": ADMIN_ROLE_ID, "resource": RESOURCE, "action": action},
            )
            print(f"[OK] Admin -> {RESOURCE}.{action} = granted")
            rp_inserted += 1

        await db.commit()
        print(f"\n--- Layer 2 done: inserted={rp_inserted}, skipped={rp_skipped} ---")
        print(f"\n=== Exam pattern permissions seeded ===")
        print(f"  Resource: {RESOURCE}")
        print(f"  Actions: {ACTIONS}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
