# Quick Fix for 403 Forbidden Errors - Route Types & Trip Types

## 🚨 The Problem

You're getting **403 Forbidden** errors because the original permission script added permissions to the wrong database schema.

### Why This Happened

Your system uses **multi-tenant architecture** with separate schemas per tenant:
- ❌ The old script (`add_route_trip_type_permissions.sql`) added permissions to `public` schema
- ✅ But your app checks permissions in `{tenant_schema}` schema (e.g., `tenant_abc.resource_permissions`)

**Result:** Permissions exist in the wrong place, so your role can't see them → 403 Forbidden

---

## ✅ The Fix (5 Minutes)

### Step 1: Identify Your Tenant Schema

Find out which tenant schema you're using:

```sql
-- Connect to your database and run:
SELECT current_schema();

-- Or check all available schemas:
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'public');
```

Your tenant schema might be named something like:
- `tenant_abc`
- `school_xyz`
- Your client/organization name

### Step 2: Set Your Search Path

Connect to your tenant schema:

```sql
-- Replace 'your_tenant_name' with your actual tenant schema
SET search_path TO your_tenant_name, public;

-- Verify you're in the right schema:
SELECT current_schema();
```

### Step 3: Run the Correct Permission Script

```bash
# Make sure you're connected to your tenant schema first!
psql -U your_username -d your_database -f add_route_trip_type_permissions_TENANT.sql
```

**Or if using pgAdmin:**
1. Connect to your database
2. Open Query Tool
3. Run: `SET search_path TO your_tenant_name, public;`
4. Copy-paste contents of `add_route_trip_type_permissions_TENANT.sql`
5. Execute

### Step 4: Verify Permissions Were Added

```sql
-- Check if permissions exist for your role
SELECT
    r.name as role_name,
    rp.resource,
    rp.action,
    rp.is_granted
FROM resource_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE rp.resource IN ('route_types', 'trip_types')
  AND r.name = 'YourRoleName'  -- Replace with your actual role name
ORDER BY rp.resource, rp.action;
```

**Expected result:** You should see 10 rows (5 for route_types, 5 for trip_types)

If you see **0 rows**, the script didn't work or you're in the wrong schema.

### Step 5: Re-Login to Your Application

**CRITICAL:** Permissions are loaded into your JWT token at login time.

1. **Logout completely** from the application
2. **Clear browser cache** (optional but recommended)
3. **Login again**
4. Try accessing the route types dropdown

---

## 🧪 Test If It Worked

### Test 1: Browser Console Test

Open your browser's Developer Console (F12) and run:

```javascript
// Get your token
const token = localStorage.getItem('token'); // Adjust key name if different

// Test route types dropdown
fetch('http://localhost:8000/api/v1/masters/route-types/dropdown', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log('Route Types:', data))
.catch(err => console.error('Error:', err));
```

**Success:** You should see:
```json
[
  {"type_name": "Upward"},
  {"type_name": "Downward"}
]
```

**Still failing?** Continue to troubleshooting section below.

### Test 2: Check Your Role in Token

```javascript
// Decode your JWT token to see what role you have
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Your role:', payload.role);
console.log('Full token:', payload);
```

Make sure the role name matches exactly what you granted permissions to.

---

## 🔍 Still Not Working? Troubleshooting

### Issue 1: "I don't know my tenant schema name"

**Solution:** Ask your backend developer or DBA, OR run this query:

```sql
-- Find your tenant schema by looking at the search_path
SHOW search_path;

-- Or check which schemas have the 'roles' table
SELECT schemaname, tablename
FROM pg_tables
WHERE tablename = 'roles'
  AND schemaname != 'public';
```

### Issue 2: "I don't know my role name"

**Solution:** Run this query in your tenant schema:

```sql
-- Find your user and role
SELECT
    u.email,
    u.username,
    r.name as role_name
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.email = 'your.email@example.com';  -- Replace with your email
```

### Issue 3: "Script says role not found"

**Solution:** Check if you have admin-type roles:

```sql
-- List all roles in your tenant schema
SELECT id, name, description
FROM roles
ORDER BY name;
```

If you need to grant to a specific role, edit the script and uncomment Step 5 section.

### Issue 4: "Permissions show in database but still 403"

**Possible causes:**

1. **Token not refreshed:**
   - Must logout and login again (clearing browser cache helps too)
   - Permissions are baked into JWT at login time

2. **Wrong tenant schema:**
   - Verify your app is connecting to the same schema where you added permissions
   - Check database connection config in your `.env` file

3. **Different role name in token vs database:**
   - Token says "Admin" but database has "Administrator"
   - Names must match exactly (case-sensitive!)

4. **Tables don't exist:**
   - Run: `SELECT * FROM route_types LIMIT 1;`
   - If error, run `create_dynamic_types_tables.sql` first

---

## 📋 Quick Checklist

Before asking for help, verify:

- [ ] Ran `create_dynamic_types_tables.sql` (tables exist)
- [ ] Connected to correct **tenant schema** (not public!)
- [ ] Ran `add_route_trip_type_permissions_TENANT.sql` in tenant schema
- [ ] Verified permissions exist in database for your role
- [ ] **Logged out and back in** after adding permissions
- [ ] Token contains correct role name
- [ ] Frontend sends Authorization header with Bearer token
- [ ] Backend code uses correct resource names ('route_types', 'trip_types')

---

## 🎯 Expected Behavior After Fix

✅ No more 403 or 422 errors
✅ Dropdown shows: "Upward", "Downward" for route types
✅ Dropdown shows: "First Trip", "Second Trip" for trip types
✅ Can type new value and press Enter to create new type
✅ New types appear immediately in dropdown
✅ Form only submits when clicking "Add Route" button
✅ Success message shows: "Route 'xyz' has been successfully created"

---

## 🆘 Need More Help?

If still not working after following all steps:

1. Read the full guide: `PERMISSION_TROUBLESHOOTING_GUIDE.md`
2. Run verification script: `verify_route_trip_permissions.sql`
3. Check backend logs for detailed error messages
4. Contact your backend developer with:
   - Your email/username
   - Your role name
   - Which tenant schema you're using
   - Results from the verification query in Step 4

---

## 📝 Summary of Files

- `create_dynamic_types_tables.sql` - Creates route_types and trip_types tables (run once in tenant schema)
- `add_route_trip_type_permissions_TENANT.sql` - Adds permissions (run in tenant schema) ⭐ USE THIS ONE
- `add_route_trip_type_permissions.sql` - OLD script for public schema (don't use)
- `verify_route_trip_permissions.sql` - Diagnostic queries
- `PERMISSION_TROUBLESHOOTING_GUIDE.md` - Detailed troubleshooting
- `FIX_403_QUICK_START.md` - This file (quick fix guide)
