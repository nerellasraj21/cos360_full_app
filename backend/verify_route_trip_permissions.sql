-- ============================================================================
-- Verify Route Types and Trip Types Permissions
-- ============================================================================
-- Run this script to diagnose permission issues causing 403 Forbidden errors
-- ============================================================================

-- Step 1: Check if resource_permissions exist for route_types and trip_types
SELECT
    '=== Step 1: Check Resource Permissions ===' AS section;

SELECT
    resource_name,
    action,
    description,
    created_at
FROM public.resource_permissions
WHERE resource_name IN ('route_types', 'trip_types')
ORDER BY resource_name, action;

-- Expected: 10 rows (5 for route_types, 5 for trip_types)
-- If you see 0 rows, the add_route_trip_type_permissions.sql script was not run

-- ============================================================================
-- Step 2: Check all roles in the system
SELECT
    '=== Step 2: All Roles in System ===' AS section;

SELECT
    id,
    role_name,
    created_at
FROM public.roles
ORDER BY role_name;

-- ============================================================================
-- Step 3: Check which roles have route_types and trip_types permissions
SELECT
    '=== Step 3: Roles with Route/Trip Type Permissions ===' AS section;

SELECT
    r.role_name,
    rrp.resource_name,
    rrp.action_name,
    rrp.created_at
FROM public.role_resource_permissions rrp
JOIN public.roles r ON r.id = rrp.role_id
WHERE rrp.resource_name IN ('route_types', 'trip_types')
ORDER BY r.role_name, rrp.resource_name, rrp.action_name;

-- If you see 0 rows, permissions were not granted to any roles

-- ============================================================================
-- Step 4: Find YOUR role name (replace 'your_email@example.com' with your actual email)
SELECT
    '=== Step 4: Find Your User and Role ===' AS section;

-- Uncomment and replace with your actual email:
-- SELECT
--     u.email,
--     u.username,
--     r.role_name,
--     u.is_active
-- FROM users u
-- LEFT JOIN public.roles r ON r.id = u.role_id
-- WHERE u.email = 'your_email@example.com';

-- ============================================================================
-- Step 5: Check if YOUR role has the required permissions
-- (Replace 'YourRoleName' with your actual role from Step 4)
SELECT
    '=== Step 5: Check Your Role Permissions ===' AS section;

-- Uncomment and replace with your actual role name:
-- SELECT
--     r.role_name,
--     rrp.resource_name,
--     rrp.action_name
-- FROM public.role_resource_permissions rrp
-- JOIN public.roles r ON r.id = rrp.role_id
-- WHERE r.role_name = 'YourRoleName'
--     AND rrp.resource_name IN ('route_types', 'trip_types')
-- ORDER BY rrp.resource_name, rrp.action_name;

-- Expected: 10 rows if your role has all permissions
-- If 0 rows, your role doesn't have these permissions

-- ============================================================================
-- Step 6: Quick fix - Grant permissions to a specific role
-- ============================================================================
-- Uncomment and run this if your role is missing permissions:

/*
DO $$
DECLARE
    target_role_id UUID;
    target_role_name VARCHAR := 'YourRoleName'; -- REPLACE THIS
BEGIN
    -- Get the role ID
    SELECT id INTO target_role_id
    FROM public.roles
    WHERE role_name = target_role_name
    LIMIT 1;

    IF target_role_id IS NULL THEN
        RAISE NOTICE 'ERROR: Role "%" not found', target_role_name;
    ELSE
        RAISE NOTICE 'Granting permissions to role: % (ID: %)', target_role_name, target_role_id;

        -- Grant all route_types and trip_types permissions
        INSERT INTO public.role_resource_permissions (role_id, resource_name, action_name, created_at, updated_at)
        SELECT
            target_role_id,
            rp.resource_name,
            rp.action,
            NOW(),
            NOW()
        FROM public.resource_permissions rp
        WHERE rp.resource_name IN ('route_types', 'trip_types')
        ON CONFLICT (role_id, resource_name, action_name) DO NOTHING;

        RAISE NOTICE 'Permissions granted successfully!';
        RAISE NOTICE 'Please refresh your browser or re-login to activate new permissions';
    END IF;
END $$;
*/

-- ============================================================================
-- Step 7: Verification Summary
-- ============================================================================
SELECT
    '=== Step 7: Summary ===' AS section;

SELECT
    COUNT(DISTINCT resource_name) as resources_count,
    COUNT(*) as total_permissions
FROM public.resource_permissions
WHERE resource_name IN ('route_types', 'trip_types');

SELECT
    COUNT(DISTINCT r.role_name) as roles_with_permissions,
    COUNT(*) as total_grants
FROM public.role_resource_permissions rrp
JOIN public.roles r ON r.id = rrp.role_id
WHERE rrp.resource_name IN ('route_types', 'trip_types');
