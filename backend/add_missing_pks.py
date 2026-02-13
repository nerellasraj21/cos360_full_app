"""
Add ONLY missing primary keys needed for foreign key constraints
Minimal changes - only affects fee_term_dates, fee_types, fee_terms
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_3BRCMxJ8aKdN@ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

async def add_pks():
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("=" * 80)
    print("ADDING MISSING PRIMARY KEYS (Minimal changes)")
    print("=" * 80)

    async with AsyncSessionLocal() as db:
        tables_to_fix = ['fee_term_dates', 'fee_types', 'fee_terms']

        for table in tables_to_fix:
            print(f"\nChecking {table}...")

            # Check if PK already exists
            result = await db.execute(text(f"""
                SELECT 1
                FROM information_schema.table_constraints
                WHERE table_schema = 'test_tenant_schema'
                AND table_name = '{table}'
                AND constraint_type = 'PRIMARY KEY'
            """))

            if result.fetchone():
                print(f"  Primary key already exists (skipped)")
                continue

            # Add primary key on id column
            try:
                await db.execute(text(f"""
                    ALTER TABLE test_tenant_schema.{table}
                    ADD CONSTRAINT {table}_pkey
                    PRIMARY KEY (id)
                """))
                await db.commit()
                print(f"  Added primary key on id column")
            except Exception as e:
                if "already exists" in str(e) or "duplicate" in str(e):
                    print(f"  Primary key already exists (skipped)")
                    await db.rollback()
                else:
                    print(f"  ERROR: {str(e)}")
                    await db.rollback()
                    raise

    print("\n" + "=" * 80)
    print("PRIMARY KEYS ADDED")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(add_pks())
