# Complete Dual-Layer Permissions System - Handover Document

## 📌 Document Purpose

**This is the ONLY document you need to add permissions to any endpoint in COS360.**

Use this guide to:

- Add role-based permissions (tenant schema)
- Add plan-based permissions (public schema)
- Verify permissions are working correctly
- Test endpoints after adding permissions
- Troubleshoot permission issues

**Last Updated**: 2026-03-04
**Author**: System Architecture Team
**Status**: Production Ready ✅

---

## 🏗️ System Architecture Overview

### The Dual-Layer Permission System

COS360 uses a **two-layer permission system** for maximum flexibility:

```
┌─────────────────────────────────────────────────────────────────┐
│                    API REQUEST WITH JWT TOKEN                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Endpoint Permission Check Function                 │
│   check_role_plan_permission_with_error(db, request, role,      │
│                           resource_name, action)                 │
└──────────────┬──────────────────────────────────┬───────────────┘
               │                                  │
      LAYER 1  │                                  │ LAYER 2
               ↓                                  ↓
┌──────────────────────────┐      ┌──────────────────────────────┐
│   PUBLIC SCHEMA          │      │   TENANT SCHEMA              │
│   Plan-Level Permissions │      │   Role-Level Permissions     │
│                          │      │                              │
│   Table:                 │      │   Table:                     │
│   plan_resource_access   │      │   resource_permissions       │
│                          │      │                              │
│   Question:              │      │   Question:                  │
│   "Does this plan have   │      │   "Does this role have       │
│   this feature?"         │      │   this permission?"          │
└──────────────┬───────────┘      └──────────────┬───────────────┘
               │                                  │
               └──────────────┬───────────────────┘
                              │
                        BOTH MUST PASS
                              │
                ┌─────────────┴─────────────┐
                │                           │
               YES                         NO
                │                           │
                ↓                           ↓
          ✅ ALLOW                    ❌ 403 FORBIDDEN
```

### Why Two Layers?

| Layer             | Purpose                                                               | Example                                                       |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Layer 1: Plan** | Controls which features are available in different subscription tiers | "Enterprise plan includes fee management, Basic plan doesn't" |
| **Layer 2: Role** | Controls which actions specific roles can perform                     | "Admin can create fees, Teacher can only read fees"           |

**Both checks must pass for access to be granted.**

---

## 📋 Step-by-Step Guide: Adding Permissions to Any Endpoint

### Phase 1: Identify What Permissions Are Needed

#### 1.1 Find the Endpoint File

Endpoints are located in: `app/api/v1/{module}/{resource}_endpoints.py`

Examples:

- Fee Categories: `app/api/v1/fee/fee_category_endpoints.py`
- Student Transport: `app/api/v1/student/student_transport_endpoints.py`
- Staff: `app/api/v1/staff/staff_endpoints.py`

#### 1.2 Check if Permissions Are Already in Code

Look for this pattern in the endpoint:

```python
from app.tools.simple_permissions import check_role_plan_permission_with_error

@router.post("/")
async def create_something(request: Request, ...):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # This is the permission check
    await check_role_plan_permission_with_error(
        db, request, role,
        'resource_name',  # ← Resource name
        'action_name'     # ← Action name
    )
```

**✅ If permission check exists**: Permissions just need to be added to database
**❌ If no permission check**: Add the check first, then add to database

#### 1.3 Identify Resource Name and Actions

Standard actions for most resources:

| Action   | HTTP Method  | Purpose                   |
| -------- | ------------ | ------------------------- |
| `create` | POST         | Create new records        |
| `read`   | GET (single) | Get specific record by ID |
| `list`   | GET (all)    | Get all records / search  |
| `update` | PUT/PATCH    | Update existing record    |
| `delete` | DELETE       | Delete record             |

Special actions (resource-specific):

- `approve` - Approve requests (refunds, leave, etc.)
- `export` - Export data to file
- `import` - Import data from file
- `process` - Process transactions
- `audit` - View audit logs

**Example for Student Transport:**

```python
Resource: 'student_transport'
Actions: ['create', 'read', 'update', 'delete', 'list']
```

---

### Phase 2: Create the Permission Script

#### 2.1 Use the Template Script

Create: `scripts/fix_{module}_permissions.py`

Copy from: `scripts/fix_fee_permissions_complete.py`

#### 2.2 Modify the Template

**Step 1**: Change class name

```python
# OLD
class CompleteFeePermissionFixer:

# NEW
class Complete{Module}PermissionFixer:
```

**Step 2**: Define permissions

```python
# Define all permissions for this module
{MODULE}_PERMISSIONS = [
    ('resource_name_1', ['create', 'read', 'update', 'delete', 'list']),
    ('resource_name_2', ['create', 'read', 'update', 'delete', 'list']),
    # Add more resources as needed
]
```

**Step 3**: Update docstring

```python
"""
Complete {Module Name} Permissions Fix Script

This script fixes permissions at BOTH layers of the permission system:
1. PUBLIC SCHEMA - Plan permissions (plan_resource_access table)
2. TENANT SCHEMA - Role permissions (resource_permissions table)

Usage:
    python scripts/fix_{module}_permissions.py [--plan-id PLAN_ID] [--tenant SCHEMA] [--dry-run]
"""
```

#### 2.3 Complete Script Template

