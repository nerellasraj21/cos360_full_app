"""Fix reprint_count data type"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_3BRCMxJ8aKdN@ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

async def fix():
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        print("Fixing reprint_count data type...")

        # Step 1: Clean invalid values
        result = await db.execute(text("""
            UPDATE test_tenant_schema.fee_receipts
            SET reprint_count = CASE
                WHEN reprint_count ~ '^[0-9]+$' THEN reprint_count
                ELSE '0'
            END
            WHERE reprint_count IS NULL OR reprint_count !~ '^[0-9]+$'
        """))
        print(f"  Cleaned {result.rowcount} invalid values")
        await db.commit()

        # Step 2: Drop default value first
        try:
            await db.execute(text("""
                ALTER TABLE test_tenant_schema.fee_receipts
                ALTER COLUMN reprint_count DROP DEFAULT
            """))
            await db.commit()
            print("  Dropped default value")
        except Exception as e:
            print(f"  Drop default: {str(e)[:100]}")
            await db.rollback()

        # Step 3: Convert to INTEGER
        try:
            await db.execute(text("""
                ALTER TABLE test_tenant_schema.fee_receipts
                ALTER COLUMN reprint_count TYPE INTEGER USING reprint_count::integer
            """))
            await db.commit()
            print("  Converted to INTEGER successfully")

            # Step 4: Set new default
            await db.execute(text("""
                ALTER TABLE test_tenant_schema.fee_receipts
                ALTER COLUMN reprint_count SET DEFAULT 0
            """))
            await db.commit()
            print("  Set default to 0")
        except Exception as e:
            print(f"  Error: {str(e)[:150]}")
            await db.rollback()

asyncio.run(fix())
