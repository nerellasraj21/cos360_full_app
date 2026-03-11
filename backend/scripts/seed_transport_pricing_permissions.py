"""
Seed public.plan_resource_access for the "transport_pricing" resource.

Actions seeded: create, read, list, update, delete
Applies to ALL active plans in public.plans.

Usage:
    python scripts/seed_transport_pricing_permissions.py
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

RESOURCE_NAME = "transport_pricing"
ACTIONS = ["create", "read", "list", "update", "delete"]


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # Work in public schema
        await db.execute(text("SET search_path TO public"))

        # Get all active plans
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
            plan_id = plan.id
            plan_name = plan.name

            # Check if already exists
            existing = await db.execute(
                text("""
                    SELECT id FROM public.plan_resource_access
                    WHERE plan_id = :plan_id AND resource_name = :resource
                """),
                {"plan_id": plan_id, "resource": RESOURCE_NAME},
            )
            row = existing.scalar_one_or_none()

            if row:
                print(f"[SKIP] plan='{plan_name}' resource='{RESOURCE_NAME}' already exists")
                skipped += 1
                continue

            await db.execute(
                text("""
                    INSERT INTO public.plan_resource_access
                        (id, plan_id, resource_name, actions, is_active)
                    VALUES
                        (gen_random_uuid(), :plan_id, :resource, :actions, true)
                """),
                {
                    "plan_id": plan_id,
                    "resource": RESOURCE_NAME,
                    "actions": ACTIONS,
                },
            )
            print(f"[OK] plan='{plan_name}' -> {RESOURCE_NAME}: {ACTIONS}")
            inserted += 1

        await db.commit()
        print()
        print(f"=== Transport pricing permissions seeded ===")
        print(f"  Inserted: {inserted}  Skipped: {skipped}")
        print(f"  Resource: {RESOURCE_NAME}")
        print(f"  Actions:  {ACTIONS}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
