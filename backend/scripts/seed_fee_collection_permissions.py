"""
Seed public.plan_resource_access for the fee collection module resources:
  - fee_collection: [create, read, list]
  - fee_concessions: [create, read, list, update, delete]
  - fee_old: [create, read, list, update, delete]

Applies to ALL active plans in public.plans.

Usage:
    python scripts/seed_fee_collection_permissions.py
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

RESOURCES = {
    "fee_collection": ["create", "read", "list"],
    "fee_concessions": ["create", "read", "list", "update", "delete"],
    "fee_old": ["create", "read", "list", "update", "delete"],
}


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
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

            for resource_name, actions in RESOURCES.items():
                # Check if already exists
                existing = await db.execute(
                    text("""
                        SELECT id FROM public.plan_resource_access
                        WHERE plan_id = :plan_id AND resource_name = :resource
                    """),
                    {"plan_id": plan_id, "resource": resource_name},
                )
                row = existing.scalar_one_or_none()

                if row:
                    print(f"[SKIP] plan='{plan_name}' resource='{resource_name}' already exists")
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
                        "resource": resource_name,
                        "actions": actions,
                    },
                )
                print(f"[OK] plan='{plan_name}' -> {resource_name}: {actions}")
                inserted += 1

        await db.commit()
        print()
        print("=== Fee collection permissions seeded ===")
        print(f"  Inserted: {inserted}  Skipped: {skipped}")
        for r, a in RESOURCES.items():
            print(f"  {r}: {a}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
