import os, asyncio, asyncpg
from dotenv import load_dotenv
load_dotenv()

async def run():
    url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    schemas_to_check = ["cos360_main", "test_tenant_schema", "test_basic_schema", "cos360_master"]

    for schema in schemas_to_check:
        print(f"\n=== {schema} ===")
        # Check users table columns first
        try:
            cols = await conn.fetch(
                "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='users'",
                schema
            )
            col_names = [c['column_name'] for c in cols]
            print(f"  Users columns: {col_names}")
        except Exception as e:
            print(f"  Error getting columns: {e}")
            continue

        # Query users with SIVA
        try:
            users = await conn.fetch(f'SELECT username FROM "{schema}".users LIMIT 5')
            print(f"  Users (first 5): {[u['username'] for u in users]}")
        except Exception as e:
            print(f"  Error querying users: {e}")

        # Academic years
        try:
            ay = await conn.fetch(f'SELECT title, is_active FROM "{schema}".academic_years ORDER BY title')
            print(f"  Academic Years: {[(a['title'], a['is_active']) for a in ay]}")
        except Exception as e:
            print(f"  Academic years error: {e}")

        # Roles
        try:
            roles = await conn.fetch(f'SELECT name FROM "{schema}".roles ORDER BY name')
            print(f"  Roles: {[r['name'] for r in roles]}")
        except Exception as e:
            print(f"  Roles error: {e}")

    await conn.close()

asyncio.run(run())
