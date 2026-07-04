"""
Seed Fee Management sub-menus + role_menu_permissions into schemas that are
missing them, copying the exact structure that already exists in cos360_main.

What this does, per schema:
  1. Finds the existing "Fee Management" parent menu (L0)
  2. Inserts the 9 sub-menus (Fee Categories, Fee Types, Fee Terms,
     Fee Class Mappings, Fee Student Mappings, Fee Term Amounts,
     Fee Collection, Fee Receipts, Fee Refunds) if missing
  3. Grants Admin role can_view=True, can_edit=True via role_menu_permissions
     (matches cos360_main, which is Admin-only for these sub-menus)

Usage:
    python scripts/seed_fee_management_menu.py
"""

import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.config import settings

SCHEMAS = ["cos360_master", "test_tenant_schema"]
PARENT_NAME = "Fee Management"
ALLOWED_ROLES = ["Admin"]

# (name, url, display_order) — same names/order as cos360_main, singular "/fee" prefix
SUB_MENUS = [
    ("Fee Categories",       "/fee/categories",       26),
    ("Fee Types",            "/fee/types",            27),
    ("Fee Terms",            "/fee/terms",            28),
    ("Fee Class Mappings",   "/fee/class-mappings",   29),
    ("Fee Student Mappings", "/fee/student-mappings", 30),
    ("Fee Term Amounts",     "/fee/term-amounts",     31),
    ("Fee Collection",       "/fee/transactions",     32),
    ("Fee Receipts",         "/fee/receipts",         33),
    ("Fee Refunds",          "/fee/refunds",          34),
]


async def ensure_menu(db, name, url, level, parent_id, order):
    result = await db.execute(
        text("SELECT id FROM menus WHERE name = :name AND url = :url"),
        {"name": name, "url": url},
    )
    row = result.scalar_one_or_none()
    if row:
        print(f"  [SKIP] Menu '{name}' already exists (id={row})")
        return row
    new_id = uuid.uuid4()
    await db.execute(
        text("""
            INSERT INTO menus (id, name, url, level, parent_id, display_order)
            VALUES (:id, :name, :url, :level, :parent_id, :order)
        """),
        {"id": new_id, "name": name, "url": url, "level": level,
         "parent_id": parent_id, "order": order},
    )
    print(f"  [OK]   Menu '{name}' inserted (id={new_id})")
    return new_id


async def grant_menu_permission(db, role_id, role_name, menu_id, menu_name):
    result = await db.execute(
        text("SELECT id FROM role_menu_permissions WHERE role_id = :r AND menu_id = :m"),
        {"r": role_id, "m": menu_id},
    )
    if result.scalar_one_or_none():
        print(f"  [SKIP] role_menu_permissions: {role_name} -> {menu_name} already exists")
        return
    await db.execute(
        text("""
            INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view, can_edit)
            VALUES (gen_random_uuid(), :role_id, :menu_id, true, true)
        """),
        {"role_id": role_id, "menu_id": menu_id},
    )
    print(f"  [OK]   role_menu_permissions: {role_name} -> {menu_name} (can_view=true, can_edit=true)")


async def seed_schema(db, schema):
    print(f"\n=== Schema: {schema} ===")
    await db.execute(text(f"SET search_path TO {schema}, public"))

    parent = await db.execute(
        text("SELECT id FROM menus WHERE name = :name AND parent_id IS NULL"),
        {"name": PARENT_NAME},
    )
    parent_id = parent.scalar_one_or_none()
    if not parent_id:
        print(f"  [SKIP] '{PARENT_NAME}' parent menu not found in {schema}")
        return

    sub_ids = []
    for (name, url, order) in SUB_MENUS:
        sub_id = await ensure_menu(db, name, url, "L1", parent_id, order)
        sub_ids.append((name, sub_id))

    for role_name in ALLOWED_ROLES:
        role_result = await db.execute(text("SELECT id FROM roles WHERE name = :name"), {"name": role_name})
        role_id = role_result.scalar_one_or_none()
        if not role_id:
            print(f"  [WARN] Role '{role_name}' not found in {schema} — skipping")
            continue
        for (menu_name, menu_id) in sub_ids:
            await grant_menu_permission(db, role_id, role_name, menu_id, menu_name)


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        for schema in SCHEMAS:
            await seed_schema(db, schema)
        await db.commit()
        print("\n=== Done. Re-login to see Fee Management sub-menus in the sidebar. ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
