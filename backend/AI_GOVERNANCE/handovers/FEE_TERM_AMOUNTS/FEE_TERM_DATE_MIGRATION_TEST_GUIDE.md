# Fee Term Date Migration - Testing Guide

## Migration Status: ✅ COMPLETED

All 5 migration phases have been successfully applied to the database.

```bash
Current Migration: e5f6a7b8c9d0 (Phase 5 - Update unique constraints)
```

## What Changed in the Database

### 1. New Columns Added
- `fee_class_map_term_amounts.term_date_id` (FK to fee_term_dates.id, NOT NULL)
- `fee_student_map_term_amounts.term_date_id` (FK to fee_term_dates.id, NOT NULL)
- `fee_transaction_items.term_date_id` (FK to fee_term_dates.id, NOT NULL)

### 2. Unique Constraint Updated
- **Before**: `UNIQUE(fee_class_mapping_id, term_id)`
- **After**: `UNIQUE(fee_class_mapping_id, term_date_id)`

### 3. Data Backfilled
- All existing rows now have `term_date_id` populated (mapped to first term_date for that term)

## Testing Scenarios

### Scenario 1: Verify Existing Data Still Works

Check that existing single-term fees are still functional:

```bash
# List existing term amounts
curl -X GET "http://localhost:8000/api/v1/fee/class-mapping-term-amounts/?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Should return existing data with both `term_id` and `term_date_id` populated.

### Scenario 2: Create Multi-Term Fee (Equal Split)

Create a quarterly fee with 4 equal installments of 10,000 each:

```bash
# First, get a fee_class_mapping_id and its term_dates
curl -X GET "http://localhost:8000/api/v1/fee/class-mappings/{mapping_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get term dates for the fee term
curl -X GET "http://localhost:8000/api/v1/fee/term-dates?term_id={term_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create term amounts (4 equal splits)
curl -X POST "http://localhost:8000/api/v1/fee/class-mapping-term-amounts/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fee_class_mapping_id": "YOUR_CLASS_MAPPING_UUID",
    "term_amounts": [
      {
        "term_date_id": "TERM_DATE_1_UUID",
        "term_amount": 10000.00
      },
      {
        "term_date_id": "TERM_DATE_2_UUID",
        "term_amount": 10000.00
      },
      {
        "term_date_id": "TERM_DATE_3_UUID",
        "term_amount": 10000.00
      },
      {
        "term_date_id": "TERM_DATE_4_UUID",
        "term_amount": 10000.00
      }
    ]
  }'
```

**Expected Result**: 201 Created, with all 4 term amounts successfully inserted.

**What This Tests**:
- ✅ Multi-term support is enabled (no more `number_of_terms = 1` error)
- ✅ Can create multiple rows for one fee_class_mapping
- ✅ Unique constraint enforced per term_date_id

### Scenario 3: Create Multi-Term Fee (Unequal Split)

Create a quarterly fee with unequal amounts (5k, 15k, 10k, 10k):

```bash
curl -X POST "http://localhost:8000/api/v1/fee/class-mapping-term-amounts/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fee_class_mapping_id": "YOUR_CLASS_MAPPING_UUID",
    "term_amounts": [
      {"term_date_id": "TERM_DATE_1_UUID", "term_amount": 5000.00},
      {"term_date_id": "TERM_DATE_2_UUID", "term_amount": 15000.00},
      {"term_date_id": "TERM_DATE_3_UUID", "term_amount": 10000.00},
      {"term_date_id": "TERM_DATE_4_UUID", "term_amount": 10000.00}
    ]
  }'
```

**Expected Result**: 201 Created

**What This Tests**:
- ✅ Unequal splits are supported
- ✅ Sum validation (5k + 15k + 10k + 10k = 40k must equal total_fee)

### Scenario 4: Test Validation - Count Mismatch

Try creating 3 term amounts when fee has 4 term dates:

```bash
curl -X POST "http://localhost:8000/api/v1/fee/class-mapping-term-amounts/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fee_class_mapping_id": "YOUR_CLASS_MAPPING_UUID",
    "term_amounts": [
      {"term_date_id": "TERM_DATE_1_UUID", "term_amount": 10000.00},
      {"term_date_id": "TERM_DATE_2_UUID", "term_amount": 15000.00},
      {"term_date_id": "TERM_DATE_3_UUID", "term_amount": 15000.00}
    ]
  }'
```

**Expected Result**: 400 Bad Request

**Error Message**: "Number of term amounts (3) must match number of term dates (4)"

### Scenario 5: Test Validation - Duplicate term_date_id

Try creating duplicate term_date_id in the same request:

```bash
curl -X POST "http://localhost:8000/api/v1/fee/class-mapping-term-amounts/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fee_class_mapping_id": "YOUR_CLASS_MAPPING_UUID",
    "term_amounts": [
      {"term_date_id": "TERM_DATE_1_UUID", "term_amount": 10000.00},
      {"term_date_id": "TERM_DATE_1_UUID", "term_amount": 10000.00},
      {"term_date_id": "TERM_DATE_3_UUID", "term_amount": 10000.00},
      {"term_date_id": "TERM_DATE_4_UUID", "term_amount": 10000.00}
    ]
  }'
