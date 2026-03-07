"""
Seed Communication menu item + role_menu_permissions + resource_permissions
into test_tenant_schema.

What this does:
  1. Inserts a "Communication" menu item (L0, url=/communication) into test_tenant_schema.menus
  2. Grants Admin (and Staff) roles can_view=True via role_menu_permissions
  3. Inserts communications:create/read/update/list into resource_permissions for Admin/Staff

Usage:
    python scripts/seed_communication_menu_test_tenant.py
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
MENU_NAME = "Communication"
MENU_URL = "/communication"
MENU_LEVEL = "L0"
# Place after Exam Management (display_order ~90) — adjust if needed
MENU_DISPLAY_ORDER = 95

# Roles that should see Communication in the sidebar
ALLOWED_ROLES = ["Admin", "Staff"]
# Actions to seed for each role
ACTIONS = ["create", "read", "update", "list"]


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # ── 1. Check / insert menu item ─────────────────────────────────────
        existing_menu = await db.execute(
            text("SELECT id FROM menus WHERE name = :name AND url = :url"),
            {"name": MENU_NAME, "url": MENU_URL},
        )
        menu_row = existing_menu.scalar_one_or_none()

        if menu_row:
            menu_id = menu_row
            print(f"[SKIP] Menu '{MENU_NAME}' already exists (id={menu_id})")
        else:
            menu_id = uuid.uuid4()
            await db.execute(
                text("""
                    INSERT INTO menus (id, name, url, level, parent_id, display_order)
                    VALUES (:id, :name, :url, :level, NULL, :order)
                """),
                {
                    "id": menu_id,
                    "name": MENU_NAME,
                    "url": MENU_URL,
                    "level": MENU_LEVEL,
                    "order": MENU_DISPLAY_ORDER,
                },
            )
            print(f"[OK]   Menu '{MENU_NAME}' inserted (id={menu_id})")

        # ── 2. Grant role_menu_permissions for each role ────────────────────
        for role_name in ALLOWED_ROLES:
            role_result = await db.execute(
                text("SELECT id FROM roles WHERE name = :name"),
                {"name": role_name},
            )
            role_id = role_result.scalar_one_or_none()
            if not role_id:
                print(f"[WARN] Role '{role_name}' not found — skipping")
                continue

            existing_perm = await db.execute(
                text("""
                    SELECT id FROM role_menu_permissions
                    WHERE role_id = :role_id AND menu_id = :menu_id
                """),
                {"role_id": role_id, "menu_id": menu_id},
            )
            if existing_perm.scalar_one_or_none():
                print(f"[SKIP] role_menu_permissions: {role_name} -> {MENU_NAME} already exists")
            else:
                await db.execute(
                    text("""
                        INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view)
                        VALUES (gen_random_uuid(), :role_id, :menu_id, true)
                    """),
                    {"role_id": role_id, "menu_id": menu_id},
                )
                print(f"[OK]   role_menu_permissions: {role_name} -> {MENU_NAME} (can_view=true)")

        # ── 3. Seed resource_permissions (communications CRUD) ──────────────
        for role_name in ALLOWED_ROLES:
            role_result = await db.execute(
                text("SELECT id FROM roles WHERE name = :name"),
                {"name": role_name},
            )
            role_id = role_result.scalar_one_or_none()
            if not role_id:
                continue

            for action in ACTIONS:
                existing_rp = await db.execute(
                    text("""
                        SELECT id FROM resource_permissions
                        WHERE role_id = :role_id
                          AND resource = 'communications'
                          AND action = :action
                    """),
                    {"role_id": role_id, "action": action},
                )
                if existing_rp.scalar_one_or_none():
                    print(f"[SKIP] resource_permissions: {role_name} communications:{action} exists")
                else:
                    await db.execute(
                        text("""
                            INSERT INTO resource_permissions
                                (id, role_id, resource, action, is_granted)
                            VALUES
                                (gen_random_uuid(), :role_id, 'communications', :action, true)
                        """),
                        {"role_id": role_id, "action": action},
                    )
                    print(f"[OK]   resource_permissions: {role_name} communications:{action}")

        await db.commit()
        print()
        print("=== Communication menu + permissions seeded ===")
        print(f"  Schema:  {SCHEMA}")
        print(f"  Menu:    {MENU_NAME} -> {MENU_URL} (L0, order={MENU_DISPLAY_ORDER})")
        print(f"  Roles:   {ALLOWED_ROLES}")
        print(f"  Actions: {ACTIONS}")
        print()
        print("Re-login to see the Communication menu in the sidebar.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
