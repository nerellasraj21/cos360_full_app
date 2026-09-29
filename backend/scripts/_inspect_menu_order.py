"""
READ-ONLY inspection: list the L0 (top-level) menus in public.menus with
their current display_order. Makes NO changes to the database.

Usage:
    python scripts/_inspect_menu_order.py
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


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # List active tenant schemas
        tenants = (await db.execute(
            text("SELECT schema_name, client_name, is_active FROM public.tenants ORDER BY client_name")
        )).fetchall()

        print("=== Tenants ===")
        for t in tenants:
            print(f"  schema={t.schema_name!r}  client={t.client_name!r}  active={t.is_active}")
        print()

        for t in tenants:
            schema = t.schema_name
            try:
                await db.execute(text(f'SET search_path TO "{schema}", public'))
                rows = (await db.execute(text(
                    "SELECT name, url, level, display_order FROM menus "
                    "WHERE parent_id IS NULL ORDER BY display_order, name"
                ))).fetchall()
            except Exception as e:
                print(f"=== {schema}: could not read menus ({e}) ===\n")
                continue

            print(f"=== L0 menus in {schema} ===")
            for r in rows:
                print(f"  order={r.display_order:>4}  name={r.name!r:<22} url={r.url!r:<20} level={r.level}")
            print()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
