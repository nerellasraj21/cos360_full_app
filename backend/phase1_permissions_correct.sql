-- ============================================================================
-- PHASE 1 FEE TRANSACTION PERMISSIONS - CORRECT IMPLEMENTATION
-- Based on SESSION_CONTEXT.md - COS360 Permission System Architecture
-- ============================================================================

-- ===== PUBLIC SCHEMA - PLAN-BASED PERMISSIONS =====
-- Table: public.plan_resource_access
-- Structure: INTEGER primary key, actions as PostgreSQL array
-- ====================================================================

SET search_path TO public;

-- Add fee transaction resources to Enterprise plan (plan_id = 4)
INSERT INTO plan_resource_access (plan_id, resource_name, actions, is_active, created_at) VALUES 
(4, 'fee_transactions', '{create,read,update,delete,list}', true, NOW()),
(4, 'fee_receipts', '{create,read,update,delete,list}', true, NOW()),
(4, 'fee_refunds', '{create,read,update,delete,list,approve,process}', true, NOW())
ON CONFLICT (plan_id, resource_name) DO NOTHING;

-- Add to Premium plan (plan_id = 3) - Full access
INSERT INTO plan_resource_access (plan_id, resource_name, actions, is_active, created_at) VALUES 
(3, 'fee_transactions', '{create,read,update,delete,list}', true, NOW()),
(3, 'fee_receipts', '{create,read,update,delete,list}', true, NOW()),
(3, 'fee_refunds', '{create,read,update,delete,list,approve,process}', true, NOW())
ON CONFLICT (plan_id, resource_name) DO NOTHING;

-- Add to Standard plan (plan_id = 2) - Full access  
INSERT INTO plan_resource_access (plan_id, resource_name, actions, is_active, created_at) VALUES 
(2, 'fee_transactions', '{create,read,update,delete,list}', true, NOW()),
(2, 'fee_receipts', '{create,read,update,delete,list}', true, NOW()),
(2, 'fee_refunds', '{create,read,update,delete,list}', true, NOW())  -- No approve/process for Standard
ON CONFLICT (plan_id, resource_name) DO NOTHING;

-- Add to Basic plan (plan_id = 1) - Read only
INSERT INTO plan_resource_access (plan_id, resource_name, actions, is_active, created_at) VALUES 
(1, 'fee_transactions', '{read,list}', true, NOW()),
(1, 'fee_receipts', '{read,list}', true, NOW())
-- No fee_refunds for Basic plan
ON CONFLICT (plan_id, resource_name) DO NOTHING;

-- ===== TENANT SCHEMA - ROLE-BASED PERMISSIONS =====
-- Table: {tenant_schema}.resource_permissions  
-- Structure: UUID primary key with gen_random_uuid(), individual action rows
-- ===========================================================================

-- Switch to tenant schema (CHANGE THIS TO YOUR TENANT SCHEMA NAME)
SET search_path TO test_tenant_schema;  -- CHANGE THIS TO: test_tenant_schema

-- ===== ADMIN ROLE PERMISSIONS (Full Access) =====
INSERT INTO resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at) VALUES 
-- Fee Transactions - Admin
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_transactions', 'create', true, NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_transactions', 'read', true, NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_transactions', 'update', true, NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_transactions', 'delete', true, NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_transactions', 'list', true, NOW(), NOW()),

-- Fee Receipts - Admin
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_receipts', 'create', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_receipts', 'read', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_receipts', 'update', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_receipts', 'delete', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_receipts', 'list', true),

-- Fee Refunds - Admin (including approve and process)
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'create', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'read', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'update', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'delete', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'list', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'approve', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'process', true),

-- ===== STAFF ROLE PERMISSIONS (Operational Access) =====
-- Fee Transactions - Staff (create, read, list)
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_transactions', 'create', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_transactions', 'read', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_transactions', 'list', true),

-- Fee Receipts - Staff (create, read, update for reprinting, list)
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_receipts', 'create', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_receipts', 'read', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_receipts', 'update', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_receipts', 'list', true),

-- Fee Refunds - Staff (create requests, read, list)
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_refunds', 'create', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_refunds', 'read', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_refunds', 'list', true),

-- ===== TEACHER ROLE PERMISSIONS (Read-Only Access) =====
-- Fee Transactions - Teacher (read, list)
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Teacher'), 'fee_transactions', 'read', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Teacher'), 'fee_transactions', 'list', true),

-- Fee Receipts - Teacher (read, list)
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Teacher'), 'fee_receipts', 'read', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Teacher'), 'fee_receipts', 'list', true),

-- Fee Refunds - Teacher (read, list)
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Teacher'), 'fee_refunds', 'read', true),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Teacher'), 'fee_refunds', 'list', true)

ON CONFLICT (role_id, resource, action) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check plan-based permissions (public schema)
SELECT 'PLAN-BASED PERMISSIONS (Public Schema):' as section;
SET search_path TO public;
SELECT 
    p.plan_name, 
    pra.resource_name, 
    pra.actions,
    pra.is_active
FROM plans p 
JOIN plan_resource_access pra ON p.id = pra.plan_id 
WHERE pra.resource_name LIKE 'fee_%' 
ORDER BY p.id, pra.resource_name;

-- Check role-based permissions (tenant schema)  
SELECT 'ROLE-BASED PERMISSIONS (Tenant Schema):' as section;
SET search_path TO cos360_main;  -- CHANGE THIS TO: test_tenant_schema
SELECT 
    r.name as role_name, 
    rp.resource, 
    rp.action, 
    rp.is_granted
FROM roles r 
JOIN resource_permissions rp ON r.id = rp.role_id 
WHERE rp.resource LIKE 'fee_%' 
ORDER BY r.name, rp.resource, rp.action;

-- Check if required tables exist
SELECT 'TABLE EXISTENCE CHECK:' as section;
SET search_path TO public;
SELECT 'public.plans' as table_name, COUNT(*) as record_count FROM plans;
SELECT 'public.plan_resource_access' as table_name, COUNT(*) as record_count FROM plan_resource_access;

SET search_path TO cos360_main;  -- CHANGE THIS TO: test_tenant_schema  
SELECT 'roles' as table_name, COUNT(*) as record_count FROM roles;
SELECT 'resource_permissions' as table_name, COUNT(*) as record_count FROM resource_permissions;