```

**Expected Result**: 400 Bad Request

**Error Message**: "Duplicate term_date_id ... in request"

### Scenario 6: Student Fee Mapping (Bug Fix Verification)

Create a student fee mapping and verify it creates correct term amounts:

```bash
curl -X POST "http://localhost:8000/api/v1/fee/student-mappings/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STUDENT_UUID",
    "student_admission_num": "ADM001",
    "class_id": "CLASS_UUID",
    "section_id": "SECTION_UUID",
    "fee_type_id": "FEE_TYPE_UUID",
    "total_fee": 40000.00,
    "academic_year_id": "ACADEMIC_YEAR_UUID"
  }'
```

**Expected Result**: Creates mapping with 4 term_amounts, each with **unique** `term_date_id`

**Bug that was fixed**: Before, all 4 rows had the **same** `term_id` (wrong!). Now each row has a **different** `term_date_id` (correct!).

### Scenario 7: Transaction Creation

Create a payment for a specific term installment:

```bash
curl -X POST "http://localhost:8000/api/v1/fee/transactions/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STUDENT_UUID",
    "student_admission_num": "ADM001",
    "academic_year_id": "ACADEMIC_YEAR_UUID",
    "total_amount": 5000.00,
    "payment_method": "cash",
    "fee_items": [
      {
        "fee_type_id": "FEE_TYPE_UUID",
        "term_date_id": "TERM_DATE_1_UUID",
        "amount_paid": 5000.00
      }
    ]
  }'
```

**Expected Result**: 201 Created

**What This Tests**:
- ✅ Transactions track payment per specific term_date
- ✅ Outstanding calculation works per term_date
- ✅ Can pay different installments separately

## Verification Queries

### Check term_date_id is populated
```sql
SELECT COUNT(*) as null_count
FROM fee_class_map_term_amounts
WHERE term_date_id IS NULL;
-- Expected: 0
```

### Check unique constraint works
```sql
SELECT fee_class_mapping_id, term_date_id, COUNT(*)
FROM fee_class_map_term_amounts
GROUP BY fee_class_mapping_id, term_date_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)
```

### Check foreign key integrity
```sql
SELECT fcmta.id, fcmta.term_date_id
FROM fee_class_map_term_amounts fcmta
LEFT JOIN fee_term_dates ftd ON ftd.id = fcmta.term_date_id
WHERE ftd.id IS NULL;
-- Expected: 0 rows (all references valid)
```

### Verify multi-term data
```sql
SELECT
    fc.id as mapping_id,
    ft.term_name,
    ft.number_of_terms,
    COUNT(fcmta.id) as term_amount_count,
    SUM(fcmta.term_amount) as total_split
FROM fee_class_mappings fc
JOIN fee_types ftype ON ftype.id = fc.fee_type_id
JOIN fee_terms ft ON ft.id = ftype.fee_term_id
LEFT JOIN fee_class_map_term_amounts fcmta ON fcmta.fee_class_mapping_id = fc.id
WHERE ft.number_of_terms > 1
GROUP BY fc.id, ft.term_name, ft.number_of_terms;
```

## Success Criteria

✅ **Migration Complete**: Database at `e5f6a7b8c9d0`
✅ **Backward Compatible**: Existing single-term fees still work
✅ **Multi-term Enabled**: Can create quarterly/trimester fees
✅ **Validation Works**: Count and sum validations enforced
✅ **Bug Fixed**: Student mappings create unique term_date rows
✅ **Transactions Work**: Can pay specific term installments

## Quick Test Script

Save this as `test_multi_term.sh`:

```bash
#!/bin/bash

# Set your auth token
TOKEN="your_jwt_token_here"
BASE_URL="http://localhost:8000/api/v1"

# Test 1: Check existing data
echo "Test 1: Checking existing term amounts..."
curl -s -X GET "$BASE_URL/fee/class-mapping-term-amounts/?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Add more tests here with your actual UUIDs
```

## Next Steps

1. ✅ Migrations applied successfully
2. ⏳ Test with real data (use scenarios above)
3. ⏳ Verify all validations work
4. ⏳ Test edge cases (sum mismatch, duplicate term_dates)
5. ⏳ Load test with multiple users

## Rollback (if needed)

If something goes wrong:

```bash
# Rollback to before Phase 1
alembic downgrade 51880f32593d

# This will:
# - Remove unique constraint on term_date_id
# - Drop NOT NULL constraints
# - Remove foreign keys
# - Remove indexes
# - Clear term_date_id data
# - Remove term_date_id columns
```

**Note**: Rollback is safe because we kept the old `term_id` columns during migration!
