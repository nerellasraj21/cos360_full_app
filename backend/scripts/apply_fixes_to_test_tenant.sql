-- ============================================================================
-- Apply Fee Module Fixes to test_tenant Schema
-- ============================================================================
-- Purpose: Apply schema changes and fixes directly to test_tenant schema
--          WITHOUT using Alembic migrations
-- Date: 2026-02-08
-- Schema: test_tenant_schema
-- ============================================================================

-- Set search path to test_tenant schema
SET search_path TO test_tenant_schema;

-- ============================================================================
-- SECTION 1: VERIFICATION QUERIES (Run these first to see current state)
-- ============================================================================

-- Check 1: Verify term_date_id column exists
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'test_tenant_schema'
AND table_name IN ('fee_class_map_term_amounts', 'fee_student_map_term_amounts', 'fee_transaction_items')
AND column_name = 'term_date_id';

-- Check 2: Count NULL term_date_id values (need backfill)
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
WHERE term_date_id IS NULL;

-- Check 3: Verify existing foreign keys
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'test_tenant_schema'
AND tc.table_name IN ('fee_class_map_term_amounts', 'fee_student_map_term_amounts', 'fee_transaction_items', 'fee_receipts')
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- Check 4: Check reprint_count data type
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'test_tenant_schema'
AND table_name = 'fee_receipts'
AND column_name = 'reprint_count';

-- Check 5: Check for unique constraint on transaction_number
SELECT
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc
WHERE tc.table_schema = 'test_tenant_schema'
AND tc.table_name = 'fee_transactions'
AND tc.constraint_name LIKE '%transaction_number%';

-- ============================================================================
-- SECTION 2: BACKFILL term_date_id (If NULL values exist)
-- ============================================================================
-- Run this ONLY if NULL values were found in Check 2 above

-- Backfill fee_class_map_term_amounts
-- Strategy: Use the first term_date for each term_id
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    -- Update records where term_date_id is NULL
    WITH first_term_dates AS (
        SELECT DISTINCT ON (term_id)
            term_id,
            id as term_date_id
        FROM test_tenant_schema.fee_term_dates
        ORDER BY term_id, fee_term_date
    )
    UPDATE test_tenant_schema.fee_class_map_term_amounts fcmta
    SET term_date_id = ftd.term_date_id
    FROM first_term_dates ftd
    WHERE fcmta.term_id = ftd.term_id
    AND fcmta.term_date_id IS NULL;

    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE 'Backfilled % records in fee_class_map_term_amounts', record_count;
END $$;

-- Backfill fee_student_map_term_amounts
DO $$
DECLARE
    record_count INTEGER;
BEGIN
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
    AND fsmta.term_date_id IS NULL;

    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE 'Backfilled % records in fee_student_map_term_amounts', record_count;
END $$;

-- Backfill fee_transaction_items
DO $$
DECLARE
    record_count INTEGER;
BEGIN
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
    AND fti.term_date_id IS NULL;

    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE 'Backfilled % records in fee_transaction_items', record_count;
END $$;

-- Verify backfill
SELECT
    'fee_class_map_term_amounts' as table_name,
    COUNT(*) as remaining_nulls
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
WHERE term_date_id IS NULL;
-- Should all be 0

-- ============================================================================
-- SECTION 3: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add FK for fee_class_map_term_amounts.term_date_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_class_map_term_amounts'
        AND constraint_name = 'fk_fee_class_map_term_amounts_term_date_id'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_class_map_term_amounts
        ADD CONSTRAINT fk_fee_class_map_term_amounts_term_date_id
        FOREIGN KEY (term_date_id)
        REFERENCES test_tenant_schema.fee_term_dates(id)
        ON DELETE RESTRICT;

        RAISE NOTICE 'Added FK constraint: fk_fee_class_map_term_amounts_term_date_id';
    ELSE
        RAISE NOTICE 'FK constraint already exists: fk_fee_class_map_term_amounts_term_date_id';
    END IF;
END $$;

-- Add FK for fee_student_map_term_amounts.term_date_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_student_map_term_amounts'
        AND constraint_name = 'fk_fee_student_map_term_amounts_term_date_id'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_student_map_term_amounts
        ADD CONSTRAINT fk_fee_student_map_term_amounts_term_date_id
        FOREIGN KEY (term_date_id)
        REFERENCES test_tenant_schema.fee_term_dates(id)
        ON DELETE RESTRICT;

        RAISE NOTICE 'Added FK constraint: fk_fee_student_map_term_amounts_term_date_id';
    ELSE
        RAISE NOTICE 'FK constraint already exists: fk_fee_student_map_term_amounts_term_date_id';
    END IF;
END $$;

-- Add FK for fee_transaction_items.term_date_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_transaction_items'
        AND constraint_name = 'fk_fee_transaction_items_term_date_id'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_transaction_items
        ADD CONSTRAINT fk_fee_transaction_items_term_date_id
        FOREIGN KEY (term_date_id)
        REFERENCES test_tenant_schema.fee_term_dates(id)
        ON DELETE RESTRICT;

        RAISE NOTICE 'Added FK constraint: fk_fee_transaction_items_term_date_id';
    ELSE
        RAISE NOTICE 'FK constraint already exists: fk_fee_transaction_items_term_date_id';
    END IF;
END $$;

