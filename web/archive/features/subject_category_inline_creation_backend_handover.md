# Backend Handover Document

## Metadata

- **Agent Name:** Frontend Developer Agent
- **Issue / Feature ID:** Subject & Subject Categories Integration - Backend Requirements
- **Date:** 2025-12-28
- **Related Frontend Implementation:** `subject_category_inline_creation_frontend_impl.md`

---

## 1. Feature Overview

The frontend now supports inline creation of Subject Categories directly from the Subject creation form. This document outlines the backend API requirements to ensure compatibility.

---

## 2. Current API Usage

### Endpoint Used by Frontend

**Create Subject Category**
```
POST /api/v1/subject-categories
```

**Request Body (SubjectCategoryInput):**
```json
{
  "name": "string"  // Required
}
```

**Expected Response (SubjectCategory):**
```json
{
  "id": "string",
  "name": "string",
  "description": "string | null",
  "display_order": "number | null",
  "subject_count": "number | null",
  "is_active": "boolean | null",
  "created_at": "string | null",
  "updated_at": "string | null"
}
```

### Frontend Type Definitions

From `src/types/masters/subject.ts:27-43`:

```typescript
export interface SubjectCategory {
  id: string;
  name: string;
  description?: string;
  display_order?: number;
  subject_count?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SubjectCategoryInput {
  name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}
```

---

## 3. Backend Requirements

### 3.1 Minimum Requirements (Current)

The backend must support:

| Requirement | Description | Status |
|-------------|-------------|--------|
| POST endpoint | `POST /api/v1/subject-categories` | Required |
| Name-only creation | Accept `{ "name": "string" }` as valid input | Required |
| Return created entity | Response must include `id` and `name` at minimum | Required |
| Permission check | Validate `subject_categories:create` permission | Required |
| Tenant isolation | Apply `cschema` header for multi-tenancy | Required |

### 3.2 Recommended Enhancements

#### 3.2.1 Duplicate Name Validation

**Current Behavior (Unknown):** The frontend does not validate duplicate names before submission.

**Recommended Backend Behavior:**
```json
// Request
POST /api/v1/subject-categories
{ "name": "Science" }

// Response (if duplicate exists)
HTTP 400 Bad Request
{
  "detail": "A subject category with name 'Science' already exists"
}
```

#### 3.2.2 Default Values

When only `name` is provided, the backend should set sensible defaults:

| Field | Default Value |
|-------|---------------|
| `description` | `null` |
| `display_order` | Auto-increment or `0` |
| `is_active` | `true` |

#### 3.2.3 Name Trimming and Validation

**Recommended:**
- Trim whitespace from name
- Reject empty names after trimming
- Consider case-insensitive duplicate check

```python
# Example validation
name = input.name.strip()
if not name:
    raise HTTPException(400, "Category name cannot be empty")

# Case-insensitive duplicate check
existing = db.query(SubjectCategory).filter(
    func.lower(SubjectCategory.name) == name.lower(),
    SubjectCategory.tenant_id == tenant_id
).first()
if existing:
    raise HTTPException(400, f"Category '{name}' already exists")
```

---

## 4. Permission Requirements

### Required Permission

```
subject_categories:create
```

### Permission Check Flow

1. Frontend checks permission before rendering the "+" button
2. Backend must also validate permission on API call
3. If permission denied, return:

```json
HTTP 403 Forbidden
{
  "detail": "You do not have permission to create subject categories"
}
```

---

## 5. API Response Handling

### Success Response

```json
HTTP 201 Created
{
  "id": "uuid-or-integer",
  "name": "New Category Name",
  "description": null,
  "display_order": 0,
  "is_active": true,
  "subject_count": 0,
  "created_at": "2025-12-28T10:00:00Z",
  "updated_at": "2025-12-28T10:00:00Z"
}
```

**Critical:** The response MUST include `id` - the frontend uses this to auto-select the newly created category.

### Error Responses

| HTTP Code | Scenario | Response Format |
|-----------|----------|-----------------|
| 400 | Validation error (empty name, duplicate) | `{ "detail": "error message" }` |
| 401 | Unauthenticated | `{ "detail": "Not authenticated" }` |
| 403 | Permission denied | `{ "detail": "Permission denied" }` |
| 500 | Server error | `{ "detail": "Internal server error" }` |

---

## 6. Database Considerations

### Table: subject_categories

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID/INT | PRIMARY KEY | Auto-generated |
| name | VARCHAR(255) | NOT NULL, UNIQUE per tenant | Category name |
| description | TEXT | NULLABLE | Optional description |
| display_order | INT | DEFAULT 0 | For sorting |
| is_active | BOOLEAN | DEFAULT TRUE | Soft delete flag |
| tenant_id | UUID/INT | FOREIGN KEY | Multi-tenancy |
| created_at | TIMESTAMP | DEFAULT NOW() | Audit field |
| updated_at | TIMESTAMP | DEFAULT NOW() | Audit field |

### Unique Constraint

```sql
-- Unique name per tenant
ALTER TABLE subject_categories
ADD CONSTRAINT uq_subject_categories_name_tenant
UNIQUE (name, tenant_id);
```

---

## 7. Testing Checklist

### API Tests

- [ ] Create category with name only
- [ ] Create category with all fields
- [ ] Reject duplicate names (same tenant)
- [ ] Allow same name in different tenants
- [ ] Reject empty name
- [ ] Reject whitespace-only name
- [ ] Verify permission check
- [ ] Verify tenant isolation

### Integration Tests

- [ ] Frontend receives created category with valid ID
- [ ] Dropdown refreshes to show new category
- [ ] New category can be used in subject creation

---

## 8. Open Questions for Backend Team

1. **Duplicate handling:** Should duplicate names be case-insensitive? (e.g., "Science" vs "science")

2. **Character limits:** What is the maximum length for category name?

3. **Special characters:** Are there any restrictions on characters in category names?

4. **Audit logging:** Should category creation be logged in audit trail?

5. **Rate limiting:** Should there be rate limiting on category creation to prevent abuse?

---

## 9. Summary of Backend Actions

| Priority | Action | Description |
|----------|--------|-------------|
| Required | Verify endpoint | Ensure `POST /api/v1/subject-categories` exists |
| Required | Verify response | Ensure response includes `id` field |
| Required | Verify permissions | Check `subject_categories:create` permission |
| Recommended | Add duplicate check | Prevent duplicate category names per tenant |
| Recommended | Add name validation | Trim whitespace, reject empty names |
| Optional | Add audit logging | Log category creation events |

---

## 10. Confidence Level

**High** - No changes expected to be required if the existing SubjectCategory CRUD API follows standard patterns.

---

## Declaration

> This output complies with **AI_HALLUCINATION_SOP.md**.

All requirements are based on frontend type definitions and API integration patterns observed in the codebase.
