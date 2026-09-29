# Backend Handover - Student Fee Mappings Bulk Creation Issue

## Issue Summary

**Endpoint:** `POST /api/v1/fee/student-mappings/bulk`
**Status:** ❌ Returning 500 Internal Server Error
**Error:** `null value in column "term_id" of relation "fee_student_map_term_amounts" violates not-null constraint`
**Priority:** HIGH - Blocking bulk student fee mapping creation

---

## The Problem

The backend is attempting to insert records into `fee_student_map_term_amounts` table with **NULL `term_id`** values, which violates the NOT NULL constraint.

### SQL Error Details
```
IntegrityError: null value in column "term_id" of relation "fee_student_map_term_amounts" violates not-null constraint
DETAIL: Failing row contains (5cd83082-986e-4a8f-b812-ca6102ae5b35, 1061c1a7-a5e6-4bdc-9a60-6f57b64d73d4, 3885.00, null, 2026-02-08 10:11:11.166214, ...)
```

### Root Cause
When creating bulk student fee mappings, the backend is trying to automatically create term amounts, but:
1. The frontend is NOT sending term amount details in the request
2. The backend doesn't have `term_id` values to insert
3. The database requires `term_id` to be NOT NULL

---

## Current Request Format

### Endpoint
```
POST /api/v1/fee/student-mappings/bulk
```

### Headers
```
Authorization: Bearer <token>
cschema: test_tenant
Content-Type: application/json
```

### Request Body (Current)
```json
{
  "student_ids": ["uuid-1", "uuid-2", "uuid-3"],
  "class_id": "uuid-string",
  "section_id": "uuid-string",
  "fee_type_id": "uuid-string",
  "total_fee": 7770.00,
  "academic_year_id": "uuid-string"
}
```

**⚠️ NOTICE:** The request does NOT include term amounts or term distribution information.

---

## Database Schema Context

