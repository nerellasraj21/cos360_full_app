import os, asyncio, asyncpg
from dotenv import load_dotenv
load_dotenv()

async def run():
    url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    schema = "test_tenant_schema"

    # Check staff table columns
    cols = await conn.fetch(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='staff'",
        schema
    )
    print(f"Staff table columns: {[c['column_name'] for c in cols]}")

    # Find SIVA in staff
    try:
        sivas = await conn.fetch(
            f'SELECT * FROM "{schema}".staff WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1',
            '%siva%'
        )
        print(f"\nStaff named SIVA: {len(sivas)} found")
        for s in sivas:
            print(dict(s))
    except Exception as e:
        print(f"Staff query error: {e}")

    # Check what academic year the tenant is on now
    try:
        ay = await conn.fetch(f'SELECT id, title, is_active FROM "{schema}".academic_years ORDER BY title')
        print(f"\nAll academic years:")
        for a in ay:
            print(f"  {a['title']} | active={a['is_active']} | id={str(a['id'])[:8]}")
    except Exception as e:
        print(f"Academic year error: {e}")

    # Check what cschema SIVA's user would use - check all users for matching staff
    try:
        users = await conn.fetch(
            f'SELECT u.id, u.username, u.is_active, r.name as role FROM "{schema}".users u '
            f'LEFT JOIN "{schema}".roles r ON u.role_id = r.id '
            f'WHERE u.username ILIKE $1',
            '%siva%'
        )
        print(f"\nUsers matching 'siva': {len(users)}")
        for u in users:
            print(f"  username={u['username']} role={u['role']} active={u['is_active']}")
    except Exception as e:
        print(f"User query error: {e}")

    await conn.close()

asyncio.run(run())
