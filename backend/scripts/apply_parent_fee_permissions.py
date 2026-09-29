"""
Grant the Parent role read_related access to fee data, across all live tenant schemas.

Why:
  The Parent role had ZERO resource_permissions rows for fee_transactions,
  fee_collection, or fee_receipts in every tenant (confirmed by direct query
  against little_bunny, cos360_master, and test_tenant_schema). Every
  parent-facing fee endpoint (/fee/transactions/my-children-fees,
  /fee/collection/child-summary, /fee/collection/child-history, receipt
  download) requires one of these, so parents got 403 on all of them.

This is purely ADDITIVE — it only inserts the 3 missing rows per schema via
ON CONFLICT DO NOTHING (unique_role_resource_action), so it can't disturb any
other permission a tenant may already have.

Run from the project root:
    python scripts/apply_parent_fee_permissions.py
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

SCHEMAS = ["little_bunny", "cos360_master", "test_tenant_schema"]

PARENT_FEE_PERMISSIONS = [
    ("fee_transactions", "read_related"),
    ("fee_collection", "read_related"),
    ("fee_receipts", "read_related"),
]


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        for schema in SCHEMAS:
            print(f"\n=== Schema '{schema}' ===")
            await db.execute(text(f'SET search_path TO "{schema}", public'))

            r = await db.execute(text("SELECT id FROM roles WHERE name = 'Parent'"))
            role_id = r.scalar_one_or_none()
            if not role_id:
                print("  [SKIP] No 'Parent' role in this schema")
                continue

            for resource, action in PARENT_FEE_PERMISSIONS:
                existing = await db.execute(
                    text("""
                        SELECT id FROM resource_permissions
                        WHERE role_id = :role_id AND resource = :res AND action = :act
                    """),
                    {"role_id": role_id, "res": resource, "act": action},
                )
                if existing.first():
                    print(f"  [SKIP] {resource}:{action} already present")
                    continue

                await db.execute(
                    text("""
                        INSERT INTO resource_permissions (id, role_id, resource, action, is_granted)
                        VALUES (gen_random_uuid(), :role_id, :res, :act, true)
                    """),
                    {"role_id": role_id, "res": resource, "act": action},
                )
                print(f"  [OK] granted {resource}:{action}")

            await db.commit()

    await engine.dispose()
    print("\n=== Done ===")


if __name__ == "__main__":
    asyncio.run(run())
