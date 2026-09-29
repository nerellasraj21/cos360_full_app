import os, asyncio, asyncpg
from dotenv import load_dotenv
load_dotenv()

async def run():
    url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    schema = "test_tenant_schema"

    # Get the lowercase staff role and its single permission
    role = await conn.fetchrow(f'SELECT id FROM "{schema}".roles WHERE name=$1', 'staff')
    if role:
        perms = await conn.fetch(
            f'SELECT resource, action FROM "{schema}".resource_permissions WHERE role_id=$1', role['id']
        )
        print(f"Lowercase 'staff' role permissions: {[(p['resource'], p['action']) for p in perms]}")

    await conn.close()

asyncio.run(run())
