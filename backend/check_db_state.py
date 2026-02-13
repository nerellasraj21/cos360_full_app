"""
Quick check of test_tenant schema state
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Database URL from .env
DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_3BRCMxJ8aKdN@ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

async def check_state():
    """Check current state of test_tenant schema"""
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("=" * 80)
    print("CHECKING test_tenant_schema STATE")
    print("=" * 80)

    async with AsyncSessionLocal() as db:
        # Check 1: NULL term_date_id counts
        print("\n1. NULL term_date_id counts:")
        result = await db.execute(text("""
            SELECT
                'fee_class_map_term_amounts' as table_name,
                COUNT(*) as null_count
            FROM test_tenant_schema.fee_class_map_term_amounts
            WHERE term_date_id IS NULL
            UNION ALL
            SELECT
                'fee_student_map_term_amounts',
                COUNT(*)
            FROM test_tenant_schema.fee_student_map_term_amounts
            WHERE term_date_id IS NULL
            UNION ALL
            SELECT
                'fee_transaction_items',
                COUNT(*)
            FROM test_tenant_schema.fee_transaction_items
            WHERE term_date_id IS NULL
        """))
        for row in result:
            status = "OK" if row[1] == 0 else f"NEEDS FIX ({row[1]} rows)"
            print(f"   {row[0]}: {status}")

        # Check 2: Foreign key constraints
        print("\n2. Foreign key constraints on term_date_id:")
        result = await db.execute(text("""
            SELECT COUNT(*)
            FROM information_schema.table_constraints
            WHERE constraint_schema = 'test_tenant_schema'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%term_date_id%'
        """))
        fk_count = result.scalar()
        status = "OK" if fk_count >= 3 else f"MISSING (found {fk_count}, need 3+)"
        print(f"   Count: {fk_count} - {status}")

        # Check 3: reprint_count type
        print("\n3. reprint_count data type:")
        result = await db.execute(text("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = 'test_tenant_schema'
            AND table_name = 'fee_receipts'
            AND column_name = 'reprint_count'
        """))
        row = result.fetchone()
        if row:
            dtype = row[0]
            status = "OK" if dtype in ('integer', 'bigint', 'smallint') else f"NEEDS FIX ({dtype})"
            print(f"   Type: {dtype} - {status}")
        else:
            print("   Column not found!")

        # Check 4: Unique constraint on transaction_number
        print("\n4. Unique constraint on transaction_number:")
        result = await db.execute(text("""
            SELECT 1
            FROM information_schema.table_constraints
            WHERE constraint_schema = 'test_tenant_schema'
            AND table_name = 'fee_transactions'
            AND constraint_name = 'uq_fee_transactions_transaction_number'
        """))
        has_constraint = result.fetchone() is not None
        status = "OK" if has_constraint else "MISSING"
        print(f"   Status: {status}")

        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print("\nDatabase fixes applied: Use the scripts/apply_fixes_to_test_tenant.py")
        print("if any items above show 'NEEDS FIX' or 'MISSING'")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(check_state())