### Table: `fee_student_mappings`
```sql
CREATE TABLE fee_student_mappings (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    academic_year_id UUID NOT NULL,
    class_id UUID NOT NULL,
    section_id UUID NOT NULL,
    fee_type_id UUID NOT NULL,
    total_fee DECIMAL(10, 2) NOT NULL,
    student_admission_num VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Table: `fee_student_map_term_amounts`
```sql
CREATE TABLE fee_student_map_term_amounts (
    id UUID PRIMARY KEY,
    fee_student_map_id UUID NOT NULL REFERENCES fee_student_mappings(id),
    term_id UUID NOT NULL,  -- ❌ This is NULL in the failing insert
    term_amount DECIMAL(10, 2) NOT NULL,
    term_date_id UUID,  -- May also be required depending on schema
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## Solution Options

### Option 1: Don't Create Term Amounts in Bulk Create (RECOMMENDED)

**Change:** Don't automatically create term amounts when bulk creating student mappings.

**Rationale:**
- The frontend doesn't know how to split fees across terms yet
- Term amounts can be configured later through a separate flow
- This matches how class mappings work (create mapping first, then set term amounts)

**Implementation:**
```python
@router.post("/student-mappings/bulk")
async def bulk_create_student_mappings(
    data: BulkCreateRequest,
    db: Session = Depends(get_db)
):
    # Create student mappings WITHOUT term amounts
    created_mappings = []

    for student_id in data.student_ids:
        mapping = FeeStudentMapping(
            student_id=student_id,
            class_id=data.class_id,
            section_id=data.section_id,
            fee_type_id=data.fee_type_id,
            total_fee=data.total_fee,
            academic_year_id=data.academic_year_id,
            # ... other fields
        )
        db.add(mapping)
        created_mappings.append(mapping)

    db.commit()

    # Return created mappings WITHOUT trying to create term amounts
    return {
        "success_count": len(created_mappings),
        "total_count": len(data.student_ids),
        "created_mappings": created_mappings,
        "errors": []
    }
```

**Benefits:**
- Immediate fix with minimal changes
- Matches user workflow (set term amounts later)
- No breaking changes to API

---

### Option 2: Make term_id Nullable (TEMPORARY WORKAROUND)

**Change:** Make `term_id` nullable in the database schema.

```sql
ALTER TABLE fee_student_map_term_amounts
ALTER COLUMN term_id DROP NOT NULL;
```

**⚠️ WARNING:** This is NOT recommended because:
- Term amounts without term_ids are meaningless
- Creates data integrity issues
- Just delays the real problem

---

### Option 3: Frontend Sends Term Amounts (FUTURE ENHANCEMENT)

**Change:** Update the request to include term amounts.

**New Request Format:**
```json
{
  "student_ids": ["uuid-1", "uuid-2"],
  "class_id": "uuid-string",
  "section_id": "uuid-string",
  "fee_type_id": "uuid-string",
  "total_fee": 7770.00,
  "academic_year_id": "uuid-string",
  "term_amounts": [
    {
      "term_id": "term-uuid-1",
      "term_date_id": "term-date-uuid-1",
      "amount": 3885.00
    },
    {
      "term_id": "term-uuid-2",
      "term_date_id": "term-date-uuid-2",
      "amount": 3885.00
    }
  ]
}
```

**Frontend Type Update Needed:**
```typescript
// src/types/fee/mapping.ts
export interface FeeStudentMappingBulkCreateRequest {
  student_ids: string[];
  class_id: string;
  section_id: string;
  fee_type_id: string;
  total_fee: number;
  academic_year_id: string;

  // ✅ Add this
  term_amounts?: Array<{
    term_id: string;
    term_date_id?: string;
    amount: number;
  }>;
}
```

**Benefits:**
- Proper term distribution from the start
- No need for separate term amount configuration step

**Drawbacks:**
- Requires UI changes to let users specify term amounts during bulk creation
- More complex user flow

---

### Option 4: Fetch Default Terms from Fee Type (INTELLIGENT)

**Change:** Automatically fetch terms associated with the fee type and split the total fee equally.

**Implementation:**
```python
@router.post("/student-mappings/bulk")
async def bulk_create_student_mappings(
    data: BulkCreateRequest,
    db: Session = Depends(get_db)
):
    # Fetch fee type to get associated terms
    fee_type = db.query(FeeType).filter(FeeType.id == data.fee_type_id).first()

    if not fee_type:
        raise HTTPException(404, "Fee type not found")

    # Fetch terms for this fee type
    fee_terms = db.query(FeeTerm).filter(
        FeeTerm.fee_type_id == data.fee_type_id,
        FeeTerm.academic_year_id == data.academic_year_id,
        FeeTerm.is_active == True
    ).all()

    if not fee_terms:
        # No terms configured - create mapping without term amounts
        # (same as Option 1)
        pass
    else:
        # Split total fee equally across terms
        amount_per_term = data.total_fee / len(fee_terms)

        for student_id in data.student_ids:
            # Create mapping
            mapping = FeeStudentMapping(...)
            db.add(mapping)
            db.flush()  # Get the mapping ID

            # Create term amounts
            for term in fee_terms:
                term_amount = FeeStudentMapTermAmount(
                    fee_student_map_id=mapping.id,
                    term_id=term.id,
                    term_date_id=term.default_date_id,  # If applicable
                    term_amount=amount_per_term
                )
                db.add(term_amount)

        db.commit()
```

**Benefits:**
- Intelligent default behavior
- No UI changes needed
- Users can still adjust term amounts later

**Considerations:**
- Need to verify fee_terms relationship with fee_types exists
- May need rounding logic for amounts that don't divide evenly

---

## Recommended Solution

**Use Option 1 (Don't Create Term Amounts) for immediate fix.**

Then enhance with **Option 4 (Intelligent Default)** in a future update.

**Reasoning:**
1. Quick fix that unblocks users immediately
2. No breaking changes to API or frontend
3. Can add intelligent term distribution later without breaking existing code
4. Matches existing workflow for class mappings

---

## Testing After Fix

### Test Case 1: Bulk Create Without Terms

**Request:**
```bash
curl -X POST \
  "http://localhost:8000/api/v1/fee/student-mappings/bulk" \
  -H "Authorization: Bearer <token>" \
  -H "cschema: test_tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "student_ids": ["student-uuid-1", "student-uuid-2"],
    "class_id": "class-uuid",
    "section_id": "section-uuid",
    "fee_type_id": "fee-type-uuid",
    "total_fee": 7770.00,
    "academic_year_id": "ay-uuid"
  }'
```

**Expected Response:**
```json
{
  "success_count": 2,
  "total_count": 2,
  "message": "Successfully created 2 fee student mappings",
  "created_mappings": [
    {
      "id": "...",
      "student_id": "student-uuid-1",
      "total_fee": 7770.00,
      "student_fee_mapping_terms": [],  // Empty - no terms created
      ...
    },
    {
      "id": "...",
      "student_id": "student-uuid-2",
      "total_fee": 7770.00,
      "student_fee_mapping_terms": [],  // Empty - no terms created
      ...
    }
  ],
  "errors": []
}
```

### Test Case 2: Verify Database State

```sql
-- Check mappings were created
SELECT * FROM fee_student_mappings
WHERE fee_type_id = '<fee-type-uuid>'
AND class_id = '<class-uuid>';

-- Verify NO term amounts were created (should return 0 rows)
SELECT * FROM fee_student_map_term_amounts
WHERE fee_student_map_id IN (
  SELECT id FROM fee_student_mappings
  WHERE fee_type_id = '<fee-type-uuid>'
  AND class_id = '<class-uuid>'
);
```

---

## Error Scenarios to Handle

| Scenario | HTTP Code | Error Message |
|----------|-----------|---------------|
| Student not found | 404 | "Student {id} not found" |
| Class not found | 404 | "Class not found" |
| Section not found | 404 | "Section not found" |
| Fee type not found | 404 | "Fee type not found" |
| Duplicate mapping | 409 | "Mapping already exists for student {id}" |
| Empty student_ids | 400 | "student_ids cannot be empty" |
| Invalid total_fee | 400 | "total_fee must be greater than 0" |

---

## Frontend Code References

### Request Origination
- **Component:** `src/components/fee/mappings/BulkStudentMappingForm.tsx:148-218`
- **API Call:** `src/api/fee/studentMappings.ts:81-87`
- **Type Definition:** `src/types/fee/mapping.ts:117-124`
- **Endpoint Constant:** `src/constants/api/fee.ts:20-21`

### Current Flow
1. User selects class, section, fee type, and students
2. User enters total fee amount
3. User clicks "Create Mappings"
4. Frontend sends bulk request (WITHOUT term amounts)
5. Backend attempts to create mappings AND term amounts
6. Backend fails because `term_id` is null

---

## Related Issues

This is similar to the class mapping term amounts issue documented in:
- `BACKEND_HANDOVER_FEE_CLASS_MAPPINGS.md`
- `BACKEND_HANDOVER_FEE_TERM_AMOUNTS.md`

The pattern should be consistent across both class mappings and student mappings.

---

## Multi-Tenant Considerations

Ensure backend:
1. Sets the correct schema based on `cschema` header
2. Validates all IDs exist within the same tenant
3. Doesn't allow cross-tenant data access
4. Uses tenant-specific academic year, classes, students

---

## Expected Flow After Fix

1. User bulk creates student mappings with total fee
2. Backend creates mappings WITHOUT term amounts
3. User navigates to term amounts management screen
4. User sets term distribution (e.g., 50% Term 1, 50% Term 2)
5. Backend updates `fee_student_map_term_amounts` table
6. Fee collection can now track payments by term

---

## Contact

For questions about the frontend implementation:
- Check: `src/components/fee/mappings/BulkStudentMappingForm.tsx`
- Check: `src/api/fee/studentMappings.ts`
- Check: `src/types/fee/mapping.ts`

---

## Success Criteria

- [ ] POST request returns 201 Created (not 500)
- [ ] Student mappings are created in database
- [ ] NO term amounts are created (or term amounts created with valid term_ids)
- [ ] Frontend receives success response
- [ ] Success toast shows "Successfully created N mappings"
- [ ] Student mappings table shows new mappings
- [ ] No database constraint violations

---

## Priority

**HIGH** - This is completely blocking the bulk student fee mapping feature. Users cannot assign fees to multiple students at once.
