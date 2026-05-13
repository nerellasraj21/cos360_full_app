from dotenv import load_dotenv
import os, asyncio, asyncpg
load_dotenv()

async def check():
    url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    schema = "cos360_master"

    # All roles
    roles = await conn.fetch(f"SELECT id, name FROM {schema}.roles ORDER BY name")
    print(f"Roles in {schema}:")
    for r in roles:
        print(f"  {r['name']}  ({r['id']})")

    # Permission count per role
    print(f"\nPermission count per role:")
    counts = await conn.fetch(
        f"SELECT r.name, COUNT(rp.id) as cnt FROM {schema}.roles r "
        f"LEFT JOIN {schema}.resource_permissions rp ON r.id=rp.role_id "
        f"GROUP BY r.name ORDER BY r.name"
    )
    for c in counts:
        print(f"  {c['name']}: {c['cnt']} permissions")

    await conn.close()

asyncio.run(check())
