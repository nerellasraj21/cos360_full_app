# Term Amounts Permission Fix - Complete Verification & Execution Guide

**Error**: "Permission not found in database: Admin cannot create fee_class_mapping_term_amounts"

**Date**: 2026-02-05

---

## Step-by-Step Fix (Execute in Order)

### Step 1: Verify Current State

Run these queries in your PostgreSQL database to check current permissions:

```sql
-- 1. Find your Admin role ID
SELECT id, name FROM roles WHERE name = 'Admin';
-- Copy the ID from the result

-- 2. Check if permission exists
SELECT * FROM resource_permissions
WHERE resource = 'fee_class_mapping_term_amounts';
-- If empty, permission doesn't exist

-- 3. Check all fee-related permissions for Admin
SELECT rp.*, r.name as role_name
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'Admin'
  AND rp.resource LIKE 'fee%'
ORDER BY rp.resource, rp.action;
```

### Step 2: Add the Missing Permissions

**Option A: Quick Fix (Just the Create Permission)**

```sql
-- Replace 'ADMIN_ROLE_ID_HERE' with the actual ID from Step 1
INSERT INTO resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'ADMIN_ROLE_ID_HERE',  -- ⚠️ REPLACE THIS
    'fee_class_mapping_term_amounts',
    'create',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (role_id, resource, action) DO UPDATE
SET is_granted = true, updated_at = NOW();

-- Verify it was added
SELECT * FROM resource_permissions
WHERE resource = 'fee_class_mapping_term_amounts'
  AND action = 'create';
```

**Option B: Complete Fix (All 5 Permissions) - RECOMMENDED**

```sql
-- Replace 'ADMIN_ROLE_ID_HERE' with the actual ID from Step 1
DO $$
DECLARE
    v_admin_role_id UUID := 'ADMIN_ROLE_ID_HERE';  -- ⚠️ REPLACE THIS
BEGIN
    -- Insert all 5 permissions
    INSERT INTO resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at)
    VALUES
        (gen_random_uuid(), v_admin_role_id, 'fee_class_mapping_term_amounts', 'create', true, NOW(), NOW()),
        (gen_random_uuid(), v_admin_role_id, 'fee_class_mapping_term_amounts', 'read', true, NOW(), NOW()),
        (gen_random_uuid(), v_admin_role_id, 'fee_class_mapping_term_amounts', 'update', true, NOW(), NOW()),
        (gen_random_uuid(), v_admin_role_id, 'fee_class_mapping_term_amounts', 'delete', true, NOW(), NOW()),
        (gen_random_uuid(), v_admin_role_id, 'fee_class_mapping_term_amounts', 'list', true, NOW(), NOW())
    ON CONFLICT (role_id, resource, action) DO UPDATE
    SET is_granted = true, updated_at = NOW();

    RAISE NOTICE 'Successfully added 5 permissions for fee_class_mapping_term_amounts';
END $$;

-- Verify all were added
SELECT resource, action, is_granted, created_at
FROM resource_permissions
WHERE resource = 'fee_class_mapping_term_amounts'
ORDER BY action;
```

**Option C: Auto-Detect Admin Role (No Manual ID Required)**

```sql
-- This script automatically finds the Admin role
DO $$
DECLARE
    v_admin_role_id UUID;
    v_inserted_count INT := 0;
BEGIN
    -- Find Admin role automatically
    SELECT id INTO v_admin_role_id
    FROM roles
    WHERE name = 'Admin'
    LIMIT 1;

    IF v_admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Admin role not found in database';
    END IF;

    -- Insert all 5 permissions
    INSERT INTO resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at)
    VALUES
        (gen_random_uuid(), v_admin_role_id, 'fee_class_mapping_term_amounts', 'create', true, NOW(), NOW()),
        (gen_random_uuid(), v_admin_role_id, 'fee_class_mapping_term_amounts', 'read', true, NOW(), NOW()),
        (gen_random_uuid(), v_admin_role_id, 'fee_class_mapping_term_amounts', 'update', true, NOW(), NOW()),
        (gen_random_uuid(), v_admin_role_id, 'fee_class_mapping_term_amounts', 'delete', true, NOW(), NOW()),
        (gen_random_uuid(), v_admin_role_id, 'fee_class_mapping_term_amounts', 'list', true, NOW(), NOW())
    ON CONFLICT (role_id, resource, action) DO UPDATE
    SET is_granted = true, updated_at = NOW();

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    RAISE NOTICE 'Admin role ID: %', v_admin_role_id;
    RAISE NOTICE 'Successfully processed % permission(s) for fee_class_mapping_term_amounts', v_inserted_count;
END $$;

-- Verify the result
SELECT
    r.name as role_name,
    rp.resource,
    rp.action,
    rp.is_granted,
    rp.created_at
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE rp.resource = 'fee_class_mapping_term_amounts'
ORDER BY rp.action;
```

