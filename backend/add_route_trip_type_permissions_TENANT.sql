-- ============================================================================
-- Add Route Types and Trip Types Permissions to TENANT SCHEMA
-- ============================================================================
-- IMPORTANT: This script adds permissions to the CURRENT tenant schema,
-- not the public schema. You must connect to your tenant database/schema
-- before running this script.
-- ============================================================================
--
-- Usage:
--   1. Connect to your tenant schema (e.g., SET search_path TO tenant_abc, public;)
--   2. Run this script
--   3. Re-login to your application to get fresh permissions
-- ============================================================================

-- Step 1: Find all roles in the current tenant schema
SELECT '=== Current Tenant Roles ===' AS section;
SELECT id, name, description, is_system_role
FROM roles
ORDER BY name;

-- ============================================================================
-- Step 2: Add permissions for each role that should have access
-- ============================================================================
-- This will grant route_types and trip_types permissions to Admin-like roles

DO $$
DECLARE
    role_record RECORD;
    rows_inserted INTEGER := 0;
BEGIN
    RAISE NOTICE '=== Adding Route Types and Trip Types Permissions ===';

    -- Loop through all admin-type roles (customize this WHERE clause as needed)
    FOR role_record IN
        SELECT id, name
        FROM roles
        WHERE LOWER(name) LIKE '%admin%'
           OR LOWER(name) = 'super_admin'
           OR LOWER(name) = 'administrator'
           OR LOWER(name) = 'transport_admin'  -- Add other role names as needed
    LOOP
        RAISE NOTICE 'Processing role: % (ID: %)', role_record.name, role_record.id;

        -- Insert route_types permissions
        BEGIN
            INSERT INTO resource_permissions (role_id, resource, action, is_granted)
            VALUES
                (role_record.id, 'route_types', 'create', true),
                (role_record.id, 'route_types', 'read', true),
                (role_record.id, 'route_types', 'update', true),
                (role_record.id, 'route_types', 'delete', true),
                (role_record.id, 'route_types', 'list', true)
            ON CONFLICT (role_id, resource, action) DO NOTHING;

            GET DIAGNOSTICS rows_inserted = ROW_COUNT;
            IF rows_inserted > 0 THEN
                RAISE NOTICE '  ✓ Granted route_types permissions to %', role_record.name;
            ELSE
                RAISE NOTICE '  → route_types permissions already exist for %', role_record.name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ✗ Error granting route_types to %: %', role_record.name, SQLERRM;
        END;

        -- Insert trip_types permissions
        BEGIN
            INSERT INTO resource_permissions (role_id, resource, action, is_granted)
            VALUES
                (role_record.id, 'trip_types', 'create', true),
                (role_record.id, 'trip_types', 'read', true),
                (role_record.id, 'trip_types', 'update', true),
                (role_record.id, 'trip_types', 'delete', true),
                (role_record.id, 'trip_types', 'list', true)
            ON CONFLICT (role_id, resource, action) DO NOTHING;

            GET DIAGNOSTICS rows_inserted = ROW_COUNT;
            IF rows_inserted > 0 THEN
                RAISE NOTICE '  ✓ Granted trip_types permissions to %', role_record.name;
            ELSE
                RAISE NOTICE '  → trip_types permissions already exist for %', role_record.name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ✗ Error granting trip_types to %: %', role_record.name, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '=== Permission grant process completed ===';
END $$;

-- ============================================================================
-- Step 3: Verification - Show all route_types and trip_types permissions
-- ============================================================================

SELECT '=== Verification: Route Types & Trip Types Permissions ===' AS section;

SELECT
    r.name as role_name,
    rp.resource,
    rp.action,
    rp.is_granted
FROM resource_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE rp.resource IN ('route_types', 'trip_types')
ORDER BY r.name, rp.resource, rp.action;

-- ============================================================================
-- Step 4: Permission count summary
-- ============================================================================

SELECT '=== Permission Summary ===' AS section;

SELECT
    r.name as role_name,
    COUNT(*) FILTER (WHERE rp.resource = 'route_types') as route_types_permissions,
    COUNT(*) FILTER (WHERE rp.resource = 'trip_types') as trip_types_permissions,
    COUNT(*) as total_permissions
FROM resource_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE rp.resource IN ('route_types', 'trip_types')
GROUP BY r.name
ORDER BY r.name;

-- ============================================================================
-- Step 5: Grant to a SPECIFIC ROLE (if needed)
-- ============================================================================
-- Uncomment and modify this section if you want to grant to a specific role

/*
DO $$
DECLARE
    target_role_id UUID;
    target_role_name VARCHAR := 'Admin';  -- CHANGE THIS to your actual role name
BEGIN
    -- Get the role ID
    SELECT id INTO target_role_id
    FROM roles
    WHERE name = target_role_name
    LIMIT 1;

    IF target_role_id IS NULL THEN
        RAISE NOTICE 'ERROR: Role "%" not found in current tenant schema', target_role_name;
    ELSE
        RAISE NOTICE 'Granting permissions to role: % (ID: %)', target_role_name, target_role_id;

        -- Grant route_types permissions
        INSERT INTO resource_permissions (role_id, resource, action, is_granted)
        VALUES
            (target_role_id, 'route_types', 'create', true),
            (target_role_id, 'route_types', 'read', true),
            (target_role_id, 'route_types', 'update', true),
            (target_role_id, 'route_types', 'delete', true),
            (target_role_id, 'route_types', 'list', true),
            (target_role_id, 'trip_types', 'create', true),
            (target_role_id, 'trip_types', 'read', true),
            (target_role_id, 'trip_types', 'update', true),
            (target_role_id, 'trip_types', 'delete', true),
            (target_role_id, 'trip_types', 'list', true)
        ON CONFLICT (role_id, resource, action) DO NOTHING;

        RAISE NOTICE '✓ Permissions granted successfully!';
        RAISE NOTICE 'IMPORTANT: Logout and login again to activate new permissions';
    END IF;
END $$;
*/

-- ============================================================================
-- Completion Message
-- ============================================================================
SELECT
    '✓ Permissions added to TENANT schema!' AS status,
    'CRITICAL: You MUST logout and login again to get new permissions!' AS next_step;
