# Permission Troubleshooting Guide for 403 Forbidden Errors

## Problem
Getting **403 Forbidden** errors when accessing route types and trip types endpoints:
- `GET /api/v1/masters/route-types/dropdown`
- `GET /api/v1/masters/trip-types/dropdown`
- Other route/trip type endpoints

## Root Cause
Your user role doesn't have the required permissions for `route_types` and `trip_types` resources.

## ⚠️ CRITICAL DISCOVERY: Multi-Tenant Schema Issue

**Important:** The original `add_route_trip_type_permissions.sql` script added permissions to the **public schema**, but your application checks permissions in the **tenant schema**!

- Your system uses **schema-per-tenant architecture**
- The `Role` and `ResourcePermission` models extend `BaseOrg` (tenant-scoped)
- Runtime permission checks query `{tenant_schema}.resource_permissions`, NOT `public.resource_permissions`

**Solution:** Use the correct script: `add_route_trip_type_permissions_TENANT.sql`

---

## Step-by-Step Fix

### Step 1: Run Verification Script
```bash
psql -U your_username -d your_database -f verify_route_trip_permissions.sql
```

This will show you:
1. If resource permissions exist in the database
2. Which roles have the permissions
3. What your current role is
4. If your role has the required permissions

---

### Step 2: Interpret Results

#### Scenario A: No resource permissions found (Step 1 shows 0 rows)
**Problem**: The `add_route_trip_type_permissions.sql` script was never run.

**Solution**:
```bash
psql -U your_username -d your_database -f add_route_trip_type_permissions.sql
```

Then **refresh your browser or re-login** to get new permissions.

---

#### Scenario B: Permissions exist, but your role doesn't have them
**Problem**: Permissions are in the database, but not granted to your role.

**Solution**:

1. Find your role name from Step 4 of the verification script
2. Edit `verify_route_trip_permissions.sql` - go to Step 6
3. Uncomment the DO block and replace `'YourRoleName'` with your actual role name:
   ```sql
   target_role_name VARCHAR := 'Admin'; -- Replace with your actual role
   ```
4. Run the script again:
   ```bash
   psql -U your_username -d your_database -f verify_route_trip_permissions.sql
   ```
5. **IMPORTANT**: Refresh browser or re-login for permissions to take effect

---

#### Scenario C: Permissions exist for your role, but still getting 403
**Problem**: Cached token or session issue.

**Solution**:
1. **Clear browser cache** and cookies for your application
2. **Logout completely** from the application
3. **Login again** - this will generate a new token with updated permissions
4. Try accessing the endpoint again

---

### Step 3: Quick Manual Permission Grant (Alternative Method)

If the scripts aren't working, manually grant permissions using pgAdmin or psql:

```sql
-- 1. Find your role ID
SELECT id, role_name FROM public.roles WHERE role_name = 'YourRoleName';

-- 2. Grant all route_types permissions (replace the UUID with your role_id)
INSERT INTO public.role_resource_permissions (role_id, resource_name, action_name, created_at, updated_at)
VALUES
    ('YOUR-ROLE-ID-HERE', 'route_types', 'create', NOW(), NOW()),
    ('YOUR-ROLE-ID-HERE', 'route_types', 'read', NOW(), NOW()),
    ('YOUR-ROLE-ID-HERE', 'route_types', 'update', NOW(), NOW()),
    ('YOUR-ROLE-ID-HERE', 'route_types', 'delete', NOW(), NOW()),
    ('YOUR-ROLE-ID-HERE', 'route_types', 'list', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3. Grant all trip_types permissions
INSERT INTO public.role_resource_permissions (role_id, resource_name, action_name, created_at, updated_at)
VALUES
    ('YOUR-ROLE-ID-HERE', 'trip_types', 'create', NOW(), NOW()),
    ('YOUR-ROLE-ID-HERE', 'trip_types', 'read', NOW(), NOW()),
    ('YOUR-ROLE-ID-HERE', 'trip_types', 'update', NOW(), NOW()),
    ('YOUR-ROLE-ID-HERE', 'trip_types', 'delete', NOW(), NOW()),
    ('YOUR-ROLE-ID-HERE', 'trip_types', 'list', NOW(), NOW())
ON CONFLICT DO NOTHING;
```

Then **re-login** to your application.

---

## Step 4: Verify Tables Exist