-- Add FK for fee_transaction_items.fee_type_id
DO $$
BEGIN
    -- First, clean up any orphaned records
    DELETE FROM test_tenant_schema.fee_transaction_items
    WHERE fee_type_id NOT IN (SELECT id FROM test_tenant_schema.fee_types);

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_transaction_items'
        AND constraint_name = 'fk_fee_transaction_items_fee_type_id'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_transaction_items
        ADD CONSTRAINT fk_fee_transaction_items_fee_type_id
        FOREIGN KEY (fee_type_id)
        REFERENCES test_tenant_schema.fee_types(id)
        ON DELETE RESTRICT;

        RAISE NOTICE 'Added FK constraint: fk_fee_transaction_items_fee_type_id';
    ELSE
        RAISE NOTICE 'FK constraint already exists: fk_fee_transaction_items_fee_type_id';
    END IF;
END $$;

-- Add FK for fee_transaction_items.fee_term_id
DO $$
BEGIN
    -- Clean up orphaned records
    DELETE FROM test_tenant_schema.fee_transaction_items
    WHERE fee_term_id NOT IN (SELECT id FROM test_tenant_schema.fee_terms);

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_transaction_items'
        AND constraint_name = 'fk_fee_transaction_items_fee_term_id'
    ) THEN
        ALTER TABLE test_tenant_schema.fee_transaction_items
        ADD CONSTRAINT fk_fee_transaction_items_fee_term_id
        FOREIGN KEY (fee_term_id)
        REFERENCES test_tenant_schema.fee_terms(id)
        ON DELETE RESTRICT;

        RAISE NOTICE 'Added FK constraint: fk_fee_transaction_items_fee_term_id';
    ELSE
        RAISE NOTICE 'FK constraint already exists: fk_fee_transaction_items_fee_term_id';
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: FIX reprint_count DATA TYPE
-- ============================================================================

DO $$
BEGIN
    -- Check current data type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'test_tenant_schema'
        AND table_name = 'fee_receipts'
        AND column_name = 'reprint_count'
        AND data_type IN ('character varying', 'text', 'varchar')
    ) THEN
        -- Convert string values to integer (clean up any non-numeric values first)
        UPDATE test_tenant_schema.fee_receipts
        SET reprint_count = '0'
        WHERE reprint_count !~ '^[0-9]+$' OR reprint_count IS NULL;

        -- Change column type
        ALTER TABLE test_tenant_schema.fee_receipts
        ALTER COLUMN reprint_count TYPE INTEGER USING reprint_count::integer;

        RAISE NOTICE 'Changed reprint_count from VARCHAR to INTEGER';
    ELSE
        RAISE NOTICE 'reprint_count is already INTEGER type';
    END IF;
END $$;

-- ============================================================================
-- SECTION 5: ADD UNIQUE CONSTRAINT ON transaction_number
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'test_tenant_schema'
        AND table_name = 'fee_transactions'
        AND constraint_name = 'uq_fee_transactions_transaction_number'
    ) THEN
        -- Check for duplicates first
        IF EXISTS (
            SELECT transaction_number
            FROM test_tenant_schema.fee_transactions
            GROUP BY transaction_number
            HAVING COUNT(*) > 1
        ) THEN
            RAISE NOTICE 'WARNING: Duplicate transaction numbers exist! Fix manually before adding constraint.';
            RAISE NOTICE 'Run this query to find duplicates:';
            RAISE NOTICE 'SELECT transaction_number, COUNT(*) FROM test_tenant_schema.fee_transactions GROUP BY transaction_number HAVING COUNT(*) > 1';
        ELSE
            ALTER TABLE test_tenant_schema.fee_transactions
            ADD CONSTRAINT uq_fee_transactions_transaction_number
            UNIQUE (transaction_number);

            RAISE NOTICE 'Added unique constraint: uq_fee_transactions_transaction_number';
        END IF;
    ELSE
        RAISE NOTICE 'Unique constraint already exists: uq_fee_transactions_transaction_number';
    END IF;
END $$;

-- ============================================================================
-- SECTION 6: VERIFICATION (Run after all changes)
-- ============================================================================

-- Verify all foreign keys were added
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'test_tenant_schema'
AND tc.table_name IN (
    'fee_class_map_term_amounts',
    'fee_student_map_term_amounts',
    'fee_transaction_items',
    'fee_receipts',
    'fee_transactions'
)
AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Verify reprint_count is now INTEGER
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'test_tenant_schema'
AND table_name = 'fee_receipts'
AND column_name = 'reprint_count';

-- Final summary
DO $$
DECLARE
    fk_count INTEGER;
    null_count INTEGER;
BEGIN
    -- Count foreign keys
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'test_tenant_schema'
    AND table_name IN ('fee_class_map_term_amounts', 'fee_student_map_term_amounts', 'fee_transaction_items')
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%term_date_id%';

    -- Count remaining NULLs
    SELECT
        (SELECT COUNT(*) FROM test_tenant_schema.fee_class_map_term_amounts WHERE term_date_id IS NULL) +
        (SELECT COUNT(*) FROM test_tenant_schema.fee_student_map_term_amounts WHERE term_date_id IS NULL) +
        (SELECT COUNT(*) FROM test_tenant_schema.fee_transaction_items WHERE term_date_id IS NULL)
    INTO null_count;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Foreign keys for term_date_id: %', fk_count;
    RAISE NOTICE 'Remaining NULL term_date_id: %', null_count;
    RAISE NOTICE '========================================';

    IF fk_count >= 3 AND null_count = 0 THEN
        RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
    ELSE
        RAISE NOTICE '⚠️ SOME ISSUES REMAIN - CHECK OUTPUT ABOVE';
    END IF;
END $$;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