### Step 3: Verify Permissions Were Added

```sql
-- Should return 5 rows (create, read, update, delete, list)
SELECT
    r.name as role_name,
    rp.resource,
    rp.action,
    rp.is_granted
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE rp.resource = 'fee_class_mapping_term_amounts'
ORDER BY rp.action;
```

**Expected Result:**
```
role_name | resource                           | action | is_granted
----------|-------------------------------------|--------|------------
Admin     | fee_class_mapping_term_amounts     | create | true
Admin     | fee_class_mapping_term_amounts     | delete | true
Admin     | fee_class_mapping_term_amounts     | list   | true
Admin     | fee_class_mapping_term_amounts     | read   | true
Admin     | fee_class_mapping_term_amounts     | update | true
```

### Step 4: CRITICAL - Refresh Your Session

**You MUST do this for the permission to take effect:**

1. **Log out** from your application (click logout button)
2. **Close all browser tabs** with the application
3. **Clear browser cache** (optional but recommended):
   - Chrome: Ctrl+Shift+Delete → Clear cookies and cached files
   - Firefox: Ctrl+Shift+Delete → Cookies and Cache
4. **Close and reopen the browser** (optional but recommended)
5. **Log back in** with your Admin account

**Why?** Your JWT token caches your permissions. Until you log out and get a new token, the old token won't have the new permission.

### Step 5: Test the Endpoint

After logging back in, test the endpoint:

**Browser Test:**
1. Go to Fee Mappings → Class Fee Mappings
2. Click the "Manage Term Amounts" icon
3. Fill in the term amounts
4. Click "Save Term Amounts"
5. Check browser console (F12 → Console)
   - ✅ Success: `POST .../class-mapping-term-amounts/ 201 (Created)`
   - ❌ Still failing: Go to Step 6

**API Test (Alternative):**
```bash
# Get a fresh token first (after logging out and back in)
# Then test the endpoint directly

curl -X POST "http://localhost:8000/api/v1/fee/class-mapping-term-amounts/" \
  -H "Authorization: Bearer YOUR_NEW_TOKEN" \
  -H "cschema: YOUR_TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "fee_class_mapping_id": "your-mapping-id",
    "term_amounts": [
      {
        "term_id": "term-1-id",
        "term_amount": 5000.00
      },
      {
        "term_id": "term-2-id",
        "term_amount": 5000.00
      }
    ]
  }'
```

### Step 6: Troubleshooting (If Still Not Working)

**A. Verify you're using the correct role**

```sql
-- Check which role your user actually has
SELECT u.email, u.username, r.name as role_name, r.id as role_id
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'your@email.com';  -- Replace with your email
```

Make sure the `role_id` matches the one you added permissions for.

**B. Check if you actually logged out**

1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Check if the token is different from before
4. Or decode the token at https://jwt.io and check the `iat` (issued at) timestamp - it should be recent

**C. Check for typos in the database**

```sql
-- Make sure there are no typos
SELECT * FROM resource_permissions
WHERE resource LIKE '%term%amount%';
```

The resource should be EXACTLY: `fee_class_mapping_term_amounts` (with underscores, no hyphens)

**D. Check the actual error**

