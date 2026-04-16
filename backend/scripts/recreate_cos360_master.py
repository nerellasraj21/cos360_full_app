"""
Drop and recreate cos360_master schema (structure only, no data)
This creates a clean master template schema
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def recreate_master_schema():
    """Drop and recreate cos360_master schema"""

    database_url = os.getenv('DATABASE_URL')
    if database_url.startswith('postgresql+asyncpg://'):
        database_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')

    conn = await asyncpg.connect(database_url)

    try:
        print("=" * 70)
        print("RECREATING cos360_master SCHEMA")
        print("=" * 70)
        print()

        # Step 1: Check current state
        print("Step 1: Checking current state...")
        table_count = await conn.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'cos360_master'"
        )
        print(f"  Current tables in cos360_master: {table_count}")

        try:
            version = await conn.fetchval("SELECT version_num FROM cos360_master.alembic_version")
            print(f"  Current alembic version: {version}")
        except:
            print(f"  No alembic version found")

        print()

        # Step 2: Drop schema
        print("Step 2: Dropping cos360_master schema...")
        await conn.execute("DROP SCHEMA IF EXISTS cos360_master CASCADE")
        print("  Schema dropped successfully")
        print()

        # Step 3: Create fresh schema
        print("Step 3: Creating fresh cos360_master schema...")
        await conn.execute("CREATE SCHEMA cos360_master")
        print("  Schema created successfully")
        print()

        # Step 4: Verify
        print("Step 4: Verifying...")
        exists = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cos360_master')"
        )
        print(f"  cos360_master exists: {exists}")

        table_count_new = await conn.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'cos360_master'"
        )
        print(f"  Tables in new schema: {table_count_new}")
        print()

        print("=" * 70)
        print("SUCCESS: cos360_master recreated")
        print("=" * 70)
        print()
        print("Next steps:")
        print("1. Run: export SCHEMA_NAME=cos360_master")
        print("2. Run: alembic upgrade head")
        print("3. Verify: alembic current")
        print()

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(recreate_master_schema())
