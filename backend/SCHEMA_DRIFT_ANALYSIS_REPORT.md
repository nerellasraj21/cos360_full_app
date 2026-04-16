# Schema Drift Analysis Report
## cos360_master vs test_tenant_schema

**Analysis Date**: 2026-04-15
**Migration Versions**: Both schemas at f1a2b3c4d5e6 (MATCH)
**Severity**: HIGH - Significant drift detected

---

## Executive Summary

The test_tenant_schema has **significant structural differences** from the cos360_master template schema. While both schemas are on the same migration version (f1a2b3c4d5e6), there are:

- **12 extra tables** in tenant that don't exist in master
- **23 column-level discrepancies** across multiple tables
- **Column type mismatches**, nullable constraints, and missing columns

**Recommended Action**: RECREATE SYNC with data preservation

---

## Detailed Findings

### 1. EXTRA TABLES IN TENANT (12 tables)

These tables exist in test_tenant_schema but NOT in cos360_master:

| Table Name                    | Likely Purpose                              | Action Required |
|-------------------------------|---------------------------------------------|-----------------|
| exam_config_template_items    | Exam configuration templates                | Review - may be WIP feature |
| exam_config_templates         | Exam template definitions                   | Review - may be WIP feature |
| fee_concessions               | Student fee concession tracking             | Review - may be WIP feature |
| fee_old                       | Legacy fee data migration table             | SAFE TO DROP after migration |
| file_audit_log                | File operation audit trail                  | Review - may be needed |
| hall_ticket_eligibility       | Exam hall ticket eligibility                | Review - may be WIP feature |
| message_templates             | Notification message templates              | Review - may be WIP feature |
| notification_log              | Notification history                        | Review - may be needed |
| notification_queue            | Pending notifications                       | Review - may be needed |
| staff_qualifications          | Staff qualification details                 | Review - may be WIP feature |
| stale_file_registry           | Cleanup tracking for unused files           | Review - may be needed |
| transport_pricing             | Transport pricing configuration             | Review - may be WIP feature |

**Recommendation**:
- Review each table with business stakeholders
- If tables contain business data: Extract before sync
- If tables are experimental: Document or drop
- If tables are needed: Add to cos360_master via migration

---

### 2. MISSING COLUMNS IN TENANT

Critical columns that exist in MASTER but missing in TENANT:

**NONE IDENTIFIED** - All master columns exist in tenant

---

### 3. EXTRA COLUMNS IN TENANT

Columns that exist in test_tenant_schema but NOT in cos360_master:

#### High Priority (Business Impact)

| Table                          | Missing Columns                                    | Impact |
|--------------------------------|----------------------------------------------------|--------|
| student_admissions             | admission_type, district_id, mandal_id, state_id   | HIGH - Extended admission tracking |
| staff                          | 15 columns (banking, salary, work history)         | HIGH - Payroll integration fields |
| students                       | caste_id, sub_caste_id                             | MEDIUM - Demographics tracking |
| fee_class_map_term_amounts     | term_date_id                                       | HIGH - Fee term date tracking |
| fee_student_map_term_amounts   | term_date_id                                       | HIGH - Fee term date tracking |
| fee_transaction_items          | term_date_id                                       | HIGH - Transaction term tracking |
| expense_transactions           | academic_year_id                                   | MEDIUM - Expense year tracking |

#### Medium Priority (Feature Enhancements)

| Table                          | Missing Columns           | Impact |
|--------------------------------|---------------------------|--------|
| class_subject_mappings         | section_id                | MEDIUM - Section-specific subjects |
| route_stops                    | pickup_time, drop_time    | MEDIUM - Enhanced transport tracking |
| student_transport_assignments  | pricing_id                | MEDIUM - Transport pricing link |
| users                          | is_first_login            | LOW - UX enhancement |

#### Low Priority (Metadata)

| Table                 | Missing Columns         | Impact |
|-----------------------|-------------------------|--------|
| certificate_types     | created_at              | LOW - Audit trail |
| designations          | created_at, updated_at  | LOW - Audit trail |
| holidays              | color                   | LOW - UI enhancement |
| trips                 | created_at, updated_at  | LOW - Audit trail |
| student_certificates  | 5 columns               | MEDIUM - Enhanced certificates |

**Recommendation**:
- **If columns are production features**: Add to master via Alembic migration
- **If columns are experimental**: Extract data, drop columns
- **If columns are critical**: Must sync to master before recreate

---

### 4. COLUMN TYPE MISMATCHES

Columns with different data types or constraints:

#### Critical Type Mismatches

**fee_receipts.reprint_count**
- Master: `character varying` with default '0'
- Tenant: `integer` with default 0
- Impact: HIGH - Could break receipt printing logic
- Action: Decide canonical type, migrate data accordingly

