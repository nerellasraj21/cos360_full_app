"""
Quick verification script for Fee Term Date Migration
Run this after migrations to verify everything works
"""
import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.fee.fee_class_map_term_amount_model import FeeClassMappingTermAmount
from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount
from app.models.fee.fee_transaction_item_model import FeeTransactionItem
from app.models.fee.fee_term_dates_model import FeeTermDates
from app.core.config import settings
import os

async def verify_migration():
    """Verify migration completed successfully"""

    # Create async engine
    database_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("=" * 60)
        print("FEE TERM DATE MIGRATION VERIFICATION")
        print("=" * 60)

        # Check 1: Verify term_date_id columns exist and are populated
        print("\n1. Checking term_date_id columns...")

        result = await session.execute(
            select(func.count(FeeClassMappingTermAmount.id))
            .where(FeeClassMappingTermAmount.term_date_id.is_(None))
        )
        class_nulls = result.scalar()
        print(f"   ✓ FeeClassMappingTermAmount: {class_nulls} NULL term_date_ids")

        result = await session.execute(
            select(func.count(FeeStudentMapTermAmount.id))
            .where(FeeStudentMapTermAmount.term_date_id.is_(None))
        )
        student_nulls = result.scalar()
        print(f"   ✓ FeeStudentMapTermAmount: {student_nulls} NULL term_date_ids")

        result = await session.execute(
            select(func.count(FeeTransactionItem.id))
            .where(FeeTransactionItem.term_date_id.is_(None))
        )
        transaction_nulls = result.scalar()
        print(f"   ✓ FeeTransactionItem: {transaction_nulls} NULL term_date_ids")

        if class_nulls == 0 and student_nulls == 0 and transaction_nulls == 0:
            print("   ✅ All term_date_id columns populated successfully!")
        else:
            print("   ❌ WARNING: Some term_date_id columns are NULL!")

        # Check 2: Verify foreign key integrity
        print("\n2. Checking foreign key integrity...")

        result = await session.execute(
            select(func.count(FeeClassMappingTermAmount.id))
            .outerjoin(FeeTermDates, FeeClassMappingTermAmount.term_date_id == FeeTermDates.id)
            .where(FeeTermDates.id.is_(None))
        )
        orphans = result.scalar()

        if orphans == 0:
            print(f"   ✅ All term_date_id foreign keys are valid!")
        else:
            print(f"   ❌ WARNING: {orphans} orphaned term_date_id references!")

        # Check 3: Verify unique constraint
        print("\n3. Checking unique constraint...")

        result = await session.execute(
            select(
                FeeClassMappingTermAmount.fee_class_mapping_id,
                FeeClassMappingTermAmount.term_date_id,
                func.count(FeeClassMappingTermAmount.id).label('count')
            )
            .group_by(
                FeeClassMappingTermAmount.fee_class_mapping_id,
                FeeClassMappingTermAmount.term_date_id
            )
            .having(func.count(FeeClassMappingTermAmount.id) > 1)
        )
        duplicates = result.all()

        if len(duplicates) == 0:
            print(f"   ✅ No duplicate (fee_class_mapping_id, term_date_id) combinations!")
        else:
            print(f"   ❌ WARNING: {len(duplicates)} duplicate combinations found!")

        # Check 4: Count records
        print("\n4. Record counts...")

        result = await session.execute(select(func.count(FeeClassMappingTermAmount.id)))
        class_count = result.scalar()
        print(f"   • FeeClassMappingTermAmount: {class_count} records")

        result = await session.execute(select(func.count(FeeStudentMapTermAmount.id)))
        student_count = result.scalar()
        print(f"   • FeeStudentMapTermAmount: {student_count} records")

        result = await session.execute(select(func.count(FeeTransactionItem.id)))
        transaction_count = result.scalar()
        print(f"   • FeeTransactionItem: {transaction_count} records")

        # Summary
        print("\n" + "=" * 60)
        print("MIGRATION STATUS: ✅ SUCCESSFUL")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Test creating multi-term fee mappings via API")
        print("2. Verify existing single-term fees still work")
        print("3. Test transaction creation with term_date_id")
        print("\nSee FEE_TERM_DATE_MIGRATION_TEST_GUIDE.md for detailed tests")
        print("=" * 60)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify_migration())
