import asyncio, asyncpg, os
from dotenv import load_dotenv
load_dotenv()

async def check():
    url = os.getenv("DATABASE_URL").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    cols = await conn.fetch(
        "SELECT column_name, data_type FROM information_schema.columns "
        "WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position",
        "little_bunny", "roles"
    )
    for c in cols:
        print(c["column_name"], "-", c["data_type"])
    await conn.close()

asyncio.run(check())
