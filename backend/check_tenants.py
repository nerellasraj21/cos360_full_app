import os, asyncio, asyncpg
from dotenv import load_dotenv
load_dotenv()

async def run():
    url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    # Check tenants in public schema
    tenants = await conn.fetch(
        "SELECT client_name, schema_name, is_active FROM public.tenants ORDER BY client_name"
    )
    print("Tenants in public schema:")
    for t in tenants:
        print(f"  client_name={t['client_name']} | schema={t['schema_name']} | active={t['is_active']}")

    # Check users in cos360_main
    try:
        users = await conn.fetch(
            'SELECT u.username, r.name as role FROM "cos360_main".users u '
            'LEFT JOIN "cos360_main".roles r ON u.role_id = r.id '
            'WHERE u.username ILIKE $1 OR u.full_name ILIKE $1',
            '%siva%'
        )
        print("\nUsers named SIVA in cos360_main:")
        for u in users:
            print(f"  username={u['username']} | role={u['role']}")
    except Exception as e:
        print(f"Error querying users: {e}")

    # Show active academic years per schema
    for schema in ["cos360_main", "cos360_master"]:
        try:
            ay = await conn.fetch(f'SELECT title, is_active FROM "{schema}".academic_years WHERE is_active=true')
            print(f"\nActive academic years in {schema}: {[a['title'] for a in ay]}")
        except Exception as e:
            print(f"{schema} academic_years error: {e}")

    await conn.close()

asyncio.run(run())
