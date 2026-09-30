"""
Seed Expense menu item + sub-menus + role_menu_permissions into test_tenant_schema.

What this does:
  1. Inserts "Expense" parent menu (L0, url=/expense) into menus
  2. Inserts sub-menus: Overview, Categories, Types, Transactions,
     Pending Approvals, Summary, Audit Trail, Settings (L1)
  3. Grants Admin and Staff roles can_view=True via role_menu_permissions
     for the parent and all sub-menus

Usage:
    python scripts/seed_expense_menu_test_tenant.py
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

SCHEMA = "test_tenant_schema"
ALLOWED_ROLES = ["Admin", "Staff"]

# Parent menu
PARENT_NAME = "Expense"
PARENT_URL = "/expense"
PARENT_LEVEL = "L0"
PARENT_ORDER = 100  # After Communication (95)

# Sub-menus (name, url, order)
SUB_MENUS = [
    ("Overview",          "/expense",              1),
    ("Categories",        "/expense/categories",   2),
    ("Types",             "/expense/types",        3),
    ("Transactions",      "/expense/transactions", 4),
    ("Pending Approvals", "/expense/approvals",    5),
    ("Summary",           "/expense/summary",      6),
    ("Audit Trail",       "/expense/audit",        7),
    ("Settings",          "/expense/settings",     8),
    ("Departments",       "/expense/departments",  9),
]


async def ensure_menu(db, name, url, level, parent_id, order):
    result = await db.execute(
        text("SELECT id FROM menus WHERE name = :name AND url = :url"),
        {"name": name, "url": url},
    )
    row = result.scalar_one_or_none()
    if row:
        print(f"[SKIP] Menu '{name}' already exists (id={row})")
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
    print(f"[OK]   Menu '{name}' inserted (id={new_id})")
    return new_id


async def grant_menu_permission(db, role_id, role_name, menu_id, menu_name):
    result = await db.execute(
        text("SELECT id FROM role_menu_permissions WHERE role_id = :r AND menu_id = :m"),
        {"r": role_id, "m": menu_id},
    )
    if result.scalar_one_or_none():
        print(f"[SKIP] role_menu_permissions: {role_name} -> {menu_name}")
        return
    await db.execute(
        text("""
            INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view)
            VALUES (gen_random_uuid(), :role_id, :menu_id, true)
        """),
        {"role_id": role_id, "menu_id": menu_id},
    )
    print(f"[OK]   role_menu_permissions: {role_name} -> {menu_name} (can_view=true)")


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # 1. Parent menu
        parent_id = await ensure_menu(db, PARENT_NAME, PARENT_URL, PARENT_LEVEL, None, PARENT_ORDER)

        # 2. Sub-menus
        sub_ids = []
        for (name, url, order) in SUB_MENUS:
            sub_id = await ensure_menu(db, name, url, "L1", parent_id, order)
            sub_ids.append((name, sub_id))

        # 3. Role menu permissions
        all_menu_entries = [(PARENT_NAME, parent_id)] + sub_ids

        for role_name in ALLOWED_ROLES:
            role_result = await db.execute(
                text("SELECT id FROM roles WHERE name = :name"),
                {"name": role_name},
            )
            role_id = role_result.scalar_one_or_none()
            if not role_id:
                print(f"[WARN] Role '{role_name}' not found — skipping")
                continue
            for (menu_name, menu_id) in all_menu_entries:
                await grant_menu_permission(db, role_id, role_name, menu_id, menu_name)

        await db.commit()
        print()
        print("=== Expense menu seeded ===")
        print(f"  Schema: {SCHEMA}")
        print(f"  Parent: {PARENT_NAME} -> {PARENT_URL} (L0, order={PARENT_ORDER})")
        print(f"  Subs:   {[n for n, _ in sub_ids]}")
        print(f"  Roles:  {ALLOWED_ROLES}")
        print()
        print("Re-login to see the Expense menu in the sidebar.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
