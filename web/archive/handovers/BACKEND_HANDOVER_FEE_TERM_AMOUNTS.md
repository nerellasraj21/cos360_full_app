# Backend Handover - Fee Class Mapping Term Amounts Endpoint

## Issue Summary

**Endpoint:** `POST /api/v1/fee/class-mapping-term-amounts/`
**Status:** ❌ Returning 500 Internal Server Error
**Error Message:** "Failed to create term amounts"
**Priority:** HIGH - Blocking fee term amount management

---

## Current Request

### Endpoint
```
POST /api/v1/fee/class-mapping-term-amounts/
```

### Headers
```
Authorization: Bearer <token>
cschema: test_tenant
Content-Type: application/json
```

### Request Body Example
```json
{
  "fee_class_mapping_id": "uuid-string",
  "term_amounts": [
    {
      "term_date_id": "uuid-string",
      "term_amount": 10000.00
    },
    {
      "term_date_id": "uuid-string",
      "term_amount": 15000.00
    }
  ]
}
```

**Note**: The frontend may send `term_id` or `term_number.toString()` as fallback if `term_date_id` is not available.

---

## Expected Behavior

The endpoint should:
1. Accept the fee class mapping ID and array of term amounts
2. Create multiple `class_fee_mapping_terms` records in the database
3. Associate each term amount with the fee class mapping
4. Return the created records

---

## Expected Response Structure

### Success Response (201 Created)
```json
{
  "fee_class_mapping_id": "uuid-string",
  "term_amounts": [
    {
      "id": "uuid-string",
      "fee_class_mapping_id": "uuid-string",
      "term_date_id": "uuid-string",
      "term_amount": 10000.00,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid-string",
      "fee_class_mapping_id": "uuid-string",
      "term_date_id": "uuid-string",
      "term_amount": 15000.00,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Alternative Simple Response
```json
{
  "message": "Term amounts created successfully",
  "count": 2
}
```

---

## Database Schema Requirements

### Table: `class_fee_mapping_terms`

```sql
CREATE TABLE class_fee_mapping_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fee_class_mapping_id UUID NOT NULL REFERENCES fee_class_mappings(id) ON DELETE CASCADE,
    term_date_id UUID NOT NULL REFERENCES fee_terms(id) ON DELETE CASCADE,
    term_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fee_class_mapping_id, term_date_id)
);
```

**Important**: The table uses `term_date_id` (not `term_id`) to reference `fee_terms.id`.

---

## Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fee_class_mapping_id` | UUID | Yes | ID of the fee class mapping |
| `term_amounts` | Array | Yes | Array of term amount objects |
| `term_amounts[].term_date_id` | UUID | Yes | ID of the fee term (from `fee_terms` table) |
| `term_amounts[].term_amount` | Decimal | Yes | Amount for this term (must be > 0) |

---

## Common Issues to Check

### 1. **Table Name Mismatch**

The frontend sends to: `/fee/class-mapping-term-amounts/`

Check if backend route expects different naming:
- `class_fee_mapping_terms` (database table name)
- `class-mapping-term-amounts` (API route)
- `fee_class_mapping_terms` (possible alternative)

**Recommendation**: Use `class-mapping-term-amounts` in API, `class_fee_mapping_terms` in database.

---

### 2. **Field Name Mismatch**

Frontend sends: `term_date_id`
Database may expect: `term_id`

**Check**:
```sql
-- What columns exist in the table?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'class_fee_mapping_terms'
AND table_schema = 'test_tenant';
```

**If mismatch**: Update backend to map `term_date_id` → database column name.

---

### 3. **Foreign Key Constraints**

The endpoint may be failing because:
- `fee_class_mapping_id` doesn't exist in `fee_class_mappings` table
- `term_date_id` doesn't exist in `fee_terms` table

**Check**:
```sql
-- Verify the fee class mapping exists
SELECT * FROM fee_class_mappings
WHERE id = '<fee_class_mapping_id>';

-- Verify the term dates exist
SELECT * FROM fee_terms
WHERE id IN ('<term_date_id_1>', '<term_date_id_2>');
```

