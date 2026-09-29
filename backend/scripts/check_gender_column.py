import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url)
    result = await conn.fetchval("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'cos360_master'
            AND table_name = 'staff'
            AND column_name = 'gender'
        )
    """)
    await conn.close()
    print(f'gender column exists in cos360_master.staff: {result}')

asyncio.run(check())
