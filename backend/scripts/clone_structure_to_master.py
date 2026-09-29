"""
Clone structure from test_tenant_schema to cos360_master
Since test_tenant_schema has all the features, use it as the template
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def clone_structure_to_master():
    """Clone table structure from test_tenant_schema to cos360_master"""

    database_url = os.getenv('DATABASE_URL')
    if database_url.startswith('postgresql+asyncpg://'):
        database_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')

    conn = await asyncpg.connect(database_url)

    try:
        print("=" * 70)
        print("CLONING STRUCTURE: test_tenant_schema -> cos360_master")
        print("=" * 70)
        print()

        # Step 1: Get all tables from test_tenant_schema
        print("Step 1: Getting tables from test_tenant_schema...")
        tables = await conn.fetch("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'test_tenant_schema'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        print(f"  Found {len(tables)} tables")
        print()

        # Step 2: Clone each table structure
        print("Step 2: Cloning table structures...")
        cloned_count = 0

        for table_row in tables:
            table_name = table_row['table_name']

            try:
                # Create table in cos360_master with same structure as test_tenant
                await conn.execute(f'''
                    CREATE TABLE cos360_master."{table_name}"
                    (LIKE test_tenant_schema."{table_name}" INCLUDING ALL)
                ''')
                cloned_count += 1

                if cloned_count % 10 == 0:
                    print(f"  Cloned {cloned_count}/{len(tables)} tables...")

            except Exception as e:
                print(f"  Warning: Could not clone {table_name}: {e}")

        print(f"  Successfully cloned {cloned_count} tables")
        print()

        # Step 3: Verify
        print("Step 3: Verifying...")
        master_count = await conn.fetchval("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'cos360_master'
        """)
        print(f"  Tables in cos360_master: {master_count}")
        print()

        # Step 4: Set alembic_version to match tenant
        print("Step 4: Setting alembic_version...")
        tenant_version = await conn.fetchval(
            "SELECT version_num FROM test_tenant_schema.alembic_version LIMIT 1"
        )

        if tenant_version:
            # Check if alembic_version table exists
            alembic_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'cos360_master'
                    AND table_name = 'alembic_version'
                )
            """)

            if alembic_exists:
                # Clear and set version
                await conn.execute("DELETE FROM cos360_master.alembic_version")
                await conn.execute(
                    "INSERT INTO cos360_master.alembic_version (version_num) VALUES ($1)",
                    tenant_version
                )
                print(f"  Alembic version set to: {tenant_version}")
            else:
                print("  Warning: alembic_version table not cloned")

        print()

        print("=" * 70)
        print("SUCCESS: Structure cloned to cos360_master")
        print("=" * 70)
        print()
        print(f"cos360_master now has {master_count} tables")
        print(f"Alembic version: {tenant_version}")
        print()
        print("Next step: Verify with drift analysis")
        print("  Run: python scripts/diagnose_schema_drift.py")
        print()

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(clone_structure_to_master())