```python
#!/usr/bin/env python3
"""
Complete {MODULE_NAME} Permissions Fix Script

This script fixes permissions at BOTH layers of the permission system:
1. PUBLIC SCHEMA - Plan permissions (plan_resource_access table)
2. TENANT SCHEMA - Role permissions (resource_permissions table)

Usage:
    python scripts/fix_{module}_permissions.py [--plan-id PLAN_ID] [--tenant SCHEMA] [--dry-run]

Options:
    --plan-id PLAN_ID      Specify plan ID (default: auto-detect Enterprise plan)
    --tenant SCHEMA        Specify tenant schema (default: auto-detect)
    --dry-run              Show what would be done without making changes
    --skip-plan            Skip public schema plan permissions
    --skip-tenant          Skip tenant schema role permissions
"""

import asyncio
import asyncpg
import os
import sys
from dotenv import load_dotenv
from datetime import datetime
import uuid
from typing import List, Tuple, Optional, Dict

class Complete{Module}PermissionFixer:
    """Fixes {module} permissions at both public and tenant schema layers"""

    # All {module} permissions
    {MODULE}_PERMISSIONS = [
        ('resource_name_1', ['create', 'read', 'update', 'delete', 'list']),
        ('resource_name_2', ['create', 'read', 'update', 'delete', 'list']),
        # Add all resources here
    ]

    def __init__(self, plan_id: Optional[str] = None, tenant_schema: Optional[str] = None,
                 dry_run: bool = False, skip_plan: bool = False, skip_tenant: bool = False):
        load_dotenv()

        self.database_url = os.getenv('DATABASE_URL')
        if self.database_url and self.database_url.startswith('postgresql+asyncpg://'):
            self.database_url = self.database_url.replace('postgresql+asyncpg://', 'postgresql://')

        self.plan_id = plan_id
        self.tenant_schema = tenant_schema
        self.dry_run = dry_run
        self.skip_plan = skip_plan
        self.skip_tenant = skip_tenant
        self.conn: Optional[asyncpg.Connection] = None

    async def connect(self):
        """Connect to the database"""
        if not self.database_url:
            raise Exception("DATABASE_URL not found in environment")
        self.conn = await asyncpg.connect(self.database_url)
        return self.conn

    async def close(self):
        """Close database connection"""
        if self.conn:
            await self.conn.close()

    async def detect_plan_id(self) -> Optional[str]:
        """Auto-detect plan ID (looks for Enterprise or most common plan)"""
        if self.plan_id:
            return self.plan_id

        # Try to find Enterprise plan first
        enterprise = await self.conn.fetchrow("""
            SELECT id, name FROM public.plans
            WHERE name ILIKE '%enterprise%' AND is_active = true
            ORDER BY name
            LIMIT 1
        """)

        if enterprise:
            return str(enterprise['id'])

        # Otherwise, find the plan with most tenants
        most_used = await self.conn.fetchrow("""
            SELECT p.id, p.name, COUNT(t.id) as tenant_count
            FROM public.plans p
            LEFT JOIN public.tenants t ON p.id = t.plan_id
            WHERE p.is_active = true
            GROUP BY p.id, p.name
            ORDER BY tenant_count DESC, p.id
            LIMIT 1
        """)

        if most_used:
            return str(most_used['id'])

        return None

    async def detect_tenant_schema(self) -> Optional[str]:
        """Auto-detect tenant schema from database"""
        if self.tenant_schema:
            return self.tenant_schema

        schemas = await self.conn.fetch("""
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('public', 'information_schema', 'pg_catalog', 'pg_toast')
            AND EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = schema_name AND table_name = 'roles'
            )
            ORDER BY schema_name
        """)

        if schemas:
            if len(schemas) == 1:
                return schemas[0]['schema_name']
            else:
                print(f"\nFound {len(schemas)} tenant schemas:")
                for i, schema in enumerate(schemas, 1):
                    print(f"  {i}. {schema['schema_name']}")
                return None

        return None

    async def check_plan_permissions(self, plan_id: str) -> Dict[str, List[str]]:
        """Check which permissions are missing in the plan"""
        missing = {}

        for resource, actions in self.{MODULE}_PERMISSIONS:
            row = await self.conn.fetchrow("""
                SELECT resource_name, actions
                FROM public.plan_resource_access
                WHERE plan_id = $1 AND resource_name = $2 AND is_active = true
            """, uuid.UUID(plan_id), resource)

            if not row:
                missing[resource] = actions
            else:
                existing_actions = row['actions'] or []
                missing_actions = [a for a in actions if a not in existing_actions]
                if missing_actions:
                    missing[resource] = missing_actions

        return missing

    async def add_plan_permission(self, plan_id: str, resource: str, actions: List[str]) -> bool:
        """Add or update plan permissions"""
        try:
            if self.dry_run:
                print(f"    [DRY-RUN] Would add to plan: {resource} -> {actions}")
                return True

            row = await self.conn.fetchrow("""
                SELECT id, actions FROM public.plan_resource_access
                WHERE plan_id = $1 AND resource_name = $2
            """, uuid.UUID(plan_id), resource)

            if row:
                existing_actions = row['actions'] or []
                new_actions = list(set(existing_actions + actions))

                await self.conn.execute("""
                    UPDATE public.plan_resource_access
                    SET actions = $1, is_active = true
                    WHERE plan_id = $2 AND resource_name = $3
                """, new_actions, uuid.UUID(plan_id), resource)

                print(f"    ✓ Updated plan: {resource} -> {new_actions}")
            else:
                await self.conn.execute("""
                    INSERT INTO public.plan_resource_access
                    (id, plan_id, resource_name, actions, is_active)
                    VALUES ($1, $2, $3, $4, true)
                """, uuid.uuid4(), uuid.UUID(plan_id), resource, actions)

                print(f"    ✓ Added to plan: {resource} -> {actions}")

            return True

        except Exception as e:
            print(f"    ✗ Error adding plan permission {resource}: {str(e)}")
            return False

    async def fix_plan_permissions(self, plan_id: str) -> dict:
        """Fix permissions in public schema plan_resource_access"""
        print(f"\n{'='*70}")
        print(f"PUBLIC SCHEMA - Plan Permissions")
        print(f"{'='*70}")

        results = {
            'plan_id': plan_id,
            'resources_added': 0,
            'resources_updated': 0,
            'resources_failed': 0,
            'actions_added': 0
        }

        plan = await self.conn.fetchrow("""
            SELECT id, name, description FROM public.plans WHERE id = $1
        """, uuid.UUID(plan_id))

        if not plan:
            print(f"  ✗ Plan {plan_id} not found")
            return results

        print(f"\nPlan: {plan['name']} ({plan_id})")

        missing = await self.check_plan_permissions(plan_id)

        if not missing:
            print(f"  ✓ All {len(self.{MODULE}_PERMISSIONS)} resources already in plan")
            return results

        print(f"\nFound {len(missing)} resource(s) with missing permissions:")

        for resource, actions in missing.items():
            print(f"\n  Resource: {resource}")
            success = await self.add_plan_permission(plan_id, resource, actions)

            if success:
                results['actions_added'] += len(actions)
                if await self.conn.fetchrow("""
                    SELECT id FROM public.plan_resource_access
                    WHERE plan_id = $1 AND resource_name = $2
                """, uuid.UUID(plan_id), resource):
                    results['resources_updated'] += 1
            else:
                results['resources_failed'] += 1

        return results

    async def get_admin_roles(self, schema: str) -> List[dict]:
        """Get all admin roles in tenant schema"""
        roles = await self.conn.fetch(f"""
            SELECT id, name, description
            FROM {schema}.roles
            WHERE LOWER(name) LIKE '%admin%'
            ORDER BY name
        """)
        return [dict(role) for role in roles]

    async def check_tenant_missing_permissions(self, schema: str, role_id: str) -> List[Tuple[str, str]]:
        """Check which permissions are missing for a role in tenant schema"""
        missing = []

        for resource, actions in self.{MODULE}_PERMISSIONS:
            for action in actions:
                exists = await self.conn.fetchval(f"""
                    SELECT EXISTS(
                        SELECT 1 FROM {schema}.resource_permissions
                        WHERE role_id = $1 AND resource = $2 AND action = $3
                    )
                """, role_id, resource, action)

                if not exists:
                    missing.append((resource, action))

        return missing

    async def add_tenant_permission(self, schema: str, role_id: str, role_name: str,
                                   resource: str, action: str) -> bool:
        """Add a permission to tenant role"""
        try:
            if self.dry_run:
                print(f"    [DRY-RUN] Would add: {role_name} -> {resource}:{action}")
                return True

            await self.conn.execute(f"""
                INSERT INTO {schema}.resource_permissions
                (id, role_id, resource, action, is_granted, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                ON CONFLICT (role_id, resource, action) DO UPDATE
                SET is_granted = true, updated_at = NOW()
            """, uuid.uuid4(), role_id, resource, action, True)

            print(f"    ✓ Added: {role_name} -> {resource}:{action}")
            return True

        except Exception as e:
            print(f"    ✗ Error adding {resource}:{action}: {str(e)}")
            return False

    async def fix_tenant_permissions(self, schema: str) -> dict:
        """Fix permissions in tenant schema resource_permissions"""
        print(f"\n{'='*70}")
        print(f"TENANT SCHEMA - Role Permissions")
        print(f"{'='*70}")

        results = {
            'schema': schema,
            'admin_roles': 0,
            'permissions_added': 0,
            'permissions_failed': 0,
            'permissions_existing': 0
        }

        print(f"\nSchema: {schema}")

        admin_roles = await self.get_admin_roles(schema)
        results['admin_roles'] = len(admin_roles)

        if not admin_roles:
            print("  ⚠ No admin roles found in this schema")
            return results

        print(f"\nFound {len(admin_roles)} admin role(s):")
        for role in admin_roles:
            print(f"  • {role['name']} ({role['id']})")

        for role in admin_roles:
            print(f"\nProcessing role: {role['name']}")

            missing = await self.check_tenant_missing_permissions(schema, role['id'])

            total_possible = sum(len(actions) for _, actions in self.{MODULE}_PERMISSIONS)
            existing = total_possible - len(missing)
            results['permissions_existing'] += existing

            if not missing:
                print(f"  ✓ All {total_possible} permissions already exist")
                continue

            print(f"  Found {len(missing)} missing permission(s)")

            for resource, action in missing:
                success = await self.add_tenant_permission(
                    schema, role['id'], role['name'], resource, action
                )
                if success:
                    results['permissions_added'] += 1
                else:
                    results['permissions_failed'] += 1

        return results

    async def fix_all_permissions(self):
        """Main method to fix permissions at both layers"""
        print("\n" + "="*70)
        print("Complete {Module Name} Permissions Fix")
        print("="*70)
        print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Mode: {'DRY-RUN (no changes will be made)' if self.dry_run else 'LIVE'}")

        try:
            await self.connect()

            plan_results = None
            tenant_results = None

            if not self.skip_plan:
                if not self.plan_id:
                    print("\nAuto-detecting plan...")
                    self.plan_id = await self.detect_plan_id()

                    if not self.plan_id:
                        print("\n✗ Could not auto-detect plan.")
                        print("  Please specify plan with --plan-id flag")
                        return False

                    plan = await self.conn.fetchrow("""
                        SELECT name FROM public.plans WHERE id = $1
                    """, uuid.UUID(self.plan_id))
                    print(f"  Detected plan: {plan['name']} ({self.plan_id})")

                plan_results = await self.fix_plan_permissions(self.plan_id)
            else:
                print("\nSkipping public schema plan permissions (--skip-plan)")

            if not self.skip_tenant:
                if not self.tenant_schema:
                    print("\nAuto-detecting tenant schema...")
                    self.tenant_schema = await self.detect_tenant_schema()

                    if not self.tenant_schema:
                        print("\n✗ Could not auto-detect tenant schema.")
                        print("  Please specify schema with --tenant flag")
                        return False

                    print(f"  Detected schema: {self.tenant_schema}")

                tenant_results = await self.fix_tenant_permissions(self.tenant_schema)
            else:
                print("\nSkipping tenant schema role permissions (--skip-tenant)")

            # Summary
            print("\n" + "="*70)
            print("SUMMARY")
            print("="*70)

            if plan_results:
                print(f"\nPublic Schema (Plan Permissions):")
                print(f"  Plan ID: {plan_results['plan_id']}")
                print(f"  Resources updated: {plan_results['resources_updated']}")
                print(f"  Actions added: {plan_results['actions_added']}")
                print(f"  Failed: {plan_results['resources_failed']}")

            if tenant_results:
                print(f"\nTenant Schema (Role Permissions):")
                print(f"  Schema: {tenant_results['schema']}")
                print(f"  Admin roles: {tenant_results['admin_roles']}")
                print(f"  Existing permissions: {tenant_results['permissions_existing']}")
                print(f"  Permissions added: {tenant_results['permissions_added']}")
                print(f"  Permissions failed: {tenant_results['permissions_failed']}")

            if not self.dry_run:
                print("\n" + "="*70)
                print("✓ SUCCESS - Permissions have been added!")
                print("="*70)
                print("\n⚠️  IMPORTANT: Users must log out and log back in!")
                print("    JWT tokens cache permissions. Existing sessions need refresh.")

            return True

        except Exception as e:
            print(f"\n✗ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            await self.close()

async def main():
    """Main entry point"""
    plan_id = None
    tenant_schema = None
    dry_run = False
    skip_plan = False
    skip_tenant = False

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--plan-id' and i + 1 < len(args):
            plan_id = args[i + 1]
            i += 2
        elif args[i] == '--tenant' and i + 1 < len(args):
            tenant_schema = args[i + 1]
            i += 2
        elif args[i] == '--dry-run':
            dry_run = True
            i += 1
        elif args[i] == '--skip-plan':
            skip_plan = True
            i += 1
        elif args[i] == '--skip-tenant':
            skip_tenant = True
            i += 1
        elif args[i] in ['--help', '-h']:
            print(__doc__)
            return
        else:
            print(f"Unknown argument: {args[i]}")
            print("Use --help for usage information")
            sys.exit(1)

    fixer = Complete{Module}PermissionFixer(
        plan_id=plan_id,
        tenant_schema=tenant_schema,
        dry_run=dry_run,
        skip_plan=skip_plan,
        skip_tenant=skip_tenant
    )
    success = await fixer.fix_all_permissions()

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
```