After logging out and back in, check the browser console again:
- F12 → Network tab → Click "Save Term Amounts"
- Click the failed request → Response tab
- Share the exact error message

---

## Quick Reference: All Fee Management Permissions

If you want to add ALL fee management permissions at once:

```sql
DO $$
DECLARE
    v_admin_role_id UUID;
    v_count INT;
BEGIN
    -- Find Admin role
    SELECT id INTO v_admin_role_id FROM roles WHERE name = 'Admin' LIMIT 1;

    IF v_admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Admin role not found';
    END IF;

    -- Insert all fee permissions
    INSERT INTO resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at)
    SELECT
        gen_random_uuid(),
        v_admin_role_id,
        t.resource,
        t.action,
        true,
        NOW(),
        NOW()
    FROM (VALUES
        -- Fee Categories
        ('fee_categories', 'create'),
        ('fee_categories', 'read'),
        ('fee_categories', 'update'),
        ('fee_categories', 'delete'),
        ('fee_categories', 'list'),
        -- Fee Types
        ('fee_types', 'create'),
        ('fee_types', 'read'),
        ('fee_types', 'update'),
        ('fee_types', 'delete'),
        ('fee_types', 'list'),
        -- Fee Terms
        ('fee_terms', 'create'),
        ('fee_terms', 'read'),
        ('fee_terms', 'update'),
        ('fee_terms', 'delete'),
        ('fee_terms', 'list'),
        -- Fee Class Mappings
        ('fee_class_mappings', 'create'),
        ('fee_class_mappings', 'read'),
        ('fee_class_mappings', 'update'),
        ('fee_class_mappings', 'delete'),
        ('fee_class_mappings', 'list'),
        -- Fee Student Mappings
        ('fee_student_mappings', 'create'),
        ('fee_student_mappings', 'read'),
        ('fee_student_mappings', 'update'),
        ('fee_student_mappings', 'delete'),
        ('fee_student_mappings', 'list'),
        -- Fee Class Mapping Term Amounts (THE ONE YOU NEED)
        ('fee_class_mapping_term_amounts', 'create'),
        ('fee_class_mapping_term_amounts', 'read'),
        ('fee_class_mapping_term_amounts', 'update'),
        ('fee_class_mapping_term_amounts', 'delete'),
        ('fee_class_mapping_term_amounts', 'list'),
        -- Fee Transactions
        ('fee_transactions', 'create'),
        ('fee_transactions', 'read'),
        ('fee_transactions', 'update'),
        ('fee_transactions', 'delete'),
        ('fee_transactions', 'list'),
        -- Fee Receipts
        ('fee_receipts', 'create'),
        ('fee_receipts', 'read'),
        ('fee_receipts', 'update'),
        ('fee_receipts', 'delete'),
        ('fee_receipts', 'list'),
        -- Fee Refunds
        ('fee_refunds', 'create'),
        ('fee_refunds', 'read'),
        ('fee_refunds', 'list'),
        ('fee_refunds', 'approve'),
        ('fee_refunds', 'process')
    ) AS t(resource, action)
    ON CONFLICT (role_id, resource, action) DO UPDATE
    SET is_granted = true, updated_at = NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Processed % permission(s) for Admin role', v_count;
END $$;
```

---

## Summary Checklist

- [ ] Run Option C SQL script (auto-detects Admin role)
- [ ] Verify 5 permissions were added (run verification query)
- [ ] **Log out completely**
- [ ] **Close all browser tabs**
- [ ] **Log back in**
- [ ] Test "Save Term Amounts" button
- [ ] Check browser console for success (201) or error

---

## What Each Field Means

```sql
resource_permissions table:
- id: UUID (auto-generated)
- role_id: UUID from roles table
- resource: Text like 'fee_class_mapping_term_amounts'
- action: Text like 'create', 'read', 'update', 'delete', 'list'
- is_granted: Boolean (true to allow, false to deny)
```

**IMPORTANT**: The fields are:
- `resource` (NOT `resource_name`)
- `is_granted` (NOT `is_allowed`)

---

**Next Step**: Run Option C SQL script, then log out and log back in!

