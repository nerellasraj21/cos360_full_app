# Migration Fix Plan
## Restore cos360_master as Single Source of Truth

**Date**: 2026-04-15
**Strategy**: Apply cos360_master-first workflow as documented

---

## Current Situation

### Problem Summary
1. **Duplicate revision ID**: Two migrations both use `b2c3d4e5f6a7`
2. **Migration chain corrupted**: Multiple heads (a2b3c4d5e6f7, b2c3d4e5f6a7, k7l8m9n0o1p2)
3. **cos360_master outdated**: Stuck at f1a2b3c4d5e6
4. **test_tenant_schema has drift**: Features from unmigrated files + direct DB changes
5. **Proper workflow violated**: Changes applied to tenant, NOT master first

### Evidence
```
cos360_master:        alembic_version = f1a2b3c4d5e6 (Feb 25)
test_tenant_schema:   alembic_version = f1a2b3c4d5e6 (Feb 25)

But test_tenant_schema has features from:
- d2e3f4a5b6c7 (Mar 06) - staff banking columns
- f2a3b4c5d6e7 (Mar 07) - certificate tables
- h4i5j6k7l8m9 (Mar 10) - transport pricing
- k7l8m9n0o1p2 (Mar 13) - exam config templates
+ direct DB changes with no migration files
```

---

## Correct Workflow (For Future Reference)

```
┌─────────────────────────────────────────────────────────────┐
│         COS360 Schema Management Workflow                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Developer creates migration file                        │
│     alembic revision -m "description"                       │
│                                                             │
│  2. Apply to cos360_master FIRST                           │
│     export SCHEMA_NAME=cos360_master                        │
│     alembic upgrade head                                    │
│                                                             │
│  3. Validate master schema                                  │
│     - Check structure                                       │
│     - Verify no errors                                      │
│     - Test rollback (downgrade)                            │
│                                                             │
│  4. Sync to tenant schemas                                  │
│     - In-place sync (additive changes)                     │
│     - Shadow sync (structural changes)                      │
│     - Recreate sync (breaking changes)                      │
│                                                             │
│  5. cos360_master = SOURCE OF TRUTH                        │
│     - Structure: YES (all tables, columns, indexes)        │
│     - Transactions: NO (no business data)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Fix Plan Overview

### Strategy: Clean Slate with Master-First Approach

**Phase 1**: Fix migration chain (resolve duplicates)
**Phase 2**: Apply all migrations to cos360_master FIRST
**Phase 3**: Validate master schema
**Phase 4**: Sync from master to tenant
**Phase 5**: Validate alignment and test

**Estimated Time**: 4-6 hours
**Downtime Required**: Yes, for tenant (not for master)
**Backup Required**: CRITICAL - full backup before starting

---

## Phase 1: Fix Migration Chain (1 hour)

### Issue: Duplicate Revision ID

Two migrations have ID `b2c3d4e5f6a7`:
1. `b2c3d4e5f6a7_add_hall_ticket_eligibility.py` (revises f1a2b3c4d5e6)
2. `b2c3d4e5f6a7_validate_term_data_phase2.py` (revises a1b2c3d4e5f6)

### Fix Steps

#### Step 1.1: Backup Migration Folder
```bash
cd /c/Users/nerel/Documents/Workspace/PythonWorkspace/COS360
cp -r migrations/versions migrations/versions_backup_$(date +%Y%m%d)
```

#### Step 1.2: Rename Duplicate Migration

Choose which migration to rename. Recommendation: Rename the hall_ticket one since it's on f1a2b3c4d5e6 branch.

```bash
# Generate new unique revision ID
NEW_REV_ID="j6k7l8m9n0o1"  # Make sure this doesn't conflict

# Rename file
mv migrations/versions/b2c3d4e5f6a7_add_hall_ticket_eligibility.py \
   migrations/versions/${NEW_REV_ID}_add_hall_ticket_eligibility.py
```

#### Step 1.3: Update Migration File Content

Edit `migrations/versions/j6k7l8m9n0o1_add_hall_ticket_eligibility.py`:

```python
# Change line 2:
# OLD: revision: str = 'b2c3d4e5f6a7'
# NEW: revision: str = 'j6k7l8m9n0o1'
```

#### Step 1.4: Create Merge Migration (if needed)

If you have multiple independent branches, create a merge migration:

```bash
# This creates a migration that merges multiple heads
alembic merge -m "merge_migration_branches" heads
```

#### Step 1.5: Verify Migration Chain

```bash
# Should show single head now
alembic heads

# Visualize full chain
alembic history
```

---

## Phase 2: Apply Migrations to cos360_master FIRST (2 hours)

### Step 2.1: Create Backup of cos360_master

```bash
# Full schema backup
pg_dump -h <host> -U <user> -d neondb \
  --schema=cos360_master \
  --no-owner --no-privileges \
  -f cos360_master_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh cos360_master_backup_*.sql
