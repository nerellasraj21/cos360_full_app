"""
Apply Database Fixes to test_tenant Schema
NO ALEMBIC MIGRATIONS - Direct SQL only
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Database URL from .env
DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_3BRCMxJ8aKdN@ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech/neondb?ssl=require"

async def apply_fixes():
    """Apply all fixes to test_tenant schema"""
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("=" * 80)
    print("APPLYING FIXES TO test_tenant_schema")
    print("NO ALEMBIC MIGRATIONS - Direct SQL only")
    print("=" * 80)

    async with AsyncSessionLocal() as db:
        try:
            # FIX 1: Backfill term_date_id in fee_student_map_term_amounts
            print("\n1. Backfilling term_date_id in fee_student_map_term_amounts...")
            result = await db.execute(text("""
                WITH first_term_dates AS (
                    SELECT DISTINCT ON (term_id)
                        term_id,
                        id as term_date_id
                    FROM test_tenant_schema.fee_term_dates
                    ORDER BY term_id, fee_term_date
                )
                UPDATE test_tenant_schema.fee_student_map_term_amounts fsmta
                SET term_date_id = ftd.term_date_id
                FROM first_term_dates ftd
                WHERE fsmta.term_id = ftd.term_id
                AND fsmta.term_date_id IS NULL
            """))
            await db.commit()
            print(f"   Updated {result.rowcount} rows")

            # FIX 2: Backfill term_date_id in fee_transaction_items
            print("\n2. Backfilling term_date_id in fee_transaction_items...")
            result = await db.execute(text("""
                WITH first_term_dates AS (
                    SELECT DISTINCT ON (term_id)
                        term_id,
                        id as term_date_id
                    FROM test_tenant_schema.fee_term_dates
                    ORDER BY term_id, fee_term_date
                )
                UPDATE test_tenant_schema.fee_transaction_items fti
                SET term_date_id = ftd.term_date_id
                FROM first_term_dates ftd
                WHERE fti.fee_term_id = ftd.term_id
                AND fti.term_date_id IS NULL
            """))
            await db.commit()
            print(f"   Updated {result.rowcount} rows")

            # FIX 3: Add FK constraint on fee_class_map_term_amounts.term_date_id
            print("\n3. Adding FK constraint: fee_class_map_term_amounts.term_date_id...")
            try:
                await db.execute(text("""
                    ALTER TABLE test_tenant_schema.fee_class_map_term_amounts
                    ADD CONSTRAINT fk_fee_class_map_term_amounts_term_date_id
                    FOREIGN KEY (term_date_id)
                    REFERENCES test_tenant_schema.fee_term_dates(id)
                    ON DELETE RESTRICT
                """))
                await db.commit()
                print("   Added successfully")
            except Exception as e:
                if "already exists" in str(e):
                    print("   Already exists (skipped)")
                    await db.rollback()
                else:
                    raise

            # FIX 4: Add FK constraint on fee_student_map_term_amounts.term_date_id
            print("\n4. Adding FK constraint: fee_student_map_term_amounts.term_date_id...")
            try:
                await db.execute(text("""
                    ALTER TABLE test_tenant_schema.fee_student_map_term_amounts
                    ADD CONSTRAINT fk_fee_student_map_term_amounts_term_date_id
                    FOREIGN KEY (term_date_id)
                    REFERENCES test_tenant_schema.fee_term_dates(id)
                    ON DELETE RESTRICT
                """))
                await db.commit()
                print("   Added successfully")
            except Exception as e:
                if "already exists" in str(e):
                    print("   Already exists (skipped)")
                    await db.rollback()
                else:
                    raise

            # FIX 5: Add FK constraint on fee_transaction_items.term_date_id
            print("\n5. Adding FK constraint: fee_transaction_items.term_date_id...")
            try:
                await db.execute(text("""
                    ALTER TABLE test_tenant_schema.fee_transaction_items
                    ADD CONSTRAINT fk_fee_transaction_items_term_date_id
                    FOREIGN KEY (term_date_id)
                    REFERENCES test_tenant_schema.fee_term_dates(id)
                    ON DELETE RESTRICT
                """))
                await db.commit()
                print("   Added successfully")
            except Exception as e:
                if "already exists" in str(e):
                    print("   Already exists (skipped)")
                    await db.rollback()
                else:
                    raise

            # FIX 6: Add FK constraint on fee_transaction_items.fee_type_id
            print("\n6. Adding FK constraint: fee_transaction_items.fee_type_id...")
            try:
                # Clean orphaned records first
                result = await db.execute(text("""
                    DELETE FROM test_tenant_schema.fee_transaction_items
                    WHERE fee_type_id NOT IN (SELECT id FROM test_tenant_schema.fee_types)
                """))
                if result.rowcount > 0:
                    print(f"   Cleaned {result.rowcount} orphaned records")
                    await db.commit()

                await db.execute(text("""
                    ALTER TABLE test_tenant_schema.fee_transaction_items
                    ADD CONSTRAINT fk_fee_transaction_items_fee_type_id
                    FOREIGN KEY (fee_type_id)
                    REFERENCES test_tenant_schema.fee_types(id)
                    ON DELETE RESTRICT
                """))
                await db.commit()
                print("   Added successfully")
            except Exception as e:
                if "already exists" in str(e):
                    print("   Already exists (skipped)")
                    await db.rollback()
                else:
                    raise

            # FIX 7: Add FK constraint on fee_transaction_items.fee_term_id
            print("\n7. Adding FK constraint: fee_transaction_items.fee_term_id...")
            try:
                # Clean orphaned records first
                result = await db.execute(text("""
                    DELETE FROM test_tenant_schema.fee_transaction_items
                    WHERE fee_term_id NOT IN (SELECT id FROM test_tenant_schema.fee_terms)
                """))
                if result.rowcount > 0:
                    print(f"   Cleaned {result.rowcount} orphaned records")
                    await db.commit()

                await db.execute(text("""
                    ALTER TABLE test_tenant_schema.fee_transaction_items
                    ADD CONSTRAINT fk_fee_transaction_items_fee_term_id
                    FOREIGN KEY (fee_term_id)
                    REFERENCES test_tenant_schema.fee_terms(id)
                    ON DELETE RESTRICT
                """))
                await db.commit()
                print("   Added successfully")
            except Exception as e:
                if "already exists" in str(e):
                    print("   Already exists (skipped)")
                    await db.rollback()
                else:
                    raise

            # FIX 8: Fix reprint_count data type
            print("\n8. Fixing reprint_count data type (VARCHAR -> INTEGER)...")
            try:
                # Clean non-numeric values first
                await db.execute(text("""
                    UPDATE test_tenant_schema.fee_receipts
                    SET reprint_count = '0'
                    WHERE reprint_count !~ '^[0-9]+$' OR reprint_count IS NULL
                """))
                await db.commit()

                await db.execute(text("""
                    ALTER TABLE test_tenant_schema.fee_receipts
                    ALTER COLUMN reprint_count TYPE INTEGER USING reprint_count::integer
                """))
                await db.commit()
                print("   Changed to INTEGER successfully")
            except Exception as e:
                if "integer" in str(e):
                    print("   Already INTEGER type (skipped)")
                    await db.rollback()
                else:
                    raise

            # FIX 9: Add unique constraint on transaction_number
            print("\n9. Adding unique constraint on transaction_number...")
            try:
                await db.execute(text("""
                    ALTER TABLE test_tenant_schema.fee_transactions
                    ADD CONSTRAINT uq_fee_transactions_transaction_number
                    UNIQUE (transaction_number)
                """))
                await db.commit()
                print("   Added successfully")
            except Exception as e:
                if "already exists" in str(e):
                    print("   Already exists (skipped)")
                    await db.rollback()
                elif "duplicate" in str(e).lower():
                    print("   FAILED - Duplicate transaction numbers exist!")
                    print("   Fix duplicates manually before adding constraint")
                    await db.rollback()
                else:
                    raise

            print("\n" + "=" * 80)
            print("ALL FIXES APPLIED SUCCESSFULLY!")
            print("=" * 80)

        except Exception as e:
            print(f"\nERROR: {str(e)}")
            await db.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(apply_fixes())
