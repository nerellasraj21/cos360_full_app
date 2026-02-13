-- ============================================================================
-- Add Route Types and Trip Types Permissions to test_tenant Schema
-- Quick fix for 403 Forbidden errors
-- ============================================================================

-- Set search path to test_tenant_schema
SET search_path TO test_tenant_schema, public;

-- Step 1: Find the Admin role ID
DO $$
DECLARE
    admin_role_id UUID;
    rows_added INTEGER;
BEGIN
    -- Get Admin role ID
    SELECT id INTO admin_role_id
    FROM roles
    WHERE name = 'Admin'
    LIMIT 1;

    IF admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Admin role not found in test_tenant_schema schema!';
    END IF;

    RAISE NOTICE 'Found Admin role: %', admin_role_id;

    -- Delete existing permissions first (to avoid duplicates)
    DELETE FROM resource_permissions
    WHERE role_id = admin_role_id
      AND resource IN ('route_types', 'trip_types');

    -- Insert route_types permissions
    INSERT INTO resource_permissions (role_id, resource, action, is_granted)
    VALUES
        (admin_role_id, 'route_types', 'create', true),
        (admin_role_id, 'route_types', 'read', true),
        (admin_role_id, 'route_types', 'update', true),
        (admin_role_id, 'route_types', 'delete', true),
        (admin_role_id, 'route_types', 'list', true);

    GET DIAGNOSTICS rows_added = ROW_COUNT;
    RAISE NOTICE 'Added % route_types permissions', rows_added;

    -- Insert trip_types permissions
    INSERT INTO resource_permissions (role_id, resource, action, is_granted)
    VALUES
        (admin_role_id, 'trip_types', 'create', true),
        (admin_role_id, 'trip_types', 'read', true),
        (admin_role_id, 'trip_types', 'update', true),
        (admin_role_id, 'trip_types', 'delete', true),
        (admin_role_id, 'trip_types', 'list', true);

    GET DIAGNOSTICS rows_added = ROW_COUNT;
    RAISE NOTICE 'Added % trip_types permissions', rows_added;

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'SUCCESS: Permissions added for Admin role!';
    RAISE NOTICE 'IMPORTANT: Logout and login again to activate permissions!';
    RAISE NOTICE '============================================================';
END $$;

-- Verify permissions were added
SELECT
    'Verification - Admin Permissions' AS status,
    r.name AS role_name,
    rp.resource,
    rp.action,
    rp.is_granted
FROM resource_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE rp.resource IN ('route_types', 'trip_types')
  AND r.name = 'Admin'
ORDER BY rp.resource, rp.action;
