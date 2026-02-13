-- ============================================================================
-- Rollback Fee Module Fixes from test_tenant Schema
-- ============================================================================
-- Purpose: Rollback schema changes if something goes wrong
-- Date: 2026-02-08
-- Schema: test_tenant_schema
-- ============================================================================
-- WARNING: This will remove all constraints and changes applied by
--          apply_fixes_to_test_tenant.sql
-- ============================================================================

-- Set search path to test_tenant schema
SET search_path TO test_tenant_schema;

-- ============================================================================
-- ROLLBACK STEP 1: Remove Unique Constraint
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_transactions'
        AND constraint_name = 'uq_fee_transactions_transaction_number'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_transactions
        DROP CONSTRAINT uq_fee_transactions_transaction_number;

        RAISE NOTICE 'Removed unique constraint: uq_fee_transactions_transaction_number';
    ELSE
        RAISE NOTICE 'Unique constraint not found (already removed or never existed)';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK STEP 2: Revert reprint_count to VARCHAR (Optional)
-- ============================================================================
-- WARNING: Only do this if you want to completely revert!
-- This will convert INTEGER back to VARCHAR

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'test_tenant_schema'
        AND table_name = 'fee_receipts'
        AND column_name = 'reprint_count'
        AND data_type = 'integer'
    ) THEN
        -- Convert back to VARCHAR
        ALTER TABLE test_tenant_schema.fee_receipts
        ALTER COLUMN reprint_count TYPE VARCHAR USING reprint_count::varchar;

        RAISE NOTICE 'Converted reprint_count back to VARCHAR';
    ELSE
        RAISE NOTICE 'reprint_count is not INTEGER (no rollback needed)';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK STEP 3: Remove Foreign Key Constraints
-- ============================================================================

-- Remove FK: fee_transaction_items.fee_term_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_transaction_items'
        AND constraint_name = 'fk_fee_transaction_items_fee_term_id'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_transaction_items
        DROP CONSTRAINT fk_fee_transaction_items_fee_term_id;

        RAISE NOTICE 'Removed FK: fk_fee_transaction_items_fee_term_id';
    END IF;
END $$;

-- Remove FK: fee_transaction_items.fee_type_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_transaction_items'
        AND constraint_name = 'fk_fee_transaction_items_fee_type_id'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_transaction_items
        DROP CONSTRAINT fk_fee_transaction_items_fee_type_id;

        RAISE NOTICE 'Removed FK: fk_fee_transaction_items_fee_type_id';
    END IF;
END $$;

-- Remove FK: fee_transaction_items.term_date_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_transaction_items'
        AND constraint_name = 'fk_fee_transaction_items_term_date_id'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_transaction_items
        DROP CONSTRAINT fk_fee_transaction_items_term_date_id;

        RAISE NOTICE 'Removed FK: fk_fee_transaction_items_term_date_id';
    END IF;
END $$;

-- Remove FK: fee_student_map_term_amounts.term_date_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_student_map_term_amounts'
        AND constraint_name = 'fk_fee_student_map_term_amounts_term_date_id'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_student_map_term_amounts
        DROP CONSTRAINT fk_fee_student_map_term_amounts_term_date_id;

        RAISE NOTICE 'Removed FK: fk_fee_student_map_term_amounts_term_date_id';
    END IF;
END $$;

-- Remove FK: fee_class_map_term_amounts.term_date_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_class_map_term_amounts'
        AND constraint_name = 'fk_fee_class_map_term_amounts_term_date_id'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_class_map_term_amounts
        DROP CONSTRAINT fk_fee_class_map_term_amounts_term_date_id;

        RAISE NOTICE 'Removed FK: fk_fee_class_map_term_amounts_term_date_id';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK STEP 4: Clear term_date_id Data (Optional - DANGEROUS!)
-- ============================================================================
-- WARNING: This will set all term_date_id values back to NULL
-- Only do this if you want to completely revert the backfill!
-- Uncomment the following block if you really want to do this:

/*
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    UPDATE test_tenant_schema.fee_class_map_term_amounts
    SET term_date_id = NULL;

    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE 'Cleared term_date_id in fee_class_map_term_amounts: % rows', record_count;

    UPDATE test_tenant_schema.fee_student_map_term_amounts
    SET term_date_id = NULL;

    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE 'Cleared term_date_id in fee_student_map_term_amounts: % rows', record_count;

    UPDATE test_tenant_schema.fee_transaction_items
    SET term_date_id = NULL;

    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE 'Cleared term_date_id in fee_transaction_items: % rows', record_count;
END $$;
*/

-- ============================================================================
-- VERIFICATION: Check rollback status
-- ============================================================================

SELECT 'Rollback verification:' as status;

-- Count remaining foreign keys
SELECT
    COUNT(*) as remaining_fk_constraints
FROM information_schema.table_constraints
WHERE constraint_schema = 'test_tenant_schema'
AND constraint_type = 'FOREIGN KEY'
AND constraint_name LIKE '%term_date_id%';
-- Should be 0 after rollback

-- Check reprint_count type
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'test_tenant_schema'
AND table_name = 'fee_receipts'
AND column_name = 'reprint_count';

-- Check unique constraint
SELECT
    COUNT(*) as has_unique_constraint
FROM information_schema.table_constraints
WHERE constraint_schema = 'test_tenant_schema'
AND table_name = 'fee_transactions'
AND constraint_name = 'uq_fee_transactions_transaction_number';
-- Should be 0 after rollback

-- ============================================================================
-- END OF ROLLBACK SCRIPT
-- ============================================================================

RAISE NOTICE '========================================';
RAISE NOTICE 'ROLLBACK COMPLETE';
RAISE NOTICE 'Check verification output above';
RAISE NOTICE '========================================';
