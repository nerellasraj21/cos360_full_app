import os, asyncio, asyncpg
from dotenv import load_dotenv
load_dotenv()

async def run():
    url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    schema = "test_tenant_schema"

    # Get both staff roles
    roles = await conn.fetch(f'SELECT id, name FROM "{schema}".roles WHERE name ILIKE $1', 'staff')
    print(f"Roles matching 'staff':")
    for r in roles:
        perms = await conn.fetch(
            f'SELECT resource, action FROM "{schema}".resource_permissions WHERE role_id=$1 ORDER BY resource, action',
            r['id']
        )
        ay_perms = [p['action'] for p in perms if p['resource'] == 'academic_years']
        print(f"  name='{r['name']}' id={str(r['id'])[:8]} | total_perms={len(perms)} | academic_years={ay_perms}")

    # Check SIVA's user and their role
    user = await conn.fetchrow(
        f'SELECT u.id, u.username, u.role_id, r.name as role_name '
        f'FROM "{schema}".users u LEFT JOIN "{schema}".roles r ON u.role_id=r.id '
        f'WHERE u.username=$1', 'SIVA'
    )
    if user:
        print(f"\nSIVA user:")
        print(f"  role_id={str(user['role_id'])[:8]} role_name='{user['role_name']}'")

        # Get SIVA's actual permissions via role
        perms = await conn.fetch(
            f'SELECT resource, action FROM "{schema}".resource_permissions WHERE role_id=$1 AND resource=$2',
            user['role_id'], 'academic_years'
        )
        print(f"  academic_years perms: {[p['action'] for p in perms]}")

    await conn.close()

asyncio.run(run())