---

### 4. **Bulk Insert Logic**

The endpoint receives an **array** of term amounts and should insert them all in one transaction.

**Example implementation (Python/SQLAlchemy)**:
```python
@router.post("/class-mapping-term-amounts/")
async def create_class_mapping_term_amounts(
    data: ClassMappingTermAmountsCreate,
    db: Session = Depends(get_db),
    tenant: str = Depends(get_tenant)
):
    # Set schema
    db.execute(text(f"SET search_path TO {tenant}"))

    # Verify fee class mapping exists
    mapping = db.query(FeeClassMapping).filter(
        FeeClassMapping.id == data.fee_class_mapping_id
    ).first()

    if not mapping:
        raise HTTPException(status_code=404, detail="Fee class mapping not found")

    # Create term amounts
    created_amounts = []
    for term_data in data.term_amounts:
        term_amount = ClassFeeMappingTerm(
            fee_class_mapping_id=data.fee_class_mapping_id,
            term_date_id=term_data.term_date_id,
            term_amount=term_data.term_amount
        )
        db.add(term_amount)
        created_amounts.append(term_amount)

    db.commit()

    # Refresh to get IDs
    for amount in created_amounts:
        db.refresh(amount)

    return {
        "fee_class_mapping_id": data.fee_class_mapping_id,
        "term_amounts": created_amounts
    }
```

---

### 5. **Duplicate Prevention**

The table has a UNIQUE constraint on `(fee_class_mapping_id, term_date_id)`.

If term amounts already exist, the insert will fail. Backend should:
- **Option A**: Delete existing term amounts for this mapping first
- **Option B**: Use UPSERT (INSERT ... ON CONFLICT UPDATE)
- **Option C**: Return 409 Conflict error

**Recommended**: Option B (upsert) or handle via separate UPDATE endpoint.

---

### 6. **Validation**

Backend should validate:
- `fee_class_mapping_id` is a valid UUID
- `term_date_id` is a valid UUID
- `term_amount` is a positive decimal (> 0)
- `term_amounts` array is not empty
- Foreign keys exist

**Example validation**:
```python
if not data.term_amounts:
    raise HTTPException(status_code=400, detail="term_amounts cannot be empty")

for term in data.term_amounts:
    if term.term_amount <= 0:
        raise HTTPException(status_code=400, detail="term_amount must be greater than 0")
```

---

## Frontend Implementation

### API Helper (`src/api/fee/mappings.ts:103-112`)

```typescript
createClassMappingTermAmounts: async (data: {
    fee_class_mapping_id: string;
    term_amounts: { term_id: string; term_amount: number }[];
}): Promise<any> => {
    console.log('[DEBUG] feeMappingsApi.createClassMappingTermAmounts called with data:', data);

    const response = await CAxios.post('/fee/class-mapping-term-amounts/', data);
    console.log('[DEBUG] feeMappingsApi.createClassMappingTermAmounts success:', response.data);
    return response.data;
}
```

### Component Usage (`src/components/fee/mappings/TermAmountModal.tsx:245-256`)

```typescript
const termAmountData = termAmounts.map(ta => ({
    term_date_id: ta.term_date_id || ta.term_id || ta.term_number.toString(),
    term_amount: ta.term_amount || 0
}));

await createTermAmountsMutation.mutateAsync({
    fee_class_mapping_id: mapping.id.toString(),
    term_amounts: termAmountData
});
```

---

## Related Endpoints

Frontend also uses these endpoints (should be consistent):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/fee/class-mapping-term-amounts/` | POST | Create term amounts (FAILING) |
| `/fee/class-mapping-term-amounts/` | PUT | Update term amounts |
| `/fee/class-mapping-term-amounts/` | DELETE | Delete term amounts |
| `/fee/class-mappings/` | GET | Get class mappings (also failing - see other handover) |

---

## Backend Debugging Steps

### Step 1: Check Logs
```bash
# Look for the full error stack trace
tail -f /var/log/backend.log | grep "class-mapping-term-amounts"
```

### Step 2: Test Database Connection
```sql
-- Switch to tenant schema
SET search_path TO test_tenant;

