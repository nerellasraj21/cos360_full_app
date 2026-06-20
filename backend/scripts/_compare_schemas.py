"""Compare tables and columns between cos360_master and test_tenant_schema."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

import asyncpg
from app.config import settings


async def compare():
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    master_tables = set(
        r["table_name"] for r in await conn.fetch(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='cos360_master' AND table_type='BASE TABLE'"
        )
    )
    tenant_tables = set(
        r["table_name"] for r in await conn.fetch(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='test_tenant_schema' AND table_type='BASE TABLE'"
        )
    )

    only_in_master = sorted(master_tables - tenant_tables)
    only_in_tenant = sorted(tenant_tables - master_tables)
    in_both = master_tables & tenant_tables

    print(f"cos360_master tables     : {len(master_tables)}")
    print(f"test_tenant_schema tables: {len(tenant_tables)}")
    print()

    print("=== ONLY IN cos360_master (missing from test_tenant_schema) ===")
    for t in only_in_master:
        print(f"  - {t}")
    if not only_in_master:
        print("  (none)")
    print()

    print("=== ONLY IN test_tenant_schema (missing from cos360_master) ===")
    for t in only_in_tenant:
        print(f"  - {t}")
    if not only_in_tenant:
        print("  (none)")
    print()

    print("=== COLUMN DIFFERENCES (tables present in both) ===")
    diffs = []
    for table in sorted(in_both):
        master_cols = {
            r["column_name"] for r in await conn.fetch(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema='cos360_master' AND table_name=$1",
                table,
            )
        }
        tenant_cols = {
            r["column_name"] for r in await conn.fetch(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema='test_tenant_schema' AND table_name=$1",
                table,
            )
        }
        only_master = sorted(master_cols - tenant_cols)
        only_tenant = sorted(tenant_cols - master_cols)
        if only_master or only_tenant:
            diffs.append((table, only_master, only_tenant))

    if diffs:
        for table, om, ot in diffs:
            print(f"  {table}:")
            for c in om:
                print(f"    [master only] {c}")
            for c in ot:
                print(f"    [tenant only] {c}")
    else:
        print("  (no column differences)")

    await conn.close()


if __name__ == "__main__":
    asyncio.run(compare())
