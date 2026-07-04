"""
Seed little_bunny with missing baseline data from cos360_master:
menus, roles, role_menu_permissions, issuable_certificate_templates.

Insert-only: never touches little_bunny's existing rows (its 5 roles,
students, fees, etc. are left untouched). Follows the same pattern as
scripts/seed_master_menu_permissions.py.

Usage:
    python scripts/seed_master_data_little_bunny.py
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

SOURCE = "cos360_master"
TARGET = "little_bunny"


async def seed_menus(db):
    print("\n=== menus ===")
    await db.execute(text(f"SET search_path TO {SOURCE}, public"))
    menus = (await db.execute(text(
        "SELECT id, name, url, level, parent_id, display_order FROM menus ORDER BY display_order, name"
    ))).fetchall()

    await db.execute(text(f"SET search_path TO {TARGET}, public"))
    existing = (await db.execute(text("SELECT COUNT(*) FROM menus"))).scalar()
    if existing > 0:
        print(f"  [SKIP] menus already present ({existing} rows)")
        return

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


async def seed_roles(db):
    """Insert master roles missing by name. Returns {master_role_id: little_bunny_role_id}
    for ALL master roles (existing ones mapped to their little_bunny id, new ones to
    the same id used on insert), so role_menu_permissions can translate role_id correctly."""
    print("\n=== roles ===")
    await db.execute(text(f"SET search_path TO {SOURCE}, public"))
    roles = (await db.execute(text(
        "SELECT id, name, description, is_system_role, is_custom_role FROM roles"
    ))).fetchall()

    await db.execute(text(f"SET search_path TO {TARGET}, public"))
    existing_by_name = {
        r.name: r.id for r in (await db.execute(text("SELECT id, name FROM roles"))).fetchall()
    }

    id_map = {}
    added = 0
    for r in roles:
        if r.name in existing_by_name:
            id_map[r.id] = existing_by_name[r.name]
            continue
        await db.execute(text(
            "INSERT INTO roles (id, name, description, is_system_role, is_custom_role) "
            "VALUES (:id, :name, :desc, :is_system_role, :is_custom_role)"
        ), {"id": r.id, "name": r.name, "desc": r.description,
            "is_system_role": r.is_system_role, "is_custom_role": r.is_custom_role})
        id_map[r.id] = r.id
        added += 1
    print(f"  [OK] roles added: {added} (skipped {len(roles) - added} already present)")
    return id_map


async def seed_role_menu_permissions(db, role_id_map):
    print("\n=== role_menu_permissions ===")
    await db.execute(text(f"SET search_path TO {SOURCE}, public"))
    perms = (await db.execute(text(
        "SELECT id, role_id, menu_id, can_view, can_edit FROM role_menu_permissions"
    ))).fetchall()

    await db.execute(text(f"SET search_path TO {TARGET}, public"))
    existing = (await db.execute(text("SELECT COUNT(*) FROM role_menu_permissions"))).scalar()
    if existing > 0:
        print(f"  [SKIP] role_menu_permissions already present ({existing} rows)")
        return

    # menu_id matches directly (menus table was empty, inserted with master's ids).
    # role_id must be translated: little_bunny's pre-existing roles (Admin/Staff/...)
    # kept their own ids, so master's role_id is remapped via role_id_map.
    skipped = 0
    inserted = 0
    for p in perms:
        target_role_id = role_id_map.get(p.role_id)
        if target_role_id is None:
            skipped += 1
            continue
        await db.execute(text(
            "INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view, can_edit) "
            "VALUES (:id, :role_id, :menu_id, :can_view, :can_edit)"
        ), {"id": p.id, "role_id": target_role_id, "menu_id": p.menu_id,
            "can_view": p.can_view, "can_edit": p.can_edit})
        inserted += 1
    if skipped:
        print(f"  [WARN] skipped {skipped} rows with unmapped role_id")
    print(f"  [OK] role_menu_permissions seeded: {inserted} rows")


async def seed_certificate_templates(db):
    print("\n=== issuable_certificate_templates ===")
    await db.execute(text(f"SET search_path TO {SOURCE}, public"))
    templates = (await db.execute(text(
        "SELECT * FROM issuable_certificate_templates"
    ))).mappings().fetchall()

    await db.execute(text(f"SET search_path TO {TARGET}, public"))
    existing = (await db.execute(text("SELECT COUNT(*) FROM issuable_certificate_templates"))).scalar()
    if existing > 0:
        print(f"  [SKIP] issuable_certificate_templates already present ({existing} rows)")
        return

    for t in templates:
        cols = ", ".join(t.keys())
        placeholders = ", ".join(f":{k}" for k in t.keys())
        await db.execute(text(
            f"INSERT INTO issuable_certificate_templates ({cols}) VALUES ({placeholders})"
        ), dict(t))
    cnt = (await db.execute(text("SELECT COUNT(*) FROM issuable_certificate_templates"))).scalar()
    print(f"  [OK] issuable_certificate_templates seeded: {cnt} rows")


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await seed_menus(db)
        role_id_map = await seed_roles(db)
        await seed_role_menu_permissions(db, role_id_map)
        await seed_certificate_templates(db)

        await db.commit()
        print(f"\n=== Done seeding {TARGET} from {SOURCE} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
