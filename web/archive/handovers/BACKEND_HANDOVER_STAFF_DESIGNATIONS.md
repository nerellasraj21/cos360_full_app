# Backend Handover Document: Staff Designations API Issue

**Date**: 2026-02-07
**Module**: Staff Management - Designations
**Priority**: Medium
**Reported By**: Frontend Team

---

## Executive Summary

The Staff Designations page (`/staff/designations`) is not displaying the **Staff Count** and **Created Date** columns because the backend API endpoint is not returning the required fields (`staff_members` and `created_at`) in the response.

---

## Problem Statement

### Current Behavior

The frontend application successfully calls the API endpoint:
```
GET /api/v1/staff/designations/
```

However, the API response is missing critical fields that the frontend needs to display:
1. **`created_at`** - Timestamp when the designation was created
2. **`staff_members`** - Array of staff members assigned to this designation (or count)

### Impact

Users cannot see:
- ✗ When each designation was created
- ✗ How many staff members are assigned to each designation

This reduces the usefulness of the designations management page and makes it difficult for administrators to understand designation usage.

### Current API Response (Actual)

```json
{
  "items": [
    {
      "id": "uuid-1234",
      "title": "Mathematics Teacher"
    },
    {
      "id": "uuid-5678",
      "title": "Principal"
    }
  ],
  "total": 2,
  "skip": 0,
  "limit": 100
}
```

### Expected API Response (Required)

```json
{
  "items": [
    {
      "id": "uuid-1234",
      "title": "Mathematics Teacher",
      "staff_members": [
        {
          "id": "staff-uuid-1",
          "first_name": "John",
          "last_name": "Doe",
          "email": "john.doe@school.com",
          "is_active": true
        }
      ],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    },
    {
      "id": "uuid-5678",
      "title": "Principal",
      "staff_members": [],
      "created_at": "2024-01-10T09:00:00Z",
      "updated_at": "2024-01-10T09:00:00Z"
    }
  ],
  "total": 2,
  "skip": 0,
  "limit": 100
}
```

---

## Frontend Type Definition

The frontend expects the following TypeScript interface:

```typescript
// File: src/types/staff/staff.ts

export interface Designation {
  id: string;
  title: string;
  staff_members?: Staff[];  // Optional array of staff
  created_at: string;        // ISO 8601 format
  updated_at: string;        // ISO 8601 format
}

export interface Staff {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  designation_id?: string;
  is_active: boolean;
  // ... other fields
}

export interface DesignationListResponse {
  items: Designation[];
  total: number;
  skip: number;
  limit: number;
}
```

---

## Proposed Solution

### Option 1: Return Full Staff Members Array (Recommended for < 100 designations)

**Pros:**
- Complete data available on frontend
- No additional API calls needed
- Can display staff details if needed in future

**Cons:**
- Larger response payload
- May impact performance if many staff per designation

**Backend Implementation:**
1. Join the `designations` table with `staff` table on `designation_id`
2. Include `created_at` and `updated_at` timestamps from the `designations` table
3. Return array of staff members for each designation

**Example SQL/ORM Query (Pseudo-code):**
```sql
SELECT
  d.id,
  d.title,
  d.created_at,
  d.updated_at,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', s.id,
      'first_name', s.first_name,
      'last_name', s.last_name,
      'email', s.email,
      'is_active', s.is_active
    )
  ) as staff_members
FROM designations d
LEFT JOIN staff s ON s.designation_id = d.id
WHERE d.tenant_id = :tenant_id
GROUP BY d.id, d.title, d.created_at, d.updated_at
ORDER BY d.created_at DESC
LIMIT :limit OFFSET :skip;
```

---

### Option 2: Return Staff Count Only (Recommended for > 100 designations)

**Pros:**
- Minimal payload size
- Better performance
- Sufficient for current UI needs

**Cons:**
- Need to update frontend type definition
- Less flexible for future features

**Backend Response Structure:**
```json
{
  "items": [
    {
      "id": "uuid-1234",
      "title": "Mathematics Teacher",
      "staff_count": 5,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ],
  "total": 2,
  "skip": 0,
  "limit": 100
}
```

**Frontend Changes Required:**
```typescript
export interface Designation {
  id: string;
  title: string;
  staff_count?: number;      // Change from staff_members
  created_at: string;
  updated_at: string;
}
```

---

## API Endpoint Details

### Endpoint
```
GET /api/v1/staff/designations/
```

