"""
Seed cos360_master with menus, roles, role_menu_permissions from test_tenant_schema,
then fix the 'Fee' menu permission (add for Admin/Staff/Teacher, remove old 'Fee Management')
in BOTH cos360_master and test_tenant_schema.

Usage:
    python scripts/seed_master_menu_permissions.py
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

SOURCE = "test_tenant_schema"
MASTER = "cos360_master"
TARGET = "test_tenant_schema"

# Roles that should have the 'Fee' menu visible
FEE_ROLES = ["Admin", "Staff", "Teacher"]


async def seed_master(db):
    """Copy menus, roles, role_menu_permissions from test_tenant_schema into cos360_master."""
    print(f"\n=== Step 1: Seeding {MASTER} from {SOURCE} ===")

    # --- menus (self-referential: insert parents first) ---
    await db.execute(text(f"SET search_path TO {SOURCE}, public"))
    menus = (await db.execute(text(
        "SELECT id, name, url, level, parent_id, display_order FROM menus ORDER BY display_order, name"
    ))).fetchall()

    await db.execute(text(f"SET search_path TO {MASTER}, public"))
    existing = (await db.execute(text("SELECT COUNT(*) FROM menus"))).scalar()
    if existing > 0:
        print(f"  [SKIP] menus already seeded ({existing} rows)")
    else:
        # Insert L0 first, then children (table is empty so plain INSERT is safe)
        for level in ["L0", "L1", "L2", "L3"]:
            for m in menus:
                if m.level == level:
                    await db.execute(text(
                        "INSERT INTO menus (id, name, url, level, parent_id, display_order) "
                        "VALUES (:id, :name, :url, :level, :parent_id, :display_order)"
                    ), {"id": m.id, "name": m.name, "url": m.url, "level": m.level,
                        "parent_id": m.parent_id, "display_order": m.display_order})
        cnt = (await db.execute(text("SELECT COUNT(*) FROM menus"))).scalar()
        print(f"  [OK] menus seeded: {cnt} rows")

    # --- roles ---
    await db.execute(text(f"SET search_path TO {SOURCE}, public"))
    roles = (await db.execute(text(
        "SELECT id, name, description, is_system_role, is_custom_role FROM roles"
    ))).fetchall()

    await db.execute(text(f"SET search_path TO {MASTER}, public"))
    existing = (await db.execute(text("SELECT COUNT(*) FROM roles"))).scalar()
    if existing > 0:
        print(f"  [SKIP] roles already seeded ({existing} rows)")
    else:
        for r in roles:
            await db.execute(text(
                "INSERT INTO roles (id, name, description, is_system_role, is_custom_role) "
                "VALUES (:id, :name, :desc, :is_system_role, :is_custom_role)"
            ), {"id": r.id, "name": r.name, "desc": r.description,
                "is_system_role": r.is_system_role, "is_custom_role": r.is_custom_role})
        cnt = (await db.execute(text("SELECT COUNT(*) FROM roles"))).scalar()
        print(f"  [OK] roles seeded: {cnt} rows")

    # --- role_menu_permissions ---
    await db.execute(text(f"SET search_path TO {SOURCE}, public"))
    perms = (await db.execute(text(
        "SELECT id, role_id, menu_id, can_view, can_edit FROM role_menu_permissions"
    ))).fetchall()

    await db.execute(text(f"SET search_path TO {MASTER}, public"))
    existing = (await db.execute(text("SELECT COUNT(*) FROM role_menu_permissions"))).scalar()
    if existing > 0:
        print(f"  [SKIP] role_menu_permissions already seeded ({existing} rows)")
    else:
        for p in perms:
            await db.execute(text(
                "INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view, can_edit) "
                "VALUES (:id, :role_id, :menu_id, :can_view, :can_edit)"
            ), {"id": p.id, "role_id": p.role_id, "menu_id": p.menu_id,
                "can_view": p.can_view, "can_edit": p.can_edit})
        cnt = (await db.execute(text("SELECT COUNT(*) FROM role_menu_permissions"))).scalar()
        print(f"  [OK] role_menu_permissions seeded: {cnt} rows")


async def fix_fee_permissions(db, schema):
    """Add 'Fee' permission for Admin/Staff/Teacher and remove old 'Fee Management' permission."""
    print(f"\n=== Step 2/3: Fixing Fee permissions in {schema} ===")
    await db.execute(text(f"SET search_path TO {schema}, public"))

    # Get Fee menu id
    fee_menu = (await db.execute(text(
        "SELECT id FROM menus WHERE name = 'Fee' AND parent_id IS NULL"
    ))).fetchone()
    if not fee_menu:
        print(f"  [SKIP] 'Fee' menu not found in {schema}")
        return

    # Get old Fee Management menu id
    fee_mgmt_menu = (await db.execute(text(
        "SELECT id FROM menus WHERE name = 'Fee Management' AND parent_id IS NULL"
    ))).fetchone()

    for role_name in FEE_ROLES:
        role = (await db.execute(text(
            "SELECT id FROM roles WHERE name = :name"
        ), {"name": role_name})).fetchone()
        if not role:
            print(f"  [SKIP] role '{role_name}' not found")
            continue

        # Add 'Fee' permission if missing
        existing = (await db.execute(text(
            "SELECT id FROM role_menu_permissions WHERE role_id = :role_id AND menu_id = :menu_id"
        ), {"role_id": role.id, "menu_id": fee_menu.id})).fetchone()

        if not existing:
            await db.execute(text(
                "INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view, can_edit) "
                "VALUES (gen_random_uuid(), :role_id, :menu_id, true, true)"
            ), {"role_id": role.id, "menu_id": fee_menu.id})
            print(f"  [ADD] 'Fee' -> role='{role_name}' can_view=True")
        else:
            print(f"  [OK ] 'Fee' -> role='{role_name}' already exists")

        # Remove old 'Fee Management' permission
        if fee_mgmt_menu:
            result = await db.execute(text(
                "DELETE FROM role_menu_permissions WHERE role_id = :role_id AND menu_id = :menu_id"
            ), {"role_id": role.id, "menu_id": fee_mgmt_menu.id})
            if result.rowcount > 0:
                print(f"  [DEL] 'Fee Management' (old) -> role='{role_name}' removed")
            else:
                print(f"  [OK ] 'Fee Management' (old) -> role='{role_name}' not present")


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # Step 1: Seed cos360_master
        await seed_master(db)

        # Step 2: Fix fee permissions in cos360_master
        await fix_fee_permissions(db, MASTER)

        # Step 3: Fix fee permissions in test_tenant_schema
        await fix_fee_permissions(db, TARGET)

        await db.commit()
        print("\n=== Done. Re-login to see updated menu. ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
