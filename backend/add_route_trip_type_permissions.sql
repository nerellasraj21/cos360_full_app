-- ============================================================================
-- Add Permissions for Route Types and Trip Types
-- ============================================================================
-- This script adds the necessary permissions for the new route_types and
-- trip_types endpoints to the public schema (shared across all tenants)
-- ============================================================================

-- Step 1: Add resource permissions to public.resource_permissions table
-- ============================================================================

INSERT INTO public.resource_permissions (resource_name, action, description, created_at, updated_at)
VALUES
    -- Route Types Permissions
    ('route_types', 'create', 'Create route types', NOW(), NOW()),
    ('route_types', 'read', 'Read route type details', NOW(), NOW()),
    ('route_types', 'update', 'Update route types', NOW(), NOW()),
    ('route_types', 'delete', 'Delete/deactivate route types', NOW(), NOW()),
    ('route_types', 'list', 'List and view all route types', NOW(), NOW()),

    -- Trip Types Permissions
    ('trip_types', 'create', 'Create trip types', NOW(), NOW()),
    ('trip_types', 'read', 'Read trip type details', NOW(), NOW()),
    ('trip_types', 'update', 'Update trip types', NOW(), NOW()),
    ('trip_types', 'delete', 'Delete/deactivate trip types', NOW(), NOW()),
    ('trip_types', 'list', 'List and view all trip types', NOW(), NOW())
ON CONFLICT (resource_name, action) DO NOTHING;

-- Verify resource permissions were added
SELECT 'Resource Permissions Added:' AS status;
SELECT resource_name, action, description
FROM public.resource_permissions
WHERE resource_name IN ('route_types', 'trip_types')
ORDER BY resource_name, action;

-- ============================================================================
-- Step 2: Grant permissions to admin roles
-- ============================================================================

-- This grants permissions to all roles that contain 'admin' in their name
DO $$
DECLARE
    admin_role_record RECORD;
    permission_record RECORD;
    rows_inserted INTEGER := 0;
BEGIN
    -- Loop through all admin-type roles
    FOR admin_role_record IN
        SELECT id, role_name FROM public.roles
        WHERE LOWER(role_name) LIKE '%admin%'
        OR LOWER(role_name) = 'super_admin'
        OR LOWER(role_name) = 'administrator'
    LOOP
        RAISE NOTICE 'Processing role: % (ID: %)', admin_role_record.role_name, admin_role_record.id;

        -- Grant all route_types and trip_types permissions to this role
        FOR permission_record IN
            SELECT resource_name, action
            FROM public.resource_permissions
            WHERE resource_name IN ('route_types', 'trip_types')
        LOOP
            BEGIN
                INSERT INTO public.role_resource_permissions
                    (role_id, resource_name, action_name, created_at, updated_at)
                VALUES
                    (admin_role_record.id, permission_record.resource_name,
                     permission_record.action, NOW(), NOW())
                ON CONFLICT (role_id, resource_name, action_name) DO NOTHING;

                GET DIAGNOSTICS rows_inserted = ROW_COUNT;
                IF rows_inserted > 0 THEN
                    RAISE NOTICE '  → Granted %.% to role %',
                        permission_record.resource_name,
                        permission_record.action,
                        admin_role_record.role_name;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '  ✗ Failed to grant %.% to role %: %',
                    permission_record.resource_name,
                    permission_record.action,
                    admin_role_record.role_name,
                    SQLERRM;
            END;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Permission grant process completed';
END $$;

-- ============================================================================
-- Step 3: Verification Queries
-- ============================================================================

-- Show all roles that now have route_types and trip_types permissions
SELECT
    '=== Granted Permissions Summary ===' AS section;

SELECT
    r.role_name,
    rrp.resource_name,
    rrp.action_name,
    rrp.created_at
FROM public.role_resource_permissions rrp
JOIN public.roles r ON r.id = rrp.role_id
WHERE rrp.resource_name IN ('route_types', 'trip_types')
ORDER BY r.role_name, rrp.resource_name, rrp.action_name;

-- Count permissions by role
SELECT
    '=== Permission Count by Role ===' AS section;

SELECT
    r.role_name,
    COUNT(*) as permission_count
FROM public.role_resource_permissions rrp
JOIN public.roles r ON r.id = rrp.role_id
WHERE rrp.resource_name IN ('route_types', 'trip_types')
GROUP BY r.role_name
ORDER BY permission_count DESC, r.role_name;

-- ============================================================================
-- Optional: Grant to specific role by name
-- ============================================================================
-- If you need to grant to a specific role, uncomment and modify this:

/*
DO $$
DECLARE
    target_role_id UUID;
BEGIN
    -- Replace 'YourRoleName' with your actual role name
    SELECT id INTO target_role_id
    FROM public.roles
    WHERE role_name = 'YourRoleName'
    LIMIT 1;

    IF target_role_id IS NULL THEN
        RAISE NOTICE 'Role not found';
    ELSE
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

        RAISE NOTICE 'Permissions granted to role: %', target_role_id;
    END IF;
END $$;
*/

-- ============================================================================
-- Completion Message
-- ============================================================================
SELECT
    '✓ Permissions setup complete!' AS status,
    'Please refresh your browser or re-login to activate new permissions' AS next_step;
