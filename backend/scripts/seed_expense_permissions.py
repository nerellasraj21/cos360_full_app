"""
Seed BOTH permission layers for the expense module:

Layer 1: public.plan_resource_access (all active plans)
Layer 2: test_tenant_schema.resource_permissions (per role)

Resources:
  - expense_categories:   create, read, list, update, delete
  - expense_departments:  create, read, list, update, delete
  - expense_types:        create, read, list, update, delete
  - expense_transactions: create, read, list, update, delete, approve
  - expense_reports:      read, list, export

Role matrix (Layer 2):
  Admin  → all actions for all resources
  Staff  → create/read/list/update for categories, types, transactions; read for reports
  Teacher → read/list for categories, types, transactions, reports

Usage:
    python scripts/seed_expense_permissions.py
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
    "expense_categories": ["create", "read", "list", "update", "delete"],
    "expense_departments": ["create", "read", "list", "update", "delete"],
    "expense_types": ["create", "read", "list", "update", "delete"],
    "expense_transactions": ["create", "read", "list", "update", "delete", "approve"],
    "expense_reports": ["read", "list", "export"],
}

# Layer 2: role → resource → actions
ROLE_PERMISSIONS = {
    "Admin": {
        "expense_categories": ["create", "read", "list", "update", "delete"],
        "expense_departments": ["create", "read", "list", "update", "delete"],
        "expense_types": ["create", "read", "list", "update", "delete"],
        "expense_transactions": ["create", "read", "list", "update", "delete", "approve"],
        "expense_reports": ["read", "list", "export"],
    },
    "Staff": {
        "expense_categories": ["create", "read", "list", "update"],
        "expense_departments": ["read", "list"],
        "expense_types": ["create", "read", "list", "update"],
        "expense_transactions": ["create", "read", "list", "update"],
        "expense_reports": ["read", "list"],
    },
    "Teacher": {
        "expense_categories": ["read", "list"],
        "expense_departments": ["read", "list"],
        "expense_types": ["read", "list"],
        "expense_transactions": ["read", "list"],
        "expense_reports": ["read"],
    },
}


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # ── Layer 1: public.plan_resource_access ──────────────────────────────
        print("=== Layer 1: public.plan_resource_access ===")
        await db.execute(text("SET search_path TO public"))

        result = await db.execute(
            text("SELECT id, name FROM public.plans WHERE is_active = true ORDER BY name")
        )
        plans = result.fetchall()

        if not plans:
            print("[WARN] No active plans found — skipping Layer 1")
        else:
            print(f"Found {len(plans)} active plan(s): {[p.name for p in plans]}")
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
                            VALUES
                                (gen_random_uuid(), :plan_id, :resource, :actions, true)
                        """),
                        {"plan_id": plan.id, "resource": resource, "actions": actions},
                    )
                    print(f"  [OK]   plan='{plan.name}' -> {resource}: {actions}")

        await db.commit()

        # ── Layer 2: tenant resource_permissions ──────────────────────────────
        print(f"\n=== Layer 2: {SCHEMA}.resource_permissions ===")
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        for role_name, resources in ROLE_PERMISSIONS.items():
            # Get role id
            role_result = await db.execute(
                text("SELECT id FROM roles WHERE name = :name"),
                {"name": role_name},
            )
            role_row = role_result.fetchone()
            if not role_row:
                print(f"  [WARN] Role '{role_name}' not found — skipping")
                continue

            role_id = role_row.id
            role_inserted = 0
            role_skipped = 0

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
                        role_skipped += 1
                        continue

                    await db.execute(
                        text("""
                            INSERT INTO resource_permissions
                                (id, role_id, resource, action, is_granted)
                            VALUES
                                (gen_random_uuid(), :role_id, :resource, :action, true)
                        """),
                        {"role_id": role_id, "resource": resource, "action": action},
                    )
                    role_inserted += 1

            print(f"  [OK] Role '{role_name}': {role_inserted} inserted, {role_skipped} skipped")

        await db.commit()
        print("\n[DONE] Expense permissions seeded successfully.")


if __name__ == "__main__":
    asyncio.run(run())