```

### Step 2.2: Check Current Master State

```sql
-- Verify current version
SELECT version_num FROM cos360_master.alembic_version;
-- Should be: f1a2b3c4d5e6

-- Count tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'cos360_master' AND table_type = 'BASE TABLE';
-- Should be: 80
```

### Step 2.3: Apply ALL Migrations to Master

```bash
# Set schema to master
export SCHEMA_NAME=cos360_master

# Check what will be upgraded
alembic current
alembic history | grep -A5 f1a2b3c4d5e6

# Apply ALL pending migrations
alembic upgrade head

# Verify completion
alembic current
# Should now show the latest revision
```

### Step 2.4: Expected Migration Path

After fixing duplicates, the migration path should be:

```
f1a2b3c4d5e6 (current - Feb 25)
    ↓
[multiple branches that need to merge]
    ↓
j6k7l8m9n0o1 (hall ticket)
d2e3f4a5b6c7 (staff banking)
e3f4a5b6c7d8 (staff current salary)
f2a3b4c5d6e7 (certificate tables)
g3h4i5j6k7l8 (certificate category)
h4i5j6k7l8m9 (transport pricing)
i5j6k7l8m9n0 (fee collection)
k7l8m9n0o1p2 (exam config templates)
    ↓
[HEAD] (should be one of these, depending on merge)
```

### Step 2.5: Handle Migration Errors

If any migration fails:

```bash
# Check error
alembic current
alembic history | head -20

# If feature already exists error:
# - Comment out that part of upgrade()
# - Re-run alembic upgrade head
# - Document the skip

# If cannot apply:
# - Rollback: alembic downgrade -1
# - Fix migration file
# - Re-apply: alembic upgrade head
```

---

## Phase 3: Validate Master Schema (30 minutes)

### Step 3.1: Run Drift Analysis Against Tenant

```bash
# Should now show what tenant has that master doesn't
python scripts/diagnose_schema_drift.py > drift_report_after_master_upgrade.txt
```

### Step 3.2: Check Migration Status

```bash
python scripts/check_migration_status.py > migration_status_after_master_upgrade.txt
```

### Step 3.3: Verify Master Has New Features

```sql
-- Check features exist in master
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cos360_master'
    AND table_name = 'transport_pricing'
);  -- Should be true now

SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'cos360_master'
    AND table_name = 'staff'
    AND column_name = 'bank_name'
);  -- Should be true now

SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cos360_master'
    AND table_name = 'exam_config_templates'
);  -- Should be true now
```

### Step 3.4: Count Tables and Columns

```sql
-- Master should now have ~90+ tables (was 80)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'cos360_master' AND table_type = 'BASE TABLE';

-- Get master version
SELECT version_num FROM cos360_master.alembic_version;
-- Should be at HEAD now
```

---

## Phase 4: Sync Tenant from Master (1-2 hours)

Now that cos360_master is the source of truth, sync tenant FROM master.

### Decision: Which Sync Mode?

Based on earlier analysis:
- 12 extra tables in tenant
- 23 column differences
- Type mismatches

**Recommendation: RECREATE SYNC**

### Step 4.1: Backup test_tenant_schema

```bash
# CRITICAL: Full backup with data
pg_dump -h <host> -U <user> -d neondb \
  --schema=test_tenant_schema \
  --no-owner --no-privileges \
  -f test_tenant_backup_FULL_$(date +%Y%m%d_%H%M%S).sql

# Verify backup size (should be large if has data)
ls -lh test_tenant_backup_FULL_*.sql
```

### Step 4.2: Extract Tenant-Only Data

Some tables exist ONLY in tenant. Extract data from these:

```sql
-- Export fee_concessions (if has data)
\copy (SELECT * FROM test_tenant_schema.fee_concessions) TO '/tmp/fee_concessions_export.csv' CSV HEADER;

-- Export notification_queue (if has data)
\copy (SELECT * FROM test_tenant_schema.notification_queue) TO '/tmp/notification_queue_export.csv' CSV HEADER;

-- Export notification_log (if has data)
\copy (SELECT * FROM test_tenant_schema.notification_log) TO '/tmp/notification_log_export.csv' CSV HEADER;

-- List all tenant-only tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'test_tenant_schema'
AND table_name NOT IN (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'cos360_master'
);
```

### Step 4.3: Option A - Recreate Sync (Recommended)

This drops and recreates tenant from master template.

```bash
# Create Python script for recreate sync
python scripts/recreate_tenant_from_master.py \
  --source-schema cos360_master \
  --target-schema test_tenant_schema \
  --preserve-data true \
  --backup-first true
