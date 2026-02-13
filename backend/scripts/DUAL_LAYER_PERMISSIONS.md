# Understanding the Dual-Layer Permission System

## Executive Summary

Your application has a **two-layer permission system**:

1. **PUBLIC SCHEMA** - Plan-level permissions (what features are available)
2. **TENANT SCHEMA** - Role-level permissions (who can use those features)

**Both layers must have permissions configured** or users will get 403 errors.

## The Two Layers

### Layer 1: Public Schema (Plans)

**Location:** `public.plan_resource_access` table

**Purpose:** Defines what features are available to each subscription plan.

**Structure:**
```sql
CREATE TABLE public.plan_resource_access (
    id UUID PRIMARY KEY,
    plan_id UUID REFERENCES public.plans(id),
    resource_name TEXT,         -- e.g., 'fee_class_mapping_term_amounts'
    actions TEXT[],             -- e.g., ['create', 'read', 'update']
    is_active BOOLEAN
);
```

**Example Data:**
```sql
-- Enterprise plan can do everything with fees
plan_id: enterprise-uuid
resource_name: 'fee_class_mapping_term_amounts'
actions: ['create', 'read', 'update', 'delete', 'list']

-- Basic plan can only read fees
plan_id: basic-uuid
resource_name: 'fee_class_mapping_term_amounts'
actions: ['read', 'list']
```

### Layer 2: Tenant Schema (Roles)

**Location:** `{tenant_schema}.resource_permissions` table

**Purpose:** Defines what each role within a tenant can actually do.

**Structure:**
```sql
CREATE TABLE resource_permissions (
    id UUID PRIMARY KEY,
    role_id UUID REFERENCES roles(id),
    resource TEXT,              -- e.g., 'fee_class_mapping_term_amounts'
    action TEXT,                -- e.g., 'create' (one action per row)
    is_granted BOOLEAN
);
```

**Example Data:**
```sql
-- Admin role can create fee term amounts
role_id: admin-role-uuid
resource: 'fee_class_mapping_term_amounts'
action: 'create'
is_granted: true

-- Teacher role can only read
role_id: teacher-role-uuid
resource: 'fee_class_mapping_term_amounts'
action: 'read'
is_granted: true
```

## How The System Works

### During Tenant Onboarding

```
1. New tenant created
       ↓
2. Tenant assigned to a Plan (e.g., Enterprise)
       ↓
3. Plan's permissions COPIED to tenant schema
       ↓
   public.plan_resource_access
   → {tenant}.resource_permissions
       ↓
4. Permissions assigned to appropriate roles
   (Admin gets all, Teacher gets some, Student gets few)
```

### During User Login (Runtime)

```
1. User logs in
       ↓
2. System finds user's role (e.g., Admin)
       ↓
3. Loads permissions from {tenant}.resource_permissions
   (ONLY tenant schema, NO plan checking)
       ↓
4. Permissions stored in JWT token
       ↓
5. Token used for all subsequent requests
```

**Key Point:** At runtime, ONLY the tenant schema is checked!

### During API Request

```
User makes POST request to /api/v1/fee/class-mapping-term-amounts/
       ↓
1. Extract JWT token from Authorization header
       ↓
2. Get role from token (e.g., "Admin")
       ↓
3. Check {tenant}.resource_permissions table:
   - WHERE role_id = user's role
   - AND resource = 'fee_class_mapping_term_amounts'
   - AND action = 'create'
   - AND is_granted = true
       ↓
4. If found: Allow request (200/201)
   If not found: Reject with 403 Forbidden
```

## Why Two Layers?

### Layer 1 (Plan) - Business Logic
- Controls what features are available per subscription tier
- Managed by Super Admin
- Affects all tenants on that plan
- Changes rarely (when adding new features or changing plans)

### Layer 2 (Role) - Access Control
- Controls who can use available features within a tenant
- Managed by Tenant Admin
- Tenant-specific customization
- Changes more often (as roles are refined)

## Common Problems

### Problem 1: Missing Plan Permissions

**Symptoms:**
- All tenants on a plan can't access a feature
- 403 errors across multiple tenants
- Feature was recently added to codebase

**Cause:**
```sql
-- Plan doesn't have the permission
SELECT * FROM public.plan_resource_access
WHERE resource_name = 'fee_class_mapping_term_amounts';
-- Returns 0 rows
```

