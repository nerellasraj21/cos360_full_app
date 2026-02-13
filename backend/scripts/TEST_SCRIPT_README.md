# Fix Fee Permissions - Test Environment

## Simple Test Script

**File:** `fix_fee_permissions_test.py`

**What it does:** Adds all fee management permissions to Admin roles in `test_tenant_schema`

**Schema:** Hardcoded to `test_tenant_schema` (no auto-detection)

## Usage

### 1. Preview Changes (Dry Run)

```bash
python scripts/fix_fee_permissions_test.py --dry-run
```

### 2. Apply Changes

```bash
python scripts/fix_fee_permissions_test.py
```

### 3. Log Out and Log Back In

**CRITICAL:** After running the script, you MUST log out and log back in for the permissions to take effect!

## What Gets Fixed

The script adds **47 permissions** to Admin roles in `test_tenant_schema`:

- fee_categories (5 actions)
- fee_types (5 actions)
- fee_terms (5 actions)
- fee_class_mappings (5 actions)
- fee_student_mappings (5 actions)
- **fee_class_mapping_term_amounts (5 actions)** ← Fixes your 403 error
- fee_transactions (5 actions)
- fee_receipts (5 actions)
- fee_refunds (5 actions)
- fee_reports (2 actions)

## Expected Output

### Dry Run Output:

```
======================================================================
Fee Permissions Fix - test_tenant_schema
======================================================================
Date: 2026-02-06 11:00:00
Schema: test_tenant_schema
Mode: DRY-RUN (no changes)
======================================================================

✓ Schema 'test_tenant_schema' found

Found 1 admin role(s):
  • Admin (a1b2c3d4-e5f6-7890-abcd-ef1234567890)

======================================================================
Processing: Admin
======================================================================
  Missing: 5 permission(s)

    [DRY-RUN] Would add: Admin -> fee_class_mapping_term_amounts:create
    [DRY-RUN] Would add: Admin -> fee_class_mapping_term_amounts:read
    [DRY-RUN] Would add: Admin -> fee_class_mapping_term_amounts:update
    [DRY-RUN] Would add: Admin -> fee_class_mapping_term_amounts:delete
    [DRY-RUN] Would add: Admin -> fee_class_mapping_term_amounts:list

======================================================================
SUMMARY
======================================================================
Schema: test_tenant_schema
Admin roles: 1
Permissions already existing: 42
Permissions to add: 5

This was a dry-run. Run without --dry-run to apply changes.
```

### Live Execution Output:

```
======================================================================
Fee Permissions Fix - test_tenant_schema
======================================================================
Date: 2026-02-06 11:05:00
Schema: test_tenant_schema
Mode: LIVE
======================================================================

✓ Schema 'test_tenant_schema' found

Found 1 admin role(s):
  • Admin (a1b2c3d4-e5f6-7890-abcd-ef1234567890)

======================================================================
Processing: Admin
======================================================================
  Missing: 5 permission(s)

    ✓ Added: Admin -> fee_class_mapping_term_amounts:create
    ✓ Added: Admin -> fee_class_mapping_term_amounts:read
    ✓ Added: Admin -> fee_class_mapping_term_amounts:update
    ✓ Added: Admin -> fee_class_mapping_term_amounts:delete
    ✓ Added: Admin -> fee_class_mapping_term_amounts:list

======================================================================
SUMMARY
======================================================================
Schema: test_tenant_schema
Admin roles: 1
Permissions already existing: 42
Permissions added: 5
Permissions failed: 0

======================================================================
✓ SUCCESS - Permissions added to test_tenant_schema!
======================================================================

⚠️  IMPORTANT: Log out and log back in!
    JWT tokens cache permissions.

Next steps:
  1. Log out from the application
  2. Log back in
  3. Test POST to /api/v1/fee/class-mapping-term-amounts/
```

## Verification

After running the script and logging back in, verify it worked:

```sql
-- Check permissions were added
SELECT
    r.name as role_name,
    rp.resource,
    rp.action,
    rp.is_granted
FROM test_tenant_schema.resource_permissions rp
JOIN test_tenant_schema.roles r ON rp.role_id = r.id
WHERE rp.resource = 'fee_class_mapping_term_amounts'
ORDER BY rp.action;
```

**Expected result:** 5 rows showing create, delete, list, read, update

## Troubleshooting

### Error: "Schema 'test_tenant_schema' not found"

**Cause:** Your test schema has a different name

**Solution:** Check your schema names:
```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('public', 'information_schema', 'pg_catalog', 'pg_toast');
```

If your schema is named differently, use the complete script instead:
```bash
python scripts/fix_fee_permissions.py --tenant your_schema_name
```

### Error: "No admin roles found"

**Cause:** No roles with 'admin' in the name exist

**Solution:** Check your roles:
```sql
SELECT id, name FROM test_tenant_schema.roles;
```

### Still getting 403 after running script

**Most common cause:** You didn't log out and log back in!

**Solution:**
1. Log out completely from the application
2. Close all browser tabs
3. Log back in
4. Try the request again

**Other causes:**
- Check you're logged in as an Admin user
- Verify the JWT token has the new permissions (decode at jwt.io)
- Check browser console for the actual error message

## Requirements

- Python 3.7+
- asyncpg library: `pip install asyncpg`
- python-dotenv library: `pip install python-dotenv`
- `.env` file with `DATABASE_URL`

## Configuration

The script reads `DATABASE_URL` from your `.env` file:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost/database
```

## Safety Features

- ✓ Uses `ON CONFLICT` to prevent duplicate permissions
- ✓ Dry-run mode to preview changes
- ✓ Clear output showing exactly what will be changed
- ✓ Safe to run multiple times (idempotent)

## What It Does NOT Do

- Does NOT auto-detect schema (always uses test_tenant_schema)
- Does NOT modify public schema plan permissions
- Does NOT work on production (use fix_fee_permissions_complete.py for that)
- Does NOT require you to specify plan ID or tenant name

## Quick Reference

```bash
# Preview what will be fixed
python scripts/fix_fee_permissions_test.py --dry-run

# Apply the fix
python scripts/fix_fee_permissions_test.py

# Get help
python scripts/fix_fee_permissions_test.py --help
```

## Next Steps After Running

1. ✅ Script completes successfully
2. ✅ Log out from application
3. ✅ Log back in
4. ✅ Test endpoint: `POST /api/v1/fee/class-mapping-term-amounts/`
5. ✅ Should return 201 Created instead of 403 Forbidden

## Related Documentation

- [Dual-Layer Permission System](DUAL_LAYER_PERMISSIONS.md) - Understanding the architecture
- [Which Script To Use](WHICH_SCRIPT_TO_USE.md) - Choosing the right script
- [Complete Documentation](README_FEE_PERMISSIONS.md) - Full guide for all scripts