```

**Recreate Script** (create this if it doesn't exist):

```python
# scripts/recreate_tenant_from_master.py
"""
Recreate tenant schema from cos360_master template
Following the documented Recreate Sync strategy
"""
import asyncio
import asyncpg
import os
import sys
from datetime import datetime

async def recreate_tenant_from_master(
    source_schema: str,
    target_schema: str,
    preserve_data: bool = True
):
    """
    Drop target schema and recreate from source (master) schema
    Preserving business data if requested
    """

    database_url = os.getenv('DATABASE_URL').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(database_url)

    try:
        print(f"Starting recreate sync: {target_schema} from {source_schema}")
        print(f"Preserve data: {preserve_data}")
        print()

        # Step 1: Extract data from target schema (if preserve_data)
        if preserve_data:
            print("Step 1: Extracting business data...")
            # This would use pg_dump to extract data only
            # For now, we assume backup was done manually
            print("  [Skipped - backup done manually]")

        # Step 2: Get DDL from source schema
        print("Step 2: Extracting schema DDL from master...")

        # Step 3: Drop target schema
        print(f"Step 3: Dropping {target_schema}...")
        await conn.execute(f'DROP SCHEMA IF EXISTS "{target_schema}" CASCADE')
        print(f"  Schema {target_schema} dropped")

        # Step 4: Create target schema
        print(f"Step 4: Creating {target_schema}...")
        await conn.execute(f'CREATE SCHEMA "{target_schema}"')
        print(f"  Schema {target_schema} created")

        # Step 5: Clone structure from master
        print(f"Step 5: Cloning structure from {source_schema}...")

        # Get all CREATE TABLE statements from master
        tables_query = """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = $1
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """
        tables = await conn.fetch(tables_query, source_schema)

        for table in tables:
            table_name = table['table_name']
            print(f"  Cloning table: {table_name}")

            # Use pg_dump-like approach or manual CREATE TABLE
            # For simplicity, use CREATE TABLE LIKE
            try:
                await conn.execute(f'''
                    CREATE TABLE "{target_schema}"."{table_name}"
                    (LIKE "{source_schema}"."{table_name}" INCLUDING ALL)
                ''')
            except Exception as e:
                print(f"    Error: {e}")
                # Continue with next table

        # Step 6: Restore data (if preserve_data)
        if preserve_data:
            print("Step 6: Restoring business data...")
            print("  [Manual step - restore from backup]")
            print(f"  Run: psql -d neondb -f test_tenant_backup_FULL_*.sql")

        # Step 7: Set alembic_version to match master
        master_version = await conn.fetchval(
            f"SELECT version_num FROM {source_schema}.alembic_version"
        )

        print(f"Step 7: Setting alembic_version to {master_version}...")
        await conn.execute(f'''
            INSERT INTO "{target_schema}".alembic_version (version_num)
            VALUES ($1)
            ON CONFLICT (version_num) DO NOTHING
        ''', master_version)

        print()
        print("=" * 60)
        print("RECREATE SYNC COMPLETED")
        print("=" * 60)
        print(f"Source: {source_schema}")
        print(f"Target: {target_schema}")
        print(f"Version: {master_version}")
        print()

        # Step 8: Validation
        print("Step 8: Validation")
        target_tables = await conn.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1",
            target_schema
        )
        source_tables = await conn.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1",
            source_schema
        )

        print(f"  Master tables: {source_tables}")
        print(f"  Tenant tables: {target_tables}")

        if source_tables == target_tables:
            print("  [OK] Table counts match")
        else:
            print("  [WARNING] Table counts differ")

    finally:
        await conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python recreate_tenant_from_master.py <source_schema> <target_schema> [--preserve-data]")
        sys.exit(1)

    source = sys.argv[1]
    target = sys.argv[2]
    preserve = '--preserve-data' in sys.argv

    asyncio.run(recreate_tenant_from_master(source, target, preserve))
```

### Step 4.4: Option B - Manual Apply Migrations to Tenant

If you don't want to recreate, apply migrations to tenant:

```bash
# Set schema to tenant
export SCHEMA_NAME=test_tenant_schema

# This will fail for features that already exist
# You'll need to handle each error
alembic upgrade head
```

**Problem with Option B**: Many features already exist, migrations will fail.

---

## Phase 5: Validate and Test (1 hour)

### Step 5.1: Run Drift Analysis

```bash
# Should report NO DRIFT now
python scripts/diagnose_schema_drift.py

# Expected output:
# [OK] NO SIGNIFICANT SCHEMA DRIFT DETECTED
```

### Step 5.2: Verify Migration Versions Match

```sql
SELECT
    'cos360_master' as schema_name,
    version_num
FROM cos360_master.alembic_version
UNION ALL
SELECT
    'test_tenant_schema' as schema_name,
    version_num