**Solution:**
```bash
python scripts/fix_fee_permissions_complete.py --skip-tenant
```

Or manually:
```sql
INSERT INTO public.plan_resource_access
(id, plan_id, resource_name, actions, is_active)
VALUES (
    gen_random_uuid(),
    'enterprise-plan-id',
    'fee_class_mapping_term_amounts',
    ARRAY['create', 'read', 'update', 'delete', 'list'],
    true
);
```

### Problem 2: Missing Tenant Role Permissions

**Symptoms:**
- Specific tenant can't access a feature
- Other tenants work fine
- Admin users get 403 errors

**Cause:**
```sql
-- Tenant role doesn't have the permission
SELECT * FROM tenant_schema.resource_permissions
WHERE role_id = 'admin-role-id'
  AND resource = 'fee_class_mapping_term_amounts';
-- Returns 0 rows
```

**Solution:**
```bash
python scripts/fix_fee_permissions.py --tenant tenant_schema
```

Or manually:
```sql
INSERT INTO tenant_schema.resource_permissions
(id, role_id, resource, action, is_granted, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin-role-id',
    'fee_class_mapping_term_amounts',
    'create',
    true,
    NOW(),
    NOW()
);
```

### Problem 3: Both Layers Missing

**Symptoms:**
- Brand new feature
- No tenant can access it
- 403 errors everywhere

**Solution:**
```bash
# Fix both layers at once
python scripts/fix_fee_permissions_complete.py
```

## Decision Tree: Which Script To Use?

```
Is this a new feature?
├─ YES → Use fix_fee_permissions_complete.py (fixes both layers)
└─ NO → Which layer has the problem?
    ├─ PUBLIC (Plan) → Use fix_fee_permissions_complete.py --skip-tenant
    ├─ TENANT (Role) → Use fix_fee_permissions.py
    └─ DON'T KNOW → Use fix_fee_permissions_complete.py (fixes both)
```

## Verification Checklist

After running any fix script, verify both layers:

### 1. Verify Public Schema (Plan)

```sql
-- Check if plan has fee permissions
SELECT
    p.name as plan_name,
    pra.resource_name,
    pra.actions
FROM public.plans p
JOIN public.plan_resource_access pra ON p.id = pra.plan_id
WHERE p.name = 'Enterprise'
  AND pra.resource_name = 'fee_class_mapping_term_amounts';
```

**Expected:** Should return 1 row with actions array

### 2. Verify Tenant Schema (Role)

```sql
-- Check if Admin role has fee permissions
SELECT
    r.name as role_name,
    rp.resource,
    rp.action,
    rp.is_granted
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'Admin'
  AND rp.resource = 'fee_class_mapping_term_amounts';
```

**Expected:** Should return 5 rows (one for each action)

### 3. Verify JWT Token

After logging back in, decode your JWT token at https://jwt.io

Look for:
```json
{
  "sub": "user-id",
  "role": "Admin",
  "permissions": {
    "fee_class_mapping_term_amounts": ["create", "read", "update", "delete", "list"]
  }
}
```

## Key Differences Between Layers

| Aspect | Public Schema (Plan) | Tenant Schema (Role) |
|--------|---------------------|---------------------|
| **Table** | `plan_resource_access` | `resource_permissions` |
| **Scope** | All tenants on plan | Single tenant, specific role |
| **Actions Storage** | Array: `['create','read']` | One per row: `'create'` |
| **Key Column** | `plan_id` | `role_id` |
| **Managed By** | Super Admin | Tenant Admin |
| **Changes Affect** | All tenants on plan | Only that role in that tenant |
| **Checked At** | Tenant onboarding | Every API request |

## Summary

**Remember:**
1. **TWO layers** must both have permissions
2. **Plan layer** = what the subscription includes
3. **Role layer** = what the user can actually do
4. **Runtime** only checks tenant schema (role layer)
5. **Both must be configured** or you get 403 errors
6. **After fixing, log out and back in** to refresh JWT token

**Quick Commands:**
```bash
# Fix everything (recommended)
python scripts/fix_fee_permissions_complete.py

# Fix only plan (public schema)
python scripts/fix_fee_permissions_complete.py --skip-tenant

# Fix only tenant (tenant schema)
python scripts/fix_fee_permissions.py

# Preview changes
python scripts/fix_fee_permissions_complete.py --dry-run
```
