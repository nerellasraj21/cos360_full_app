# Backend Handover - Fee Class Mappings Endpoint

## Issue Summary

**Endpoint:** `GET /api/v1/fee/class-mappings/`
**Status:** ❌ Returning 500 Internal Server Error
**Error Message:** "An error occurred while retrieving fee class mappings"

## Current Request

```
GET /api/v1/fee/class-mappings/?academic_year_id=bb30dcea-194c-4f71-8343-80edc5ebcc74
Headers:
  - Authorization: Bearer <token>
  - cschema: test_tenant
```

**Previous failing academic year ID:** `2e8decd5-dcbc-4128-947c-aef2407d41a2`
**Latest failing academic year ID:** `bb30dcea-194c-4f71-8343-80edc5ebcc74`

## Expected Behavior

The endpoint should return a list of fee class mappings with their associated term amounts.

### Expected Response Structure

```typescript
{
  "items": [
    {
      "id": "uuid-string",
      "class_id": "uuid-string",
      "fee_type_id": "uuid-string",
      "academic_year_id": "uuid-string",
      "total_fee": 50000.00,
      "all_by_default": true,
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "class_fee_mapping_terms": [
        {
          "id": "uuid-string",
          "fee_class_mapping_id": "uuid-string",
          "term_id": "uuid-string",
          "term_amount": 10000.00,
          "created_at": "2024-01-15T10:30:00Z",
          "updated_at": "2024-01-15T10:30:00Z"
        }
      ]
    }
  ],
  "total": 10,
  "skip": 0,
  "limit": 100
}
```

**Note:** The endpoint can also return a plain array instead of paginated response:
```typescript
[
  {
    "id": "uuid-string",
    "class_id": "uuid-string",
    // ... rest of fields
  }
]
```

## Database Schema Requirements

### Table: `fee_class_mappings`

```sql
CREATE TABLE fee_class_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    fee_type_id UUID NOT NULL REFERENCES fee_types(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    total_fee DECIMAL(10, 2) NOT NULL,
    all_by_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, fee_type_id, academic_year_id)
);
```

### Table: `class_fee_mapping_terms`

```sql
CREATE TABLE class_fee_mapping_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fee_class_mapping_id UUID NOT NULL REFERENCES fee_class_mappings(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES fee_terms(id) ON DELETE CASCADE,
    term_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fee_class_mapping_id, term_id)
);
```

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `academic_year_id` | UUID | No | Filter by academic year |
| `class_id` | UUID | No | Filter by class |
| `fee_type_id` | UUID | No | Filter by fee type |
| `all_by_default` | Boolean | No | Filter by default assignment flag |
| `skip` | Integer | No | Pagination offset (default: 0) |
| `limit` | Integer | No | Pagination limit (default: 100) |

## Common Issues to Check

### 1. Database Table Existence
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'test_tenant'
AND tablename IN ('fee_class_mappings', 'class_fee_mapping_terms');
```

### 2. Foreign Key Constraints
Verify that referenced tables exist and have proper relationships:
- `classes` table
- `fee_types` table
- `academic_years` table
- `fee_terms` table

### 3. Multi-Tenant Schema
Ensure the query is using the correct tenant schema:
```python
# Example in Python/FastAPI
tenant = request.headers.get('cschema', 'test_tenant')
# Set schema context for query
```

### 4. Join Queries
The endpoint should LEFT JOIN with `class_fee_mapping_terms` to include term amounts:

```sql
SELECT
    fcm.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', cfmt.id,
                'fee_class_mapping_id', cfmt.fee_class_mapping_id,
                'term_id', cfmt.term_id,
                'term_amount', cfmt.term_amount,
                'created_at', cfmt.created_at,
                'updated_at', cfmt.updated_at
            )
        ) FILTER (WHERE cfmt.id IS NOT NULL),
        '[]'::json
    ) as class_fee_mapping_terms
FROM fee_class_mappings fcm
LEFT JOIN class_fee_mapping_terms cfmt ON fcm.id = cfmt.fee_class_mapping_id
WHERE fcm.academic_year_id = $1
GROUP BY fcm.id
ORDER BY fcm.created_at DESC;
```

### 5. Error Handling
The backend should:
- Log the full stack trace
- Return specific error messages (not generic "An error occurred")
- Handle null/undefined gracefully
- Validate UUID format for parameters

## Backend Debugging Steps

1. **Check Backend Logs**
   ```bash
   # Look for the full error stack trace
   tail -f /var/log/backend.log | grep "fee/class-mappings"
   ```

2. **Test Database Connection**
   ```sql
   -- In PostgreSQL, verify schema and tables
   SET search_path TO test_tenant;
   SELECT * FROM fee_class_mappings LIMIT 1;
   ```

3. **Test Raw Query**
   Run the SQL query directly in the database to isolate SQL vs application errors.

4. **Check Permissions**
   Ensure the database user has SELECT permission on all required tables.

5. **Validate Academic Year**
   ```sql
   -- Check if the academic year exists
   SELECT * FROM academic_years
   WHERE id = 'bb30dcea-194c-4f71-8343-80edc5ebcc74';

   -- Also check the previous failing ID
   SELECT * FROM academic_years
   WHERE id = '2e8decd5-dcbc-4128-947c-aef2407d41a2';
   ```

## Related Endpoints

The frontend also uses these related endpoints that should be consistent:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/fee/class-mappings/` | POST | Create new fee class mapping |
| `/fee/class-mappings/{id}` | GET | Get single mapping by ID |
| `/fee/class-mappings/{id}` | PUT | Update mapping |
| `/fee/class-mappings/{id}` | DELETE | Delete mapping |
| `/fee/class-mappings/bulk` | POST | Bulk create mappings |

## Frontend API Client

**File:** `src/api/fee/classMappings.ts:34`

```typescript
const response = await CAxios.get(`/fee/class-mappings/?${queryParams.toString()}`);
```

**React Query Hook:** `src/hooks/fee/useFeeMappings.ts:24-37`

## Testing

After fixing the backend:

1. **Test with curl:**
   ```bash
   curl -X GET \
     "http://localhost:8000/api/v1/fee/class-mappings/?academic_year_id=bb30dcea-194c-4f71-8343-80edc5ebcc74" \
     -H "Authorization: Bearer <token>" \
     -H "cschema: test_tenant"
   ```

2. **Expected Success Response:**
   ```json
   {
     "items": [...],
     "total": 0
   }
   ```
   Or:
   ```json
   []
   ```

3. **Test in Frontend:**
   - Navigate to `http://localhost:5173/fee/mappings`
   - Click on "Class Mappings" tab
   - Should display the table or "No fee mappings found" message

## Priority

**HIGH** - This is blocking the Fee Mappings feature entirely.

## Contact

If you need clarification on the expected data structure or have questions about the frontend implementation, refer to:
- Frontend codebase: `src/components/fee/mappings/ClassMappingTable.tsx`
- TypeScript types: `src/types/fee/mapping.ts`
- API implementation: `src/api/fee/classMappings.ts`
