"""Seed default roles for little_bunny tenant."""
import asyncio, asyncpg, os
from dotenv import load_dotenv
load_dotenv()

SCHEMA = "little_bunny"

DEFAULT_ROLES = [
    ("Admin",   "Tenant Administrator - Full access to plan features"),
    ("Teacher", "Teaching staff - Student and academic management"),
    ("Staff",   "Administrative staff - Limited access"),
    ("Student", "Student users - Read access to their data"),
    ("Parent",  "Parent/Guardian - Access to children's data"),
]

async def seed():
    url = os.getenv("DATABASE_URL").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    try:
        created = 0
        for name, desc in DEFAULT_ROLES:
            await conn.execute(
                f'INSERT INTO "{SCHEMA}".roles (id, name, description, is_system_role, is_custom_role) '
                f'VALUES (gen_random_uuid(), $1, $2, true, false)',
                name, desc
            )
            print(f"  Created role: {name}")
            created += 1
        print(f"\nDone — {created} roles seeded into {SCHEMA}.")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await conn.close()

asyncio.run(seed())