**profile_audit_logs (18 column differences)**
- Multiple varchar columns missing length constraints in master
- Multiple nullable differences (master: YES, tenant: NO)
- Impact: MEDIUM - Audit log integrity
- Action: Align master to match tenant (tenant version appears more robust)

#### Minor Type Mismatches

**castes / sub_castes**
- VARCHAR columns missing length in master (tenant has 20/100 char limits)
- Nullable constraints differ (master: YES, tenant: NO)
- UUID default differs (master: gen_random_uuid(), tenant: None)
- Impact: LOW - Cosmetic differences
- Action: Standardize on tenant's stricter constraints

**route_types.is_active / trip_types.is_active**
- Master: NOT NULL
- Tenant: NULLABLE
- Impact: LOW - Boolean handling
- Action: Align on NOT NULL (master version correct)

**users.username**
- Master: VARCHAR(50)
- Tenant: VARCHAR(100)
- Impact: LOW - Longer usernames in tenant
- Action: Expand master to 100 chars

---

## Root Cause Analysis

### Why Did This Drift Occur?

1. **Direct tenant modifications**: Changes made directly to test_tenant_schema bypassing migrations
2. **Development testing**: Experimental features tested in tenant without formal migration
3. **Manual schema updates**: Database changes not tracked in Alembic
4. **Split development**: Multiple developers working on different schemas

### Prevention Strategy

Going forward:
- **ALL schema changes** must go through Alembic migrations
- **Apply migrations to cos360_master FIRST**, then sync to tenants
- **Enforce read-only** restrictions on cos360_master for data operations
- **Regular drift detection**: Run this analysis weekly

---

## Recommended Fix Strategy

### Option 1: RECREATE SYNC (Recommended)

**What it does**: Complete schema recreation from cos360_master template

**Steps**:
1. **Backup current test_tenant_schema** (full data backup)
2. **Extract data from extra tables** (fee_concessions, transport_pricing, etc.)
3. **Document all extra columns** with business stakeholders
4. **Create Alembic migrations** for needed columns/tables
5. **Apply migrations to cos360_master** to bring it up-to-date
6. **Execute recreate sync** with data preservation
7. **Restore extracted data** to recreated schema
8. **Validate** all business operations

**Pros**:
- Guarantees schema consistency
- Cleanest long-term solution
- Resets to known-good state

**Cons**:
- Highest effort
- Requires downtime (est. 10 minutes)
- Risk of data loss if not carefully planned

**Timeline**: 4-6 hours including planning and testing

---

### Option 2: SHADOW SYNC with Manual Alignment

**What it does**: Hybrid approach - align schemas first, then sync

**Steps**:
1. **Backup test_tenant_schema**
2. **Create Alembic migrations** for all needed extra columns
3. **Apply migrations to cos360_master** (bringing it closer to tenant)
4. **Execute shadow sync** to migrate data with new structure
5. **Manually drop** experimental tables
6. **Validate** schema alignment

**Pros**:
- Preserves needed customizations
- Less data extraction required
- More controlled process

**Cons**:
- Still requires significant migration work
- Medium downtime (est. 5 minutes)
- May not catch all drift

**Timeline**: 2-4 hours

---

### Option 3: IN-PLACE ALIGNMENT (Not Recommended)

**Why not recommended**: Too many structural differences for safe in-place updates

---

## Detailed Remediation Plan

### Phase 1: Analysis and Decision (2 hours)

1. **Review extra tables** with business stakeholders
   - Determine which tables are production features
   - Identify experimental/test tables
   - Document tables for extraction vs. deletion

2. **Review extra columns** with development team
   - Classify as production, experimental, or deprecated
   - Identify columns needed in master schema
   - Document data migration requirements

3. **Review type mismatches**
   - Decide canonical types for each mismatch
   - Plan data type conversions
   - Test conversion queries

### Phase 2: Master Schema Updates (2 hours)

1. **Create Alembic migrations** for needed changes:
   ```bash
   # Add production features to master
   alembic revision -m "add_term_date_id_to_fee_tables"
   alembic revision -m "add_staff_banking_fields"
   alembic revision -m "add_admission_location_fields"
   alembic revision -m "expand_users_username_length"
   alembic revision -m "add_is_first_login_to_users"
   ```

2. **Apply migrations to cos360_master**:
   ```bash
   export SCHEMA_NAME=cos360_master
   alembic upgrade head
   ```

3. **Validate master schema** structure

### Phase 3: Data Extraction (1 hour)

1. **Extract data from tenant-only tables**:
   ```sql
   -- Export fee_concessions
   COPY test_tenant_schema.fee_concessions TO '/tmp/fee_concessions_backup.csv' CSV HEADER;

   -- Export transport_pricing
   COPY test_tenant_schema.transport_pricing TO '/tmp/transport_pricing_backup.csv' CSV HEADER;

   -- Export other critical tables
   ```

