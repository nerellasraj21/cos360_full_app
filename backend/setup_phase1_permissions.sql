-- Phase 1 Fee Transaction Permissions Setup
-- Run this script to set up both plan-based and role-based permissions

-- ===== PUBLIC SCHEMA - PLAN-BASED PERMISSIONS =====
SET search_path TO public;

-- Add fee transaction resources to Enterprise plan
INSERT INTO plan_resource_access (id, plan_id, resource_name, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM plans WHERE plan_name = 'Enterprise'), 'fee_transactions', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM plans WHERE plan_name = 'Enterprise'), 'fee_receipts', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM plans WHERE plan_name = 'Enterprise'), 'fee_refunds', NOW(), NOW())
ON CONFLICT (plan_id, resource_name) DO NOTHING;

-- Add to Premium plan as well
INSERT INTO plan_resource_access (id, plan_id, resource_name, created_at, updated_at) VALUES
(gen_random_uuid(), (SELECT id FROM plans WHERE plan_name = 'Premium'), 'fee_transactions', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM plans WHERE plan_name = 'Premium'), 'fee_receipts', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM plans WHERE plan_name = 'Premium'), 'fee_refunds', NOW(), NOW())
ON CONFLICT (plan_id, resource_name) DO NOTHING;

-- ===== TENANT SCHEMA - ROLE-BASED PERMISSIONS =====
SET search_path TO cos360_main; -- Change to your tenant schema name

-- Admin role - Full access to all fee transaction features
INSERT INTO resource_permissions (id, role_id, resource, action, created_at, updated_at) VALUES
-- Fee Transactions
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_transactions', 'create', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_transactions', 'read', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_transactions', 'update', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_transactions', 'delete', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_transactions', 'list', NOW(), NOW()),

-- Fee Receipts
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_receipts', 'create', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_receipts', 'read', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_receipts', 'update', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_receipts', 'delete', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_receipts', 'list', NOW(), NOW()),

-- Fee Refunds (including approve/process)
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'create', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'read', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'update', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'delete', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'list', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'approve', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Admin'), 'fee_refunds', 'process', NOW(), NOW()),

-- Staff role - Operational access
-- Fee Transactions
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_transactions', 'create', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_transactions', 'read', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_transactions', 'list', NOW(), NOW()),

-- Fee Receipts
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_receipts', 'create', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_receipts', 'read', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_receipts', 'list', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_receipts', 'update', NOW(), NOW()),

-- Fee Refunds (request only)
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_refunds', 'create', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_refunds', 'read', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Staff'), 'fee_refunds', 'list', NOW(), NOW()),

-- Teacher role - Read-only access
-- Fee Transactions
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Teacher'), 'fee_transactions', 'read', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Teacher'), 'fee_transactions', 'list', NOW(), NOW()),

-- Fee Receipts
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Teacher'), 'fee_receipts', 'read', NOW(), NOW()),
(gen_random_uuid(), (SELECT id FROM roles WHERE name = 'Teacher'), 'fee_receipts', 'list', NOW(), NOW())

ON CONFLICT (role_id, resource, action) DO NOTHING;

-- ===== VERIFICATION QUERIES =====
-- Check plan-based permissions
SELECT 'PLAN-BASED PERMISSIONS:' as section;
SET search_path TO public;
SELECT p.plan_name, pra.resource_name 
FROM plans p 
JOIN plan_resource_access pra ON p.id = pra.plan_id 
WHERE pra.resource_name LIKE 'fee_%' 
ORDER BY p.plan_name, pra.resource_name;

-- Check role-based permissions  
SELECT 'ROLE-BASED PERMISSIONS:' as section;
SET search_path TO cos360_main;
SELECT r.name as role_name, rp.resource, rp.action
FROM roles r 
JOIN resource_permissions rp ON r.id = rp.role_id 
WHERE rp.resource LIKE 'fee_%' 
ORDER BY r.name, rp.resource, rp.action;