---

### Phase 3: Test with Dry-Run

**Always test in dry-run mode first!**

```bash
python scripts/fix_{module}_permissions.py --dry-run
```

This shows what will be added WITHOUT making any changes.

**Expected Output:**

```
======================================================================
Complete {Module} Permissions Fix
======================================================================
Date: 2026-02-09 XX:XX:XX
Mode: DRY-RUN (no changes will be made)

Auto-detecting plan...
  Detected plan: Enterprise (uuid-here)

======================================================================
PUBLIC SCHEMA - Plan Permissions
======================================================================

Plan: Enterprise (uuid-here)

Found X resource(s) with missing permissions:

  Resource: resource_name
    [DRY-RUN] Would add to plan: resource_name -> ['create', 'read', ...]

======================================================================
TENANT SCHEMA - Role Permissions
======================================================================

Schema: school_db

Found 1 admin role(s):
  • Admin (uuid-here)

Processing role: Admin
  Found X missing permission(s)
    [DRY-RUN] Would add: Admin -> resource_name:create
    [DRY-RUN] Would add: Admin -> resource_name:read
    ...

======================================================================
SUMMARY
======================================================================

This was a dry-run. Run without --dry-run to apply changes.
```

---

### Phase 4: Execute Live (Add to Database)

**After verifying dry-run output:**

