import os, asyncio, asyncpg
from dotenv import load_dotenv
load_dotenv()

async def run():
    url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    schema = "test_tenant_schema"

    # Get the lowercase staff role id
    role = await conn.fetchrow(f'SELECT id FROM "{schema}".roles WHERE name=$1', 'staff')
    if role:
        users = await conn.fetch(
            f'SELECT username FROM "{schema}".users WHERE role_id=$1', role['id']
        )
        print(f"Users on lowercase 'staff' role: {[u['username'] for u in users]}")
    await conn.close()

asyncio.run(run())