2. **Document extracted data** locations and formats

### Phase 4: Backup (30 minutes)

1. **Full schema backup**:
   ```bash
   pg_dump -n test_tenant_schema -f test_tenant_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Validate backup** can be restored
3. **Store backup** securely

### Phase 5: Execute Recreate Sync (2 hours)

1. **Run recreate sync** with data preservation:
   ```python
   # Use schema sync API
   POST /super_admin/system/tenants/{tenant_id}/sync-schema
   {
     "mode": "recreate",
     "preserve_data": true,
     "backup_before_sync": true,
     "validation_level": "full"
   }
   ```

2. **Monitor sync progress**
3. **Review sync logs** for errors

### Phase 6: Validation and Restoration (1 hour)

1. **Validate schema structure**:
   ```bash
   python scripts/diagnose_schema_drift.py
   ```

2. **Restore extracted data** if tables were added to master
3. **Run application tests** on tenant schema
4. **Verify business operations** work correctly

### Phase 7: Documentation (30 minutes)

1. **Document changes** made
2. **Update migration history**
3. **Create runbook** for future syncs
4. **Train team** on proper schema change process

---

## Immediate Actions Required

### CRITICAL - Do This First

1. **Create backup immediately**:
   ```bash
   pg_dump -n test_tenant_schema > test_tenant_emergency_backup_$(date +%Y%m%d).sql
   ```

2. **Freeze schema changes** on test_tenant_schema
   - No direct database modifications
   - All changes via migrations only

3. **Document business requirements** for extra tables/columns
   - Schedule meetings with stakeholders
   - Get sign-off on what to keep vs. drop

### HIGH PRIORITY - This Week

1. **Create Alembic migrations** for production features
2. **Apply migrations to cos360_master**
3. **Test migrations** in development environment

### MEDIUM PRIORITY - Next Week

1. **Schedule maintenance window** for sync operation
2. **Execute recreate sync** with full validation
3. **Verify production readiness**

---

## Prevention Checklist

Going forward, enforce these rules:

- [ ] All schema changes go through Alembic migrations
- [ ] Migrations applied to cos360_master FIRST
- [ ] No direct database schema modifications
- [ ] Weekly schema drift analysis
- [ ] Read-only enforcement on cos360_master for data operations
- [ ] Proper migration testing before applying to production tenants
- [ ] Documentation of all schema changes
- [ ] Code review for all migration files

---

## Risk Assessment

| Risk Area                | Severity | Mitigation |
|--------------------------|----------|------------|
| Data loss during sync    | HIGH     | Full backup before any operation |
| Extended downtime        | MEDIUM   | Test sync in dev environment first |
| Application breakage     | MEDIUM   | Comprehensive testing post-sync |
| Type conversion errors   | MEDIUM   | Test data type migrations separately |
| Missing business data    | HIGH     | Extract all custom table data first |

---

## Success Criteria

Sync is successful when:

- [ ] `python scripts/diagnose_schema_drift.py` reports NO DRIFT
- [ ] All application features work correctly
- [ ] No data loss verified by row counts
- [ ] All business operations functional
- [ ] Performance metrics maintained
- [ ] Backup successfully tested
- [ ] Team trained on new process

---

## Appendix: SQL Queries for Manual Verification

### Check Table Count
```sql
-- Master
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'cos360_master' AND table_type = 'BASE TABLE';

-- Tenant
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'test_tenant_schema' AND table_type = 'BASE TABLE';
```

### Compare Specific Table Structure
```sql
-- Get column differences for a specific table
SELECT
    COALESCE(m.column_name, t.column_name) as column_name,
    m.data_type as master_type,
    t.data_type as tenant_type,
    m.is_nullable as master_nullable,
    t.is_nullable as tenant_nullable
FROM
    (SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'cos360_master' AND table_name = 'students') m
FULL OUTER JOIN
    (SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'test_tenant_schema' AND table_name = 'students') t
ON m.column_name = t.column_name
WHERE m.column_name IS NULL
   OR t.column_name IS NULL
   OR m.data_type != t.data_type
   OR m.is_nullable != t.is_nullable;
```

### Get Row Counts for Validation
```sql
-- Before sync
SELECT
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'test_tenant_schema'
ORDER BY tablename;
```

---

## Contact and Escalation

For questions about this analysis or sync execution:
- Review with development team lead
- Consult database administrator for complex migrations
- Engage business stakeholders for data retention decisions

---

**Report Generated By**: Schema Drift Analyzer v1.0
**Next Analysis Scheduled**: Weekly automated run
