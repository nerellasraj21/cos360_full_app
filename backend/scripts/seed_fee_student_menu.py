"""
Seed Fee parent menu + student-facing sub-menus + role_menu_permissions
into test_tenant_schema.

What this does:
  1. Inserts "Fee" parent menu (L0, url=/fee, display_order=85) into menus
     — placed before Exam Management (~90)
  2. Inserts sub-menus: My Fees, My Receipts (L1)
  3. Grants Student role can_view=True via role_menu_permissions
     for the parent and all sub-menus

Usage:
    python scripts/seed_fee_student_menu.py
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
ALLOWED_ROLES = ["Student"]

# Parent menu
PARENT_NAME = "Fee"
PARENT_URL = "/fee"
PARENT_LEVEL = "L0"
PARENT_ORDER = 85  # Before Exam Management (~90)

# Sub-menus (name, url, order)
SUB_MENUS = [
    ("My Fees",     "/fee/my-fees",     1),
    ("My Receipts", "/fee/my-receipts", 2),
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
        print(f"[SKIP] role_menu_permissions: {role_name} -> {menu_name} already exists")
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
        print("=== Fee student menu seeded ===")
        print(f"  Schema: {SCHEMA}")
        print(f"  Parent: {PARENT_NAME} -> {PARENT_URL} (L0, order={PARENT_ORDER})")
        print(f"  Subs:   {[n for n, _ in sub_ids]}")
        print(f"  Roles:  {ALLOWED_ROLES}")
        print()
        print("Re-login to see the Fee menu in the sidebar.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
