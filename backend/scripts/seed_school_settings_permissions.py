"""
Seed school_settings permissions for Admin role across all active tenant schemas.

Usage:
    python scripts/seed_school_settings_permissions.py
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

ACTIONS = ["read", "update"]


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        tenants_result = await db.execute(text("""
            SELECT schema_name, client_name FROM public.tenants WHERE is_active = true
        """))
        tenants = tenants_result.fetchall()

        if not tenants:
            print("No active tenants found.")
            return

        for tenant in tenants:
            schema = tenant.schema_name
            client = tenant.client_name

            check = await db.execute(text(f"""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{schema}' AND table_name = 'roles'
                )
            """))
            if not check.scalar():
                print(f"[SKIP] {schema} — roles table not found")
                continue

            admin_result = await db.execute(text(f"""
                SELECT id FROM "{schema}".roles WHERE name = 'Admin' LIMIT 1
            """))
            admin = admin_result.fetchone()

            if not admin:
                print(f"[SKIP] {schema} — Admin role not found")
                continue

            admin_id = admin.id

            for action in ACTIONS:
                exists = await db.execute(text(f"""
                    SELECT 1 FROM "{schema}".resource_permissions
                    WHERE role_id = :role_id AND resource = 'school_settings' AND action = :action
                    LIMIT 1
                """), {"role_id": admin_id, "action": action})
                if not exists.fetchone():
                    await db.execute(text(f"""
                        INSERT INTO "{schema}".resource_permissions
                            (id, role_id, resource, action, is_granted)
                        VALUES (gen_random_uuid(), :role_id, 'school_settings', :action, true)
                    """), {"role_id": admin_id, "action": action})
                else:
                    await db.execute(text(f"""
                        UPDATE "{schema}".resource_permissions
                        SET is_granted = true
                        WHERE role_id = :role_id AND resource = 'school_settings' AND action = :action
                    """), {"role_id": admin_id, "action": action})

            await db.commit()
            print(f"[OK] {client} ({schema}) — school_settings read + update seeded for Admin")

    await engine.dispose()
    print()
    print("=== school_settings permissions seeded across all tenants ===")
    print("NOTE: Users must log out and log back in to pick up the new permissions.")


if __name__ == "__main__":
    asyncio.run(run())