Make sure the `route_types` and `trip_types` tables exist:

```sql
-- Check if tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('route_types', 'trip_types');

-- If tables don't exist, run:
-- psql -U your_username -d your_database -f create_dynamic_types_tables.sql
```

---

## Step 5: Test API Endpoints

After applying permissions and re-logging in, test with curl:

### Test Route Types Dropdown
```bash
curl -X GET "http://localhost:8000/api/v1/masters/route-types/dropdown" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response:
```json
[
  {"type_name": "Upward"},
  {"type_name": "Downward"}
]
```

### Test Trip Types Dropdown
```bash
curl -X GET "http://localhost:8000/api/v1/masters/trip-types/dropdown" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response:
```json
[
  {"type_name": "First Trip"},
  {"type_name": "Second Trip"}
]
```

If you get **200 OK** with data → Permissions are working! ✅

If you still get **403 Forbidden** → Continue to Step 6.

---

## Step 6: Check Permission Validation Code

The backend uses `check_role_plan_permission_with_error()` function. Verify it's checking the right resources:

In your endpoints (route_type_endpoints.py and trip_type_endpoints.py):
```python
# Should be exactly these resource names:
await check_role_plan_permission_with_error(db, request, role, 'route_types', 'list')
await check_role_plan_permission_with_error(db, request, role, 'trip_types', 'list')
```

If the code says `'route_type'` (singular) instead of `'route_types'` (plural), that's the issue.

---

## Step 7: Check Token Payload

The permission system gets the role from the JWT token. Check your token:

```python
# Quick debug endpoint you can add temporarily
@router.get("/debug/my-permissions")
async def debug_permissions(request: Request):
    from app.tools.simple_permissions import get_current_user_token
    user = await get_current_user_token(request)
    return {
        "user_id": user.get('user_id'),
        "role": user.get('role'),
        "email": user.get('email')
    }
```

Call this endpoint to see what role your token has.

---

## Common Mistakes

1. ❌ **Not re-logging in after adding permissions**
   - Permissions are loaded into JWT token at login time
   - Must logout and login again to get new permissions

2. ❌ **Running scripts on wrong database**
   - Make sure you're running on the correct environment (dev/staging/prod)

3. ❌ **Resource name mismatch**
   - Must be `'route_types'` and `'trip_types'` (plural, with underscore)
   - NOT `'route-types'` or `'routeTypes'` or `'route_type'`

4. ❌ **Wrong schema**
   - Permissions must be in `public` schema (shared across tenants)
   - NOT in tenant-specific schema

5. ❌ **Tables not created**
   - Must run `create_dynamic_types_tables.sql` first
   - Then run `add_route_trip_type_permissions.sql`

---

## Quick Checklist

- [ ] `route_types` and `trip_types` tables exist in database
- [ ] Resource permissions exist in `public.resource_permissions` table
- [ ] Your role has permissions in `public.role_resource_permissions` table
- [ ] You logged out and logged back in after adding permissions
- [ ] Token contains your correct role name
- [ ] Backend code uses correct resource names ('route_types', 'trip_types')
- [ ] Frontend sends Authorization header with Bearer token

---

## Still Not Working?

If you've completed all steps and still getting 403:

1. **Check backend logs** - look for permission validation errors
2. **Verify database connection** - are you pointing to the right database?
3. **Check if permission system is enabled** - maybe it's bypassed in development?
4. **Test with a super_admin role** - if that works, it's definitely a permission issue
5. **Check for typos** - resource names, action names, table names must match exactly

---

## Success Indicators

✅ You should see **200 OK** responses
✅ Dropdown should populate with "Upward", "Downward" for route types
✅ Dropdown should populate with "First Trip", "Second Trip" for trip types
✅ You can create new types via POST endpoints
✅ No more 403 or 422 errors in browser console

---

## Contact Backend Developer

If all else fails, provide this info to your backend developer:

```
User Email: [your email]
Role Name: [your role from Step 4]
Error: 403 Forbidden on /api/v1/masters/route-types/dropdown
Token: [first 20 characters of your token]
Database: [which database/environment]

Already tried:
- [ ] Ran create_dynamic_types_tables.sql
- [ ] Ran add_route_trip_type_permissions.sql
- [ ] Verified permissions in database
- [ ] Logged out and back in
- [ ] Cleared browser cache
```

This will help them debug the issue quickly.