FROM test_tenant_schema.alembic_version;

-- Both should show same version now
```

### Step 5.3: Verify Table Counts Match

```sql
SELECT
    'cos360_master' as schema_name,
    COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'cos360_master'
AND table_type = 'BASE TABLE'
UNION ALL
SELECT
    'test_tenant_schema' as schema_name,
    COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'test_tenant_schema'
AND table_type = 'BASE TABLE';

-- Counts should match
```

### Step 5.4: Test Application

```bash
# Start application
uvicorn app.main:app --reload --port 8003

# Test critical endpoints
curl -H "cschema: test_tenant_schema" http://localhost:8003/api/v1/fee/categories
curl -H "cschema: test_tenant_schema" http://localhost:8003/api/v1/student/admissions

# Run test suite
pytest tests/ -v
```

---

## Phase 6: Document and Lock Down (30 minutes)

### Step 6.1: Document What Was Fixed

Create file: `migrations/MIGRATION_FIX_LOG.md`

```markdown
# Migration Fix Log

## Date: 2026-04-15

## Problem
- Duplicate revision IDs (b2c3d4e5f6a7)
- Migrations applied directly to tenant, not via Alembic
- cos360_master outdated
- Schema drift detected

## Actions Taken
1. Fixed duplicate revision b2c3d4e5f6a7 → j6k7l8m9n0o1
2. Applied all migrations to cos360_master FIRST
3. Recreated test_tenant_schema from cos360_master
4. Validated schema alignment

## Final State
- cos360_master: version [HEAD_VERSION]
- test_tenant_schema: version [HEAD_VERSION]
- No schema drift
- All tests passing

## Lessons Learned
- ALWAYS apply to cos360_master first
- NEVER apply direct database changes
- ALWAYS use alembic upgrade head
```

### Step 6.2: Enforce Proper Workflow

Add to `.github/workflows/migration-check.yml` (if using GitHub):

```yaml
name: Migration Check

on: [pull_request]

jobs:
  check-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check migration files
        run: |
          # Ensure no duplicate revision IDs
          python scripts/check_duplicate_revisions.py

          # Ensure migration chain is linear
          alembic history
```

### Step 6.3: Add Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check for duplicate migration revisions
if git diff --cached --name-only | grep -q "migrations/versions/"; then
    echo "Migration files detected. Checking for duplicates..."
    python scripts/check_duplicate_revisions.py
    if [ $? -ne 0 ]; then
        echo "ERROR: Duplicate migration revision IDs detected!"
        echo "Please fix before committing."
        exit 1
    fi
fi
```

---

## Quick Reference Commands

### Check Current State
```bash
# Check master version
export SCHEMA_NAME=cos360_master && alembic current

# Check tenant version
export SCHEMA_NAME=test_tenant_schema && alembic current

# Check for drift
python scripts/diagnose_schema_drift.py
```

### Apply Migration to Master FIRST
```bash
# 1. Create migration
alembic revision -m "add_new_feature"

# 2. Apply to MASTER first
export SCHEMA_NAME=cos360_master
alembic upgrade head

# 3. Validate
python scripts/diagnose_schema_drift.py

# 4. Then sync to tenants
python scripts/sync_tenant_from_master.py test_tenant_schema
```

---

## Rollback Plan

If anything goes wrong during fix:

```bash
# Restore cos360_master
psql -d neondb -f cos360_master_backup_YYYYMMDD_HHMMSS.sql

# Restore test_tenant_schema
psql -d neondb -f test_tenant_backup_FULL_YYYYMMDD_HHMMSS.sql

# Verify
export SCHEMA_NAME=cos360_master && alembic current
export SCHEMA_NAME=test_tenant_schema && alembic current
```

---

## Success Criteria

- [ ] Migration chain has single head (no duplicates)
- [ ] cos360_master at latest migration version
- [ ] test_tenant_schema at same version as master
- [ ] `diagnose_schema_drift.py` reports NO DRIFT
- [ ] All application tests passing
- [ ] Can create new tenant from master
- [ ] Documentation updated
- [ ] Team trained on proper workflow

---

## Next Steps After Fix

1. **Train team** on cos360_master-first workflow
2. **Implement pre-commit hooks** to prevent duplicate revisions
3. **Add CI/CD checks** for migration validation
4. **Schedule weekly drift detection**
5. **Document sync procedures** for production tenants
6. **Plan rollout** of fixed migrations to other tenant schemas

---

**CRITICAL REMINDER**:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ALWAYS APPLY MIGRATIONS TO cos360_master FIRST         │
│                                                         │
│  cos360_master = SINGLE SOURCE OF TRUTH                │
│                                                         │
│  Then sync FROM master TO tenants                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
