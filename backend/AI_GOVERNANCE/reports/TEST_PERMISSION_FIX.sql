-- ============================================================================
-- TESTING SCRIPT: Validate Permission Fix
-- ============================================================================
-- Run this BEFORE and AFTER executing the fix to see the difference
-- ============================================================================

-- ============================================================================
-- TEST 1: Check if Admin role exists
-- ============================================================================
SELECT
    'TEST 1: Admin Role Exists' as test_name,
    CASE
        WHEN COUNT(*) > 0 THEN '✓ PASS - Admin role found'
        ELSE '✗ FAIL - Admin role NOT found'
    END as result,
    id as admin_role_id,
    name as role_name,
    created_at
FROM roles
WHERE name = 'Admin'
GROUP BY id, name, created_at;

-- ============================================================================
-- TEST 2: Check current fee_class_mapping_term_amounts permissions
-- ============================================================================
SELECT
    'TEST 2: Current Permissions' as test_name,
    COUNT(*) as permission_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✗ NO PERMISSIONS FOUND (This is the problem!)'
        WHEN COUNT(*) = 5 THEN '✓ ALL 5 PERMISSIONS EXIST'
        ELSE CONCAT('⚠ PARTIAL: Only ', COUNT(*), ' of 5 permissions exist')
    END as status
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'Admin'
  AND rp.resource = 'fee_class_mapping_term_amounts';

-- ============================================================================
-- TEST 3: List all existing fee_class_mapping_term_amounts permissions
-- ============================================================================
SELECT
    'TEST 3: Permission Details' as test_name,
    r.name as role_name,
    rp.resource,
    rp.action,
    rp.is_granted,
    rp.created_at,
    rp.updated_at
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE rp.resource = 'fee_class_mapping_term_amounts'
ORDER BY rp.action;

-- ============================================================================
-- TEST 4: Check which actions are missing
-- ============================================================================
WITH expected_actions AS (
    SELECT unnest(ARRAY['create', 'read', 'update', 'delete', 'list']) as action
),
existing_permissions AS (
    SELECT DISTINCT rp.action
    FROM resource_permissions rp
    JOIN roles r ON rp.role_id = r.id
    WHERE r.name = 'Admin'
      AND rp.resource = 'fee_class_mapping_term_amounts'
)
SELECT
    'TEST 4: Missing Actions' as test_name,
    ea.action as missing_action,
    CASE
        WHEN ep.action IS NULL THEN '✗ MISSING - Need to add this'
        ELSE '✓ EXISTS'
    END as status
FROM expected_actions ea
LEFT JOIN existing_permissions ep ON ea.action = ep.action
ORDER BY ea.action;

-- ============================================================================
-- TEST 5: Check other fee-related permissions for comparison
-- ============================================================================
SELECT
    'TEST 5: Other Fee Permissions' as test_name,
    rp.resource,
    COUNT(*) as action_count,
    STRING_AGG(rp.action, ', ' ORDER BY rp.action) as actions
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'Admin'
  AND rp.resource LIKE 'fee_%'
GROUP BY rp.resource
ORDER BY rp.resource;

-- ============================================================================
-- TEST 6: Verify the specific 'create' permission
-- ============================================================================
SELECT
    'TEST 6: Create Permission Check' as test_name,
    CASE
        WHEN COUNT(*) > 0 AND BOOL_AND(rp.is_granted) THEN '✓ PASS - Create permission exists and is granted'
        WHEN COUNT(*) > 0 AND NOT BOOL_AND(rp.is_granted) THEN '✗ FAIL - Create permission exists but is_granted = false'
        ELSE '✗ FAIL - Create permission does NOT exist (This causes 403 error!)'
    END as result
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'Admin'
  AND rp.resource = 'fee_class_mapping_term_amounts'
  AND rp.action = 'create';

-- ============================================================================
-- TEST 7: Check your user's role assignment
-- ============================================================================
-- Replace 'your_email@example.com' with your actual email
SELECT
    'TEST 7: Your User Role' as test_name,
    u.username,
    u.email,
    r.name as your_role,
    CASE
        WHEN r.name = 'Admin' THEN '✓ You have Admin role'
        ELSE '⚠ WARNING - You are not Admin! Permissions were added to Admin role.'
    END as validation
FROM users u
JOIN roles r ON u.role_id = r.id
-- WHERE u.email = 'your_email@example.com'  -- Uncomment and replace with your email
LIMIT 5;  -- Shows first 5 users if email filter is commented

-- ============================================================================
-- TEST 8: Summary Report
-- ============================================================================
SELECT
    'TEST 8: SUMMARY REPORT' as test_name,
    (SELECT COUNT(*) FROM roles WHERE name = 'Admin') as admin_role_exists,
    (SELECT COUNT(*) FROM resource_permissions rp
     JOIN roles r ON rp.role_id = r.id
     WHERE r.name = 'Admin' AND rp.resource = 'fee_class_mapping_term_amounts') as current_permissions,
    CASE
        WHEN (SELECT COUNT(*) FROM resource_permissions rp
              JOIN roles r ON rp.role_id = r.id
              WHERE r.name = 'Admin'
                AND rp.resource = 'fee_class_mapping_term_amounts'
                AND rp.action = 'create'
                AND rp.is_granted = true) > 0
        THEN '✓ READY - Create permission exists'
        ELSE '✗ NOT READY - Run the fix script!'
    END as fix_status;

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run this entire script BEFORE applying the fix
--    - Note the results, especially TEST 6 (should show FAIL)
--
-- 2. Run the fix script: EXECUTE_NOW_FIX_TERM_AMOUNTS.sql
--
-- 3. Run this test script AGAIN
--    - TEST 6 should now show PASS
--    - TEST 2 should show "ALL 5 PERMISSIONS EXIST"
--    - TEST 4 should show all actions as "EXISTS"
--
-- 4. If all tests pass, log out and log back in
--
-- 5. Test the "Save Term Amounts" button
-- ============================================================================
