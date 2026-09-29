"""
Update display_order for L0 (top-level) menus to match the agreed order.
Applies to cos360_master first, then test_tenant_schema.
No schema change — data-only UPDATE, no Alembic migration needed.

Usage:
    python scripts/update_menu_order.py
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

MENU_ORDER = [
    ("Dashboard",        1),
    ("Students",         2),
    ("Staff Management", 3),
    ("Exam Management",  4),
    ("Fee",              5),
    ("Expense",          6),
    ("Communication",    7),
    ("Reports",          8),
    ("Masters",          9),
    ("Administration",  10),
    ("Transport",       11),
]

SCHEMAS = ["cos360_main", "test_tenant_schema"]


async def apply_order(db, schema: str):
    await db.execute(text(f"SET search_path TO {schema}, public"))
    print(f"\n=== Applying menu order in schema: {schema} ===")
    for name, order in MENU_ORDER:
        result = await db.execute(
            text("UPDATE menus SET display_order = :order WHERE name = :name AND parent_id IS NULL"),
            {"order": order, "name": name},
        )
        rows = result.rowcount
        status = "[OK]  " if rows > 0 else "[SKIP] not found —"
        print(f"  {status} '{name}' -> display_order={order}  (rows updated: {rows})")


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        for schema in SCHEMAS:
            await apply_order(db, schema)
        await db.commit()
        print("\n=== Menu order updated and committed ===")
        print("Re-login to see the updated menu order in the sidebar.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