-- Check table exists
SELECT * FROM class_fee_mapping_terms LIMIT 1;

-- Check structure
\d class_fee_mapping_terms
```

### Step 3: Test Manual Insert
```sql
-- Try inserting a record manually
INSERT INTO class_fee_mapping_terms (
    fee_class_mapping_id,
    term_date_id,
    term_amount
) VALUES (
    '<valid-mapping-id>',
    '<valid-term-id>',
    10000.00
);
```

If manual insert works, the issue is in the backend code logic.
If manual insert fails, check foreign keys and constraints.

### Step 4: Check Permissions
```sql
-- Verify database user has INSERT permission
GRANT INSERT ON class_fee_mapping_terms TO backend_user;
```

### Step 5: Validate Request Data
Add logging to see exactly what data the backend receives:
```python
print(f"Received data: {data}")
print(f"fee_class_mapping_id: {data.fee_class_mapping_id}")
print(f"term_amounts: {data.term_amounts}")
```

---

## Testing After Fix

### 1. Test with curl
```bash
curl -X POST \
  "http://localhost:8000/api/v1/fee/class-mapping-term-amounts/" \
  -H "Authorization: Bearer <token>" \
  -H "cschema: test_tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "fee_class_mapping_id": "valid-uuid",
    "term_amounts": [
      {
        "term_date_id": "term-uuid-1",
        "term_amount": 10000.00
      },
      {
        "term_date_id": "term-uuid-2",
        "term_amount": 15000.00
      }
    ]
  }'
```

### 2. Expected Success Response
```json
{
  "fee_class_mapping_id": "valid-uuid",
  "term_amounts": [
    { "id": "...", "term_amount": 10000.00, ... },
    { "id": "...", "term_amount": 15000.00, ... }
  ]
}
```

### 3. Test in Frontend
1. Navigate to `http://localhost:5173/fee/mappings`
2. Click "Manage Term Amounts" for a class mapping
3. Enter term amounts
4. Click "Save Term Amounts"
5. Should see success toast: "Term amounts saved successfully"

---

## Error Scenarios to Handle

| Scenario | HTTP Code | Error Message |
|----------|-----------|---------------|
| Fee class mapping not found | 404 | "Fee class mapping not found" |
| Term date not found | 404 | "Term date not found" |
| Invalid amount (≤ 0) | 400 | "Term amount must be greater than 0" |
| Empty term_amounts array | 400 | "term_amounts cannot be empty" |
| Duplicate term for mapping | 409 | "Term amount already exists for this mapping" |
| Database error | 500 | "Internal server error" |

---

## Expected Flow

1. Frontend sends POST request with mapping ID and term amounts
2. Backend validates:
   - Fee class mapping exists
   - All term dates exist
   - All amounts are positive
3. Backend creates records in `class_fee_mapping_terms` table
4. Backend returns created records
5. Frontend shows success toast
6. Frontend refreshes the mappings list

---

## Data Validation Rules

- `fee_class_mapping_id`: Must be valid UUID
- `term_date_id`: Must be valid UUID, must exist in `fee_terms` table
- `term_amount`: Must be number > 0, max 2 decimal places
- `term_amounts`: Must be array with at least 1 item

---

## Multi-Tenant Considerations

Ensure backend:
1. Sets the correct schema based on `cschema` header
2. Validates data exists within the same tenant
3. Doesn't allow cross-tenant data access

---

## Success Criteria

- [ ] POST request returns 201 Created (not 500)
- [ ] Term amounts are inserted into database
- [ ] Frontend receives created records
- [ ] Success toast appears
- [ ] Class mappings table refreshes with updated term amounts
- [ ] Term distribution status shows "Complete"

---

## Contact

For questions about the frontend implementation:
- Check: `src/api/fee/mappings.ts`
- Check: `src/components/fee/mappings/TermAmountModal.tsx`
- Check: `src/types/fee/mapping.ts`

---

## Priority

**HIGH** - This is blocking the fee term amount management feature entirely. Users cannot assign term amounts to fee class mappings.
