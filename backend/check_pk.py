"""Check primary keys on fee tables"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_3BRCMxJ8aKdN@ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

async def check_pks():
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        # Check for primary keys on fee_term_dates
        result = await db.execute(text("""
            SELECT
                tc.table_name,
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'test_tenant_schema'
            AND tc.table_name IN ('fee_term_dates', 'fee_terms', 'fee_types')
            AND tc.constraint_type = 'PRIMARY KEY'
            ORDER BY tc.table_name
        """))

        print("Primary keys in fee tables:")
        for row in result:
            print(f"  {row[0]}.{row[3]} - {row[1]}")

        # Check if fee_term_dates table exists at all
        result = await db.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'test_tenant_schema'
            AND table_name LIKE 'fee_%'
            ORDER BY table_name
        """))

        print("\nFee tables in test_tenant_schema:")
        for row in result:
            print(f"  {row[0]}")

asyncio.run(check_pks())