### Authentication
- Required: Yes
- Header: `Authorization: Bearer <token>`

### Tenant Scoping
- Required: Yes
- Header: `cschema: <tenant_name>`

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `skip` | integer | No | 0 | Number of records to skip (pagination) |
| `limit` | integer | No | 100 | Maximum records to return |

### Response Status Codes
- `200 OK` - Success
- `401 Unauthorized` - Missing/invalid auth token
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

---

## Testing Checklist

After implementing the fix, please verify:

- [ ] `created_at` field is present in response
- [ ] `updated_at` field is present in response
- [ ] `staff_members` array (or `staff_count`) is present
- [ ] Empty array returned when no staff assigned to designation
- [ ] Timestamps are in ISO 8601 format (e.g., `2024-01-15T10:30:00Z`)
- [ ] Response is tenant-scoped (only returns designations for current tenant)
- [ ] Pagination works correctly with `skip` and `limit` parameters
- [ ] Total count reflects actual number of designations

### Sample Test Request

```bash
curl -X GET "http://localhost:8000/api/v1/staff/designations/?skip=0&limit=10" \
  -H "Authorization: Bearer <your-token>" \
  -H "cschema: test_tenant" \
  -H "Content-Type: application/json"
```

### Expected Response Sample

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Mathematics Teacher",
      "staff_members": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "first_name": "John",
          "last_name": "Doe",
          "email": "john.doe@school.com",
          "is_active": true
        }
      ],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 10
}
```

---

## Database Schema Reference

### Expected Tables

**`designations` table:**
```sql
CREATE TABLE designations (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

**`staff` table:**
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  designation_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (designation_id) REFERENCES designations(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

---

## Frontend Code Context

### Component Using This API

**File:** `src/components/staff/DesignationsTable.tsx`

**Lines 148-153:** Displays staff count and created date
```typescript
<td className="px-4 py-3 text-sm text-foreground">
  {designation.staff_members?.length || 0} staff member{designation.staff_members?.length !== 1 ? 's' : ''}
</td>
<td className="px-4 py-3 text-sm text-foreground">
  {new Date(designation.created_at).toLocaleDateString()}
</td>
```

### React Query Hook

**File:** `src/hooks/staff/useStaff.ts`

```typescript
export function useDesignations(params?: {
  skip?: number;
  limit?: number;
}) {
  return useQuery<DesignationListResponse>({
    queryKey: staffKeys.designationList(params),
    queryFn: () => staffApi.getAllDesignations(params),
    staleTime: 5 * 60 * 1000,
  });
}
```

### API Client

**File:** `src/api/staff/staff.ts`

```typescript
getAllDesignations: async (params?: {
  skip?: number;
  limit?: number;
}): Promise<DesignationListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

  const response = await CAxios.get(`/staff/designations/?${queryParams.toString()}`);
  return response.data;
}
```

---

## Action Items

### Backend Team

1. [ ] Review this document and choose Option 1 or Option 2
2. [ ] Update the `/api/v1/staff/designations/` endpoint to include:
   - `created_at` timestamp
   - `updated_at` timestamp
   - `staff_members` array (Option 1) OR `staff_count` integer (Option 2)
3. [ ] Test the endpoint with the provided curl command
4. [ ] Verify response matches the expected structure
5. [ ] Deploy to development environment
6. [ ] Notify frontend team when ready for testing

### Frontend Team (if Option 2 is chosen)

1. [ ] Update `Designation` interface to use `staff_count` instead of `staff_members`
2. [ ] Update `DesignationsTable.tsx` to display count directly
3. [ ] Test with updated backend

---

## Questions or Clarifications

If you have any questions about this handover document, please contact:

- **Frontend Team**: [Your Contact Info]
- **Related Issue**: Staff Designations - Missing Fields
- **Slack Channel**: #cos360-development

---

## Appendix: UI Screenshot Reference

### Current UI (Missing Data)

The table shows:
- ✓ Designation Title (working)
- ✗ Staff Count (showing "0 staff members" for all)
- ✗ Created Date (not visible/erroring)

### Expected UI (After Fix)

The table should show:
- ✓ Designation Title (e.g., "Mathematics Teacher")
- ✓ Staff Count (e.g., "5 staff members")
- ✓ Created Date (e.g., "1/15/2024")

---

**Document Version**: 1.0
**Last Updated**: 2026-02-07