```bash
python scripts/fix_{module}_permissions.py
```

This adds permissions to both layers.

**Options:**

```bash
# Specify plan and tenant manually
python scripts/fix_{module}_permissions.py \
  --plan-id <uuid> \
  --tenant school_db

# Only add to plan layer (skip tenant)
python scripts/fix_{module}_permissions.py --skip-tenant

# Only add to tenant layer (skip plan)
python scripts/fix_{module}_permissions.py --skip-plan
```

---

### Phase 5: Verify in Database

#### 5.1 Check Plan Permissions (Public Schema)

```sql
-- Check if resource exists in plan
SELECT
    p.name as plan_name,
    p.id as plan_id,
    pra.resource_name,
    pra.actions,
    pra.is_active
FROM public.plan_resource_access pra
JOIN public.plans p ON pra.plan_id = p.id
WHERE pra.resource_name = 'YOUR_RESOURCE_NAME'  -- Change this
ORDER BY p.name;
```

**Expected Result:**

- 1 row per plan that has this resource
- `actions` should be an array like `{create,read,update,delete,list}`
- `is_active` should be `true`

#### 5.2 Check Role Permissions (Tenant Schema)

```sql
-- Check if role has permissions
SELECT
    r.name as role_name,
    r.id as role_id,
    rp.resource,
    rp.action,
    rp.is_granted
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE rp.resource = 'YOUR_RESOURCE_NAME'  -- Change this
ORDER BY r.name, rp.action;
```

**Expected Result:**

- Multiple rows (one per role per action)
- Admin role should have all actions
- `is_granted` should be `true`

#### 5.3 Quick Verification Query

```sql
-- Combined check: Count permissions
SELECT
    'Plan Layer' as layer,
    COUNT(*) as permission_count
FROM public.plan_resource_access
WHERE resource_name = 'YOUR_RESOURCE_NAME'  -- Change this
  AND is_active = true

UNION ALL

SELECT
    'Role Layer' as layer,
    COUNT(*) as permission_count
FROM resource_permissions
WHERE resource = 'YOUR_RESOURCE_NAME';  -- Change this
```

**Expected Result:**

```
layer         | permission_count
--------------|-----------------
Plan Layer    | 1 (or more if multiple plans)
Role Layer    | X (number of actions × number of admin roles)
```

---

### Phase 6: Test Endpoints

#### 6.1 Refresh User Session

**⚠️ CRITICAL: JWT tokens cache permissions!**

Before testing:

1. **Log out** from the application completely
2. **Close all browser tabs** (or clear cache)
3. **Log back in** as Admin user

This ensures you get a new JWT token with the updated permissions.

#### 6.2 Test API Calls

Use Postman, curl, or your frontend:

```bash
# Example: Test LIST endpoint
curl -X GET http://localhost:8003/api/v1/{module}/{resource}/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Example: Test CREATE endpoint
curl -X POST http://localhost:8003/api/v1/{module}/{resource}/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'

# Example: Test READ endpoint
curl -X GET http://localhost:8003/api/v1/{module}/{resource}/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Example: Test UPDATE endpoint
curl -X PATCH http://localhost:8003/api/v1/{module}/{resource}/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field": "new_value"}'

# Example: Test DELETE endpoint
curl -X DELETE http://localhost:8003/api/v1/{module}/{resource}/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Results:**

- ✅ **200 OK** for successful GET/PATCH
- ✅ **201 Created** for successful POST
- ✅ **204 No Content** for successful DELETE
- ❌ **NOT 403 Forbidden**

---

## 📚 Real-World Examples

### Example 1: Student Transport Module

**Resource**: `student_transport`
**Actions**: `['create', 'read', 'update', 'delete', 'list']`
**Endpoints**: `app/api/v1/student/student_transport_endpoints.py`

**Permission Definition:**

```python
STUDENT_TRANSPORT_PERMISSIONS = [
    ('student_transport', ['create', 'read', 'update', 'delete', 'list']),
]
```

**Script Name**: `scripts/fix_student_transport_permissions.py`

**Test Endpoints:**

- POST `/api/v1/students/student-transport/`
- GET `/api/v1/students/student-transport/`
- GET `/api/v1/students/student-transport/{id}`
- PATCH `/api/v1/students/student-transport/{id}`
- DELETE `/api/v1/students/student-transport/{id}`

---

### Example 2: Fee Management Module

**Resources**: Multiple (9 resources)
**Endpoints**: `app/api/v1/fee/*_endpoints.py`

**Permission Definition:**

```python
FEE_PERMISSIONS = [
    ('fee_categories', ['create', 'read', 'update', 'delete', 'list']),
    ('fee_types', ['create', 'read', 'update', 'delete', 'list']),
    ('fee_terms', ['create', 'read', 'update', 'delete', 'list']),
    ('fee_class_mappings', ['create', 'read', 'update', 'delete', 'list']),
    ('fee_student_mappings', ['create', 'read', 'update', 'delete', 'list']),
    ('fee_class_mapping_term_amounts', ['create', 'read', 'update', 'delete', 'list']),
    ('fee_transactions', ['create', 'read', 'update', 'delete', 'list']),
    ('fee_receipts', ['create', 'read', 'update', 'delete', 'list']),
    ('fee_refunds', ['create', 'read', 'list', 'approve', 'process']),
]
```

**Script**: `scripts/fix_fee_permissions_complete.py` ✅ Already exists

---

### Example 3: Reports Module

**Resources**: `student_reports`, `staff_reports`, `reports`
**Actions**: `read`, `export`, `audit`

**Permission Definition:**

```python
REPORTS_PERMISSIONS = [
    ('student_reports', ['read', 'export']),
    ('staff_reports', ['read', 'export']),
    ('reports', ['read', 'audit']),
]
```

**Note**: Reports typically only need read/export, not full CRUD

---

### Example 4: Custom Actions

Some modules need special actions beyond standard CRUD:

```python
LEAVE_MANAGEMENT_PERMISSIONS = [
    ('leave_requests', ['create', 'read', 'update', 'delete', 'list']),
    ('leave_approvals', ['read', 'list', 'approve', 'reject']),  # Custom actions
    ('leave_reports', ['read', 'export']),
]

ATTENDANCE_PERMISSIONS = [
    ('attendance', ['create', 'read', 'update', 'list']),
    ('attendance_reports', ['read', 'export', 'process']),  # process = bulk operations
]
```

---

## 🔧 Common Scenarios

### Scenario 1: Adding Permissions to Existing Endpoint

**Situation**: Endpoint has permission checks in code, but getting 403 errors

**Steps:**

1. Identify resource name and actions from endpoint code
2. Create permission script using template
3. Run dry-run to verify
4. Execute live
5. Verify in database
6. Test endpoints

**Time**: ~20-30 minutes

---

### Scenario 2: Adding Permissions to New Endpoint

**Situation**: Creating brand new endpoint from scratch

**Steps:**

1. Create endpoint file with permission checks
2. Define resource name and actions
3. Add to `endpoint_resource_mapping.py`
4. Create permission script
5. Run script to add to database
6. Test endpoints

**Time**: ~45-60 minutes

---

### Scenario 3: Adding Custom Action

**Situation**: Need special action like "approve" or "export"

**Steps:**

1. Add action to endpoint permission check:

   ```python
   await check_role_plan_permission_with_error(
       db, request, role, 'resource_name', 'approve'
   )
   ```

2. Add action to permission definition:

   ```python
   ('resource_name', ['create', 'read', 'list', 'approve']),
   ```

3. Run permission script
4. Test endpoint

**Time**: ~15-20 minutes

---

### Scenario 4: Adding Permissions to Multiple Roles

**Situation**: Not just Admin, but Teacher and Accountant too

**Option 1 - Script Method (Recommended)**:

Modify the `get_admin_roles()` function to include other roles:

```python
async def get_all_roles(self, schema: str) -> List[dict]:
    """Get all relevant roles in tenant schema"""
    roles = await self.conn.fetch(f"""
        SELECT id, name, description
        FROM {schema}.roles
        WHERE LOWER(name) IN ('admin', 'teacher', 'accountant', 'principal')
        ORDER BY name
    """)
    return [dict(role) for role in roles]
```

**Option 2 - Manual SQL**:

```sql
-- Add permissions to Teacher role
INSERT INTO resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at)
SELECT
    gen_random_uuid(),
    (SELECT id FROM roles WHERE name = 'Teacher'),
    'resource_name',
    action_name,
    true,
    NOW(),
    NOW()
FROM unnest(ARRAY['read', 'list']) AS action_name
ON CONFLICT (role_id, resource, action) DO UPDATE
SET is_granted = true, updated_at = NOW();
```

---

## 🚨 Troubleshooting Guide

### Issue 1: Still Getting 403 After Adding Permissions

**Symptoms**:

- Script ran successfully
- Database shows permissions exist
- Still getting 403 Forbidden errors

**Solutions**:

1. **JWT Token Caching (Most Common)**

   ```
   ✅ Solution: Log out completely and log back in

   Why: JWT tokens cache permissions. Old token doesn't have new permissions.

   Steps:
   1. Log out from application
   2. Clear browser cache (optional)
   3. Close all browser tabs
   4. Log back in
   5. Test again
   ```

2. **Wrong Resource Name**

   ```
   ✅ Solution: Check resource name matches exactly

   Check endpoint code:
   await check_role_plan_permission_with_error(..., 'resource_name', ...)

   Check database:
   SELECT * FROM plan_resource_access WHERE resource_name = 'resource_name';
   SELECT * FROM resource_permissions WHERE resource = 'resource_name';

   They must match EXACTLY (case-sensitive).
   ```

3. **Wrong Tenant Schema**

   ```
   ✅ Solution: Verify you added to correct schema

   Check which schema your tenant uses:
   SELECT schema_name FROM public.tenants WHERE subdomain = 'your_school';

   Run script with correct schema:
   python scripts/fix_permissions.py --tenant correct_schema_name
   ```

4. **Missing Layer**

   ```
   ✅ Solution: Check both layers exist

   Layer 1 (Plan):
   SELECT * FROM public.plan_resource_access
   WHERE resource_name = 'resource_name' AND is_active = true;

   Layer 2 (Role):
   SELECT * FROM resource_permissions
   WHERE resource = 'resource_name' AND is_granted = true;

   Both must return results.
   ```

---

### Issue 2: Script Can't Auto-Detect Plan or Tenant

**Symptoms**:

```
✗ Could not auto-detect plan.
✗ Could not auto-detect tenant schema.
```

**Solutions**:

1. **Specify Manually**

   ```bash
   # Get plan ID
   psql -d your_db -c "SELECT id, name FROM public.plans WHERE is_active = true;"

   # Get tenant schema
   psql -d your_db -c "SELECT schema_name FROM information_schema.schemata
       WHERE schema_name NOT IN ('public', 'information_schema', 'pg_catalog');"

   # Run with explicit values
   python scripts/fix_permissions.py \
     --plan-id <plan_uuid> \
     --tenant <schema_name>
   ```

2. **Multiple Tenants**

   ```bash
   # If you have multiple tenants, run for each:
   python scripts/fix_permissions.py --tenant tenant1_schema
   python scripts/fix_permissions.py --tenant tenant2_schema
   python scripts/fix_permissions.py --tenant tenant3_schema
   ```

---

### Issue 3: Permission Already Exists Error

**Symptoms**:

```
IntegrityError: duplicate key value violates unique constraint
```

**Solution**:

```
✅ This is actually SAFE and expected!

The script uses ON CONFLICT to handle duplicates:
ON CONFLICT (role_id, resource, action) DO UPDATE SET is_granted = true

If you still see errors:
1. Check if script is from old version without ON CONFLICT
2. Update script from latest template
3. Script should handle duplicates gracefully
```

---

### Issue 4: Database Connection Error

**Symptoms**:

```
DATABASE_URL not found in environment
Connection refused
```

**Solutions**:

1. **Check .env file exists**

   ```bash
   # Verify .env file is in project root
   ls -la .env

   # Check DATABASE_URL is set
   cat .env | grep DATABASE_URL
   ```

2. **Verify DATABASE_URL format**

   ```bash
   # Correct format
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/database

   # For asyncpg connection (script handles conversion)
   # Script converts postgresql+asyncpg:// to postgresql://
   ```

3. **Test connection manually**

   ```bash
   psql postgresql://user:password@localhost:5432/database
   ```

---

### Issue 5: Script Fails on Specific Resource

**Symptoms**:

```
✗ Error adding plan permission resource_name: foreign key constraint
```

**Solutions**:

1. **Check Plan Exists**

   ```sql
   SELECT id, name FROM public.plans WHERE id = '<plan_uuid>';
   ```

2. **Check Resource Name Format**

   ```
   ✅ Valid: 'student_transport', 'fee_categories'
   ❌ Invalid: 'Student Transport', 'fee_categories ', 'fee categories'

   Rules:
   - All lowercase
   - Underscores (not spaces or hyphens)
   - No trailing/leading spaces
   - Singular or plural consistent with endpoint code
   ```

---

## 📊 Database Schema Reference

### Table 1: public.plan_resource_access

**Purpose**: Defines which features/resources are available in each subscription plan

```sql
CREATE TABLE public.plan_resource_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    resource_name VARCHAR(255) NOT NULL,
    actions TEXT[] NOT NULL,  -- Array of actions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(plan_id, resource_name)
);
```

**Example Rows**:

```sql
id                                   | plan_id      | resource_name     | actions                              | is_active
-------------------------------------|--------------|-------------------|--------------------------------------|----------
uuid-1                               | enterprise-id| student_transport | {create,read,update,delete,list}     | true
uuid-2                               | enterprise-id| fee_categories    | {create,read,update,delete,list}     | true
uuid-3                               | basic-id     | student_transport | {read,list}                          | true
```

**Key Points**:

- One row per plan per resource
- `actions` is an array (not separate rows)
- `is_active` allows disabling without deleting

---

### Table 2: {tenant}.resource_permissions

**Purpose**: Defines which actions specific roles can perform

```sql
CREATE TABLE resource_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id),
    resource VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    is_granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, resource, action)
);
```

**Example Rows**:

```sql
id      | role_id  | resource          | action | is_granted | created_at
--------|----------|-------------------|--------|------------|------------
uuid-1  | admin-id | student_transport | create | true       | 2026-02-09
uuid-2  | admin-id | student_transport | read   | true       | 2026-02-09
uuid-3  | admin-id | student_transport | update | true       | 2026-02-09
uuid-4  | admin-id | student_transport | delete | true       | 2026-02-09
uuid-5  | admin-id | student_transport | list   | true       | 2026-02-09
uuid-6  | teacher-id| student_transport| read   | true       | 2026-02-09
uuid-7  | teacher-id| student_transport| list   | true       | 2026-02-09
```

**Key Points**:

- One row per role per resource per action
- Separate rows for each action (not an array)
- Multiple roles can have same permission
- `is_granted` can be false to explicitly deny

---

## 🎓 Advanced Topics

### Adding Permissions via SQL (Without Script)

If you need to add permissions quickly without running the script:

```sql
-- ==================================================
-- LAYER 1: Add to Plan (Public Schema)
-- ==================================================

-- Add resource to plan (if doesn't exist)
INSERT INTO public.plan_resource_access (id, plan_id, resource_name, actions, is_active)
SELECT
    gen_random_uuid(),
    (SELECT id FROM public.plans WHERE name ILIKE '%enterprise%' LIMIT 1),
    'YOUR_RESOURCE_NAME',
    ARRAY['create', 'read', 'update', 'delete', 'list']::text[],
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.plan_resource_access
    WHERE plan_id = (SELECT id FROM public.plans WHERE name ILIKE '%enterprise%' LIMIT 1)
    AND resource_name = 'YOUR_RESOURCE_NAME'
);

-- Or update existing resource to add more actions
UPDATE public.plan_resource_access
SET actions = array_cat(actions, ARRAY['new_action']::text[]),
    updated_at = NOW()
WHERE plan_id = (SELECT id FROM public.plans WHERE name ILIKE '%enterprise%' LIMIT 1)
AND resource_name = 'YOUR_RESOURCE_NAME'
AND NOT ('new_action' = ANY(actions));

-- ==================================================
-- LAYER 2: Add to Role (Tenant Schema)
-- ==================================================

-- Add all CRUD permissions for Admin role
INSERT INTO resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at)
SELECT
    gen_random_uuid(),
    (SELECT id FROM roles WHERE name = 'Admin'),
    'YOUR_RESOURCE_NAME',
    action_name,
    true,
    NOW(),
    NOW()
FROM unnest(ARRAY['create', 'read', 'update', 'delete', 'list']) AS action_name
ON CONFLICT (role_id, resource, action) DO UPDATE
SET is_granted = true, updated_at = NOW();

-- Add read-only permissions for Teacher role
INSERT INTO resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at)
SELECT
    gen_random_uuid(),
    (SELECT id FROM roles WHERE name = 'Teacher'),
    'YOUR_RESOURCE_NAME',
    action_name,
    true,
    NOW(),
    NOW()
FROM unnest(ARRAY['read', 'list']) AS action_name
ON CONFLICT (role_id, resource, action) DO UPDATE
SET is_granted = true, updated_at = NOW();
```

---

### Bulk Operations: Adding Permissions to All Tenants

```sql
-- Script to add permissions to ALL tenant schemas

DO $$
DECLARE
    tenant_schema TEXT;
    admin_role_id UUID;
BEGIN
    -- Loop through all tenant schemas
    FOR tenant_schema IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('public', 'information_schema', 'pg_catalog', 'pg_toast')
        AND EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = schema_name AND table_name = 'roles'
        )
    LOOP
        RAISE NOTICE 'Processing schema: %', tenant_schema;

        -- Get Admin role ID for this tenant
        EXECUTE format('SELECT id FROM %I.roles WHERE name = ''Admin''', tenant_schema)
        INTO admin_role_id;

        IF admin_role_id IS NOT NULL THEN
            -- Add permissions
            EXECUTE format('
                INSERT INTO %I.resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at)
                SELECT
                    gen_random_uuid(),
                    $1,
                    $2,
                    action_name,
                    true,
                    NOW(),
                    NOW()
                FROM unnest(ARRAY[''create'', ''read'', ''update'', ''delete'', ''list'']) AS action_name
                ON CONFLICT (role_id, resource, action) DO UPDATE
                SET is_granted = true, updated_at = NOW()
            ', tenant_schema)
            USING admin_role_id, 'YOUR_RESOURCE_NAME';

            RAISE NOTICE 'Added permissions to schema: %', tenant_schema;
        ELSE
            RAISE NOTICE 'No Admin role found in schema: %', tenant_schema;
        END IF;
    END LOOP;
END $$;
```

---

### Removing Permissions

```sql
-- Remove from plan
DELETE FROM public.plan_resource_access
WHERE resource_name = 'resource_to_remove';

-- Or just deactivate
UPDATE public.plan_resource_access
SET is_active = false
WHERE resource_name = 'resource_to_remove';

-- Remove from role
DELETE FROM resource_permissions
WHERE resource = 'resource_to_remove';

-- Or set to not granted
UPDATE resource_permissions
SET is_granted = false
WHERE resource = 'resource_to_remove';
```

---

## 📝 Checklist for Adding New Module Permissions

Use this checklist every time you add permissions:

### Pre-Implementation

- [ ] Identify module/resource name
- [ ] List all required actions (create, read, update, delete, list, custom)
- [ ] Check if endpoints have permission checks in code
- [ ] Review existing similar modules for patterns

### Script Creation

- [ ] Copy template from `scripts/fix_fee_permissions_complete.py`
- [ ] Rename class to `Complete{Module}PermissionFixer`
- [ ] Update `{MODULE}_PERMISSIONS` list with your resources
- [ ] Update docstring and output messages
- [ ] Test script syntax: `python scripts/fix_{module}_permissions.py --help`

### Dry-Run Testing

- [ ] Run with `--dry-run` flag
- [ ] Verify output shows correct resources
- [ ] Verify output shows correct actions
- [ ] Check plan auto-detection works
- [ ] Check tenant auto-detection works
- [ ] Review any warnings or errors

### Live Execution

- [ ] Backup database (optional but recommended)
- [ ] Run script without `--dry-run`
- [ ] Monitor output for errors
- [ ] Check success message appears
- [ ] Note any failed permissions

### Database Verification

- [ ] Run plan permissions query (Layer 1)
- [ ] Verify 1+ rows returned with correct actions
- [ ] Run role permissions query (Layer 2)
- [ ] Verify 5+ rows returned (or actions × roles)
- [ ] Check `is_active = true` and `is_granted = true`

### Testing

- [ ] Log out from application completely
- [ ] Clear browser cache
- [ ] Log back in as Admin
- [ ] Test GET/LIST endpoint (should return 200)
- [ ] Test POST/CREATE endpoint (should return 201)
- [ ] Test PATCH/UPDATE endpoint (should return 200)
- [ ] Test DELETE endpoint (should return 204)
- [ ] Verify no 403 Forbidden errors

### Documentation

- [ ] Create README for this module (optional)
- [ ] Update this handover doc if needed
- [ ] Add entry to permission tracking sheet (if exists)
- [ ] Document any custom actions or special cases

### Git Commit

- [ ] Commit permission script
- [ ] Commit any documentation
- [ ] Use descriptive commit message: "Add {module} permissions to dual-layer system"

---

## 🔗 Quick Reference Links

### Key Files in COS360

| File                                                | Purpose                        |
| --------------------------------------------------- | ------------------------------ |
| `app/tools/simple_permissions.py`                   | Permission check functions     |
| `app/tools/endpoint_resource_mapping.py`            | Maps endpoints to resources    |
| `scripts/fix_fee_permissions_complete.py`           | Template script (BEST EXAMPLE) |
| `test_scripts/add_reports_permissions_corrected.py` | API-based permission addition  |
| `scripts/README_FEE_PERMISSIONS.md`                 | Documentation template         |

### Database Tables

| Table                  | Location          | Purpose                |
| ---------------------- | ----------------- | ---------------------- |
| `plan_resource_access` | `public` schema   | Plan-level permissions |
| `resource_permissions` | `{tenant}` schema | Role-level permissions |
| `plans`                | `public` schema   | Subscription plans     |
| `tenants`              | `public` schema   | Tenant configurations  |
| `roles`                | `{tenant}` schema | User roles             |

### Common Commands

```bash
# Test dry-run
python scripts/fix_{module}_permissions.py --dry-run

# Execute live
python scripts/fix_{module}_permissions.py

# Specify plan and tenant
python scripts/fix_{module}_permissions.py --plan-id UUID --tenant schema_name

# Get help
python scripts/fix_{module}_permissions.py --help

# Database queries
psql -d your_database -c "SELECT * FROM public.plan_resource_access WHERE resource_name = 'name';"
psql -d your_database -c "SELECT * FROM resource_permissions WHERE resource = 'name';"
```

---

## 📞 Support and Escalation

### Before Asking for Help

1. ✅ Read this entire document
2. ✅ Check the troubleshooting section
3. ✅ Verify you followed all steps
4. ✅ Run dry-run mode to check output
5. ✅ Check database to see what's actually there
6. ✅ Verify JWT token refresh (log out/in)

### When Reporting Issues

Include:

- Module/resource name you're adding
- Full script output (copy/paste)
- Database query results (plan and role layers)
- Endpoint code showing permission check
- Error messages (full text)
- What you've already tried

### Common Mistakes (Check First!)

| Mistake                | Solution                        |
| ---------------------- | ------------------------------- |
| Forgot to log out/in   | Log out completely, log back in |
| Resource name mismatch | Check endpoint code vs database |
| Wrong tenant schema    | Verify schema name              |
| Typo in resource name  | Double-check spelling/case      |
| Script not updated     | Use latest template             |
| Missing .env file      | Check DATABASE_URL              |

---

## 🎯 Success Criteria

Your implementation is successful when:

- ✅ Script runs without errors in dry-run mode
- ✅ Script runs without errors in live mode
- ✅ Database queries show permissions in both layers
- ✅ All API endpoints return 200/201/204 (not 403)
- ✅ Different roles have appropriate permissions
- ✅ Tests pass (if you have automated tests)
- ✅ Documentation updated
- ✅ Changes committed to git

---

## 📚 Appendix

### A. Standard HTTP Status Codes

| Code                      | Meaning                | When You'll See It          |
| ------------------------- | ---------------------- | --------------------------- |
| 200 OK                    | Success                | GET, PATCH successful       |
| 201 Created               | Resource created       | POST successful             |
| 204 No Content            | Success, no data       | DELETE successful           |
| 400 Bad Request           | Invalid data           | Validation failed           |
| 401 Unauthorized          | Not logged in          | Missing/invalid token       |
| 403 Forbidden             | No permission          | **Permission check failed** |
| 404 Not Found             | Resource doesn't exist | Wrong ID/URL                |
| 500 Internal Server Error | Server error           | Bug in code                 |

### B. PostgreSQL Array Operations

```sql
-- Check if action exists in array
SELECT * FROM plan_resource_access
WHERE 'create' = ANY(actions);

-- Add action to array (if not exists)
UPDATE plan_resource_access
SET actions = array_append(actions, 'new_action')
WHERE NOT ('new_action' = ANY(actions));

-- Remove action from array
UPDATE plan_resource_access
SET actions = array_remove(actions, 'old_action');

-- Get all unique actions across all resources
SELECT DISTINCT unnest(actions) as action
FROM plan_resource_access
ORDER BY action;
```

### C. JWT Token Structure

```json
{
  "user_id": "uuid",
  "username": "admin@school.com",
  "role": "Admin",
  "role_id": "uuid",
  "tenant_id": "uuid",
  "plan_id": "uuid",
  "permissions": {
    "student_transport": ["create", "read", "update", "delete", "list"],
    "fee_categories": ["create", "read", "update", "delete", "list"]
  },
  "exp": 1707484800
}
```

**Note**: Permissions are cached in JWT until token expires or user logs out/in.

### D. Useful SQL Queries

```sql
-- List all resources in a plan
SELECT resource_name, actions
FROM public.plan_resource_access
WHERE plan_id = (SELECT id FROM public.plans WHERE name ILIKE '%enterprise%')
AND is_active = true
ORDER BY resource_name;

-- List all permissions for a role
SELECT resource, action, is_granted
FROM resource_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'Admin')
ORDER BY resource, action;

-- Find resources with incomplete permissions
SELECT resource_name, actions
FROM public.plan_resource_access
WHERE array_length(actions, 1) < 5  -- Expecting 5 CRUD actions
AND resource_name NOT LIKE '%report%';  -- Reports might have fewer

-- Count permissions by role
SELECT
    r.name,
    COUNT(*) as permission_count
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE rp.is_granted = true
GROUP BY r.name
ORDER BY permission_count DESC;

-- Find permissions in plan but not in role
SELECT pra.resource_name, unnest(pra.actions) as action
FROM public.plan_resource_access pra
CROSS JOIN roles r
WHERE r.name = 'Admin'
AND pra.is_active = true
EXCEPT
SELECT rp.resource, rp.action
FROM resource_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'Admin'
AND rp.is_granted = true;
```

---

## Known Permission Fixes and Bug History

### Student/Parent Role: Missing `student_admissions:list_own` / `list_related` (March 2026)

**Symptom**: Student and Parent roles received `403 Access Denied` on the Student Admissions page even after `student_admissions:read_own` / `read_related` was seeded.

**Root cause**: The list endpoint `GET /students/admission/` calls:

```python
check_user_resource_access(db, request, 'student_admissions', 'list')
```

`_determine_access_scope` checks in order: `list_own` → `list_related` → `list`. Student only had `read_own` and Parent only had `read_related` — no `list_*` variant existed → "denied" → 403.

**Fix applied**:

- Added `("student_admissions", "list_own")` to Student permissions in `seed_endpoints.py` and `reseed_student_parent_permissions.py`
- Added `("student_admissions", "list_related")` to Parent permissions in both files
- Ran `scripts/reseed_student_parent_permissions.py` — DB now has 29 Student permissions and 21 Parent permissions

**Student Admissions behaviour after fix**:

| Role | `GET /students/admission/` response |
| ---- | ---------------------------------- |
| Student | Returns a list containing only the logged-in student's own admission record |
| Parent | Returns a list of all linked children's admission records |
| Admin/Teacher/Staff | Returns all admissions (paginated) |

**Lesson**: When seeding `read_own`, also always seed `list_own`. Same applies to `_related`. The `read` and `list` scopes are checked by completely different endpoints and must be granted separately.

---

### Teacher Role: Missing `student_admissions:list` (March 2026)

**Symptom**: Teacher role received `403 Forbidden` when accessing the student list page (`GET /students/admission/`), even though Teacher had `student_admissions:read`.

**Root cause**: `read` and `list` are separate, independent permissions. The `GET /students/admission/` (list all) and `GET /students/admission/search` endpoints call:

```python
check_user_resource_access(db, request, 'student_admissions', 'list')
```

While `GET /students/admission/id/{student_id}` calls:

```python
check_user_resource_access(db, request, 'student_admissions', 'read')
```

Having `read` does NOT grant `list`. A Teacher with only `student_admissions:read` can fetch a single student by ID, but cannot access the list or search endpoints — they are protected by a completely separate permission entry in `resource_permissions`.

**Fix applied**:

- Added `("student_admissions", "list")` to Teacher permissions in `app/api/v1/auth/seed_endpoints.py`
- Inserted the permission directly into `test_tenant_schema.resource_permissions`

**Teacher permissions for `student_admissions` — before and after**:

| Action | Before Fix | After Fix |
| ------ | ---------- | --------- |
| `read` | granted    | granted   |
| `list` | missing    | granted   |

**Important principle — `read` vs `list` distinction**:

| Action | Protects                                          | Example endpoint                       |
| ------ | ------------------------------------------------- | -------------------------------------- |
| `read` | Fetching a single record by ID                    | `GET /students/admission/id/{id}`      |
| `list` | Fetching all records or searching across records  | `GET /students/admission/`             |
| `list` | Search endpoints                                  | `GET /students/admission/search`       |

Always check whether a role needs both `read` AND `list` when granting access to a resource. Granting only `read` will still result in 403 on any list or search endpoint.

**SQL to apply the fix manually**:

```sql
INSERT INTO resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at)
SELECT
    gen_random_uuid(),
    (SELECT id FROM roles WHERE name = 'Teacher'),
    'student_admissions',
    'list',
    true,
    NOW(),
    NOW()
ON CONFLICT (role_id, resource, action) DO UPDATE
SET is_granted = true, updated_at = NOW();
```

---

## 🎬 Final Notes

### Remember

1. **Always test in dry-run first**
2. **Always log out and back in after adding permissions**
3. **Both layers must exist for permissions to work**
4. **Resource names are case-sensitive**
5. **JWT tokens cache permissions**

### Quick Start Recap

```bash
# 1. Copy template
cp scripts/fix_fee_permissions_complete.py scripts/fix_mymodule_permissions.py

# 2. Edit permissions list
# Change {MODULE}_PERMISSIONS = [...]

# 3. Test
python scripts/fix_mymodule_permissions.py --dry-run

# 4. Execute
python scripts/fix_mymodule_permissions.py

# 5. Verify
psql -d db -c "SELECT * FROM plan_resource_access WHERE resource_name = 'mymodule';"
psql -d db -c "SELECT * FROM resource_permissions WHERE resource = 'mymodule';"

# 6. Test endpoints
# Log out → Log in → Test API calls

# 7. Done! 🎉
```

---

**Document Version**: 1.1
**Last Updated**: 2026-03-04
**Maintainer**: System Architecture Team
**Next Review**: When permission system changes

---

## 📎 Document Change Log

| Date       | Version | Changes                                                                               | Author            |
| ---------- | ------- | ------------------------------------------------------------------------------------- | ----------------- |
| 2026-02-09 | 1.0     | Initial creation                                                                      | Claude Code Agent |
| 2026-03-04 | 1.1     | Add Teacher role `student_admissions:list` fix; document `read` vs `list` distinction | Claude Code Agent |
| 2026-03-04 | 1.2     | Fix Parent children endpoint: use sub (UUID) not id; self-owned access patterns added | Claude Code Agent |
| 2026-03-04 | 1.3     | Add Student `student_admissions:list_own` and Parent `student_admissions:list_related`; add Student/Parent menu filtering (13 menus only); add Student `profile:read_own` / `profile:update_own`; add Student/Parent `student_transport:read_own` / `read_related` | Claude Code Agent |

---

**This document is the single source of truth for adding permissions in COS360.**

**Bookmark this page. Share it with your team. Keep it updated.**

🚀 Good luck adding permissions!
