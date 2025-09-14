-- Grant all role_management permissions to Admin role in test_tenant_schema
-- This enables testing of the new role management endpoints

-- Get Admin role ID and insert all role_management permissions
DO $$
DECLARE
    admin_role_id UUID;
BEGIN
    -- Get the Admin role ID from test_tenant_schema
    SELECT id INTO admin_role_id FROM test_tenant_schema.roles WHERE name = 'Admin' LIMIT 1;

    IF admin_role_id IS NOT NULL THEN
        -- Insert role_management permissions
        INSERT INTO test_tenant_schema.resource_permissions (role_id, resource, action, is_granted)
        VALUES
            (admin_role_id, 'role_management', 'create', true),
            (admin_role_id, 'role_management', 'read', true),
            (admin_role_id, 'role_management', 'update', true),
            (admin_role_id, 'role_management', 'delete', true),
            (admin_role_id, 'role_management', 'list', true)
        ON CONFLICT (role_id, resource, action)
        DO UPDATE SET is_granted = true;

        RAISE NOTICE 'Added role_management permissions to Admin role: %', admin_role_id;
    ELSE
        RAISE NOTICE 'Admin role not found in test_tenant_schema';
    END IF;
END $$;

-- Verify the permissions were added
SELECT
    r.name as role_name,
    rp.resource,
    rp.action,
    rp.is_granted
FROM test_tenant_schema.roles r
JOIN test_tenant_schema.resource_permissions rp ON r.id = rp.role_id
WHERE r.name = 'Admin' AND rp.resource = 'role_management'
ORDER BY rp.action;