import os, asyncio, asyncpg
from dotenv import load_dotenv
load_dotenv()

async def run():
    url = os.getenv("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)

    schemas = await conn.fetch(
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'cos360%' ORDER BY schema_name"
    )
    print("Schemas:")
    for s in schemas:
        print(" ", s["schema_name"])

    # Check roles and academic years in each schema
    for s in schemas:
        schema = s["schema_name"]
        try:
            roles = await conn.fetch(f'SELECT name, id FROM "{schema}".roles ORDER BY name')
            print(f"\n{schema} roles: {[r['name'] for r in roles]}")

            if roles:
                for r in roles:
                    perms = await conn.fetch(
                        f'SELECT COUNT(*) as cnt FROM "{schema}".resource_permissions WHERE role_id=$1', r['id']
                    )
                    # Check academic_years permissions specifically
                    ay_perms = await conn.fetch(
                        f'SELECT action FROM "{schema}".resource_permissions WHERE role_id=$1 AND resource=$2',
                        r['id'], 'academic_years'
                    )
                    print(f"  {r['name']}: {perms[0]['cnt']} total perms | academic_years: {[p['action'] for p in ay_perms]}")

            # Check academic years data
            try:
                ay = await conn.fetch(f'SELECT title, is_active FROM "{schema}".academic_years ORDER BY title')
                print(f"  Academic Years: {[(a['title'], a['is_active']) for a in ay]}")
            except Exception as e:
                print(f"  Academic Years table error: {e}")

        except Exception as e:
            print(f"  Error reading {schema}: {e}")

    await conn.close()

asyncio.run(run())
