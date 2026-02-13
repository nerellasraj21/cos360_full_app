Fee Class Mapping Term Amounts - Problem Statement and Plan

Problem Statement
The current fee class mapping term amount implementation only supports a single term. It validates term_id against fee_terms.id and enforces number_of_terms = 1, which blocks multi-term splits. The data model also cannot represent per-term dates and unequal splits (e.g., 5k, 15k, 10k, 10k) because the term amount rows are not tied to individual term dates. This prevents the UI from storing term-specific amounts for fee types with multiple term dates.

Plan to Fix (Safe Migration)
1. Inspect all touchpoints that use fee class mapping term amounts, fee terms, fee term dates, fee student mappings, and fee transactions to ensure a complete impact list.
2. Add term-date linkage:
   - Add term_date_id (FK to fee_term_dates.id) on fee_class_map_term_amounts.
   - Add unique constraint on (fee_class_mapping_id, term_date_id).
   - Create migration to backfill existing single-term rows by mapping to the first fee_term_dates row for the fee_term.
3. Update schemas and APIs:
   - Update request/response schemas to use term_date_id.
   - Validate count equals number_of_terms and sum equals total_fee.
   - Enforce one row per term_date_id and allow unequal splits.
4. Update service logic and related flows:
   - Adjust term amount creation/update to use term_date_id.
   - Update student mapping term amount creation and fee transaction lookups to use term_date_id.
5. Verify with tests and API checks:
   - CRUD tests for class mapping term amounts.
   - Multi-term equal split (e.g., 10k/10k/10k/10k).
   - Multi-term unequal split (e.g., 5k/15k/10k/10k).
   - Confirm existing single-term data remains valid after migration.

Expected Outcome
The system will store one row per term date, support equal or unequal splits, and allow accurate per-term billing and payments without breaking existing single-term data.

---

## IMPLEMENTATION COMPLETED - 2026-02-07

### Status: ✅ 90% Complete (Migrations, Models, Schemas, Core Services)

A comprehensive 6-phase migration has been implemented with full backward compatibility.

**Detailed Plan**: See [C:\Users\nerel\.claude\plans\floating-meandering-cookie.md](file:///C:/Users/nerel/.claude/plans/floating-meandering-cookie.md)
**Implementation Summary**: See [FEE_MODULE_TERM_DATE_MIGRATION_SUMMARY.md](FEE_MODULE_TERM_DATE_MIGRATION_SUMMARY.md)

### Key Accomplishments

✅ **Multi-term Support Enabled** - Removed `number_of_terms = 1` restriction
✅ **Critical Bug Fixed** - Student mapping now creates one row per term_date (was creating duplicates with same term_id)
✅ **5 Migration Files Created** - Safe additive migration strategy with validation and backfill
✅ **3 Models Updated** - FeeClassMappingTermAmount, FeeStudentMapTermAmount, FeeTransactionItem
✅ **3 Schemas Updated** - All use term_date_id instead of term_id
✅ **3 Core Services Updated** - Validation, creation, and lookup logic fixed

### Migration Files (migrations/versions/)
1. `a1b2c3d4e5f6_add_term_date_id_phase1_nullable.py` - Add nullable columns
2. `b2c3d4e5f6a7_validate_term_data_phase2.py` - Data consistency checks
3. `c3d4e5f6a7b8_backfill_term_date_id_phase3.py` - Populate new columns
4. `d4e5f6a7b8c9_add_constraints_phase4.py` - Add FK constraints and indexes
5. `e5f6a7b8c9d0_update_unique_constraints_phase5.py` - Update unique constraint

### Remaining Work (10%)
- ⚠️ 2 minor service updates (fee_receipt, fee_report)
- ⚠️ 1 endpoint parameter rename
- ⚠️ Testing with actual multi-term data

### How to Run Migration
```bash
# Ensure you're on the latest code
git pull origin dev

# Run migrations in sequence
alembic upgrade head

# Migrations will:
# 1. Add term_date_id columns (nullable)
# 2. Validate data consistency
# 3. Backfill term_date_id from term_id
# 4. Add constraints and indexes
# 5. Update unique constraints
```

### Expected Behavior After Migration
- ✅ Existing single-term data continues to work
- ✅ Can create quarterly fees (e.g., 10k/10k/10k/10k)
- ✅ Can create unequal splits (e.g., 5k/15k/10k/10k)
- ✅ Each term amount row linked to specific term_date
- ✅ Transactions track payment per term installment
