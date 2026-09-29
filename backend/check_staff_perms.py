import os, asyncio, asyncpg
from dotenv import load_dotenv
load_dotenv()

async def run():
    url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    schema = "test_tenant_schema"

    # Get Staff role id
    staff = await conn.fetchrow(f'SELECT id, name FROM "{schema}".roles WHERE name=$1', 'Staff')
    if not staff:
        # Try lowercase
        staff = await conn.fetchrow(f'SELECT id, name FROM "{schema}".roles WHERE name ILIKE $1', 'staff')

    if staff:
        print(f"Staff role id: {staff['id']} name: {staff['name']}")
        perms = await conn.fetch(
            f'SELECT resource, action FROM "{schema}".resource_permissions WHERE role_id=$1 ORDER BY resource, action',
            staff['id']
        )
        print(f"Total permissions: {len(perms)}")
        print("\nAcademic year permissions:")
        for p in perms:
            if 'academic' in p['resource']:
                print(f"  {p['resource']}:{p['action']}")

        print("\nAll permissions:")
        for p in perms:
            print(f"  {p['resource']}:{p['action']}")
    else:
        print("No Staff role found!")
        # Show all roles
        roles = await conn.fetch(f'SELECT id, name FROM "{schema}".roles ORDER BY name')
        print(f"Available roles: {[(r['name'], str(r['id'])[:8]) for r in roles]}")

    # Check users in test_tenant_schema
    print("\nAll users with staff role:")
    if staff:
        users = await conn.fetch(
            f'SELECT username FROM "{schema}".users WHERE role_id=$1', staff['id']
        )
        print(f"  {[u['username'] for u in users]}")

    await conn.close()

asyncio.run(run())
