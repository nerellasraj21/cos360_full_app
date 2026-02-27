# Frontend Handover: Class Subject Mapping - Section Support

**Date**: 2025-12-28
**Backend Status**: Completed & Tested
**Priority**: High - Breaking Change

---

## Summary

The `class_subject_mappings` feature has been updated to support **section-level subject assignments**. Previously, subjects were mapped at the class level only. Now, each subject mapping is tied to a specific **class + section** combination.

---

## Breaking Changes

| Change | Before | After |
|--------|--------|-------|
| `section_id` field | Not present | **Optional** (UUID) - defaults to ALL sections |
| Unique constraint | `class_id + subject_id + academic_year_id` | `class_id + section_id + subject_id + academic_year_id` |
| Bulk endpoint scope | Per class | Per class + section (or all sections if null) |

---

## API Endpoints

**Base URL**: `/api/v1/masters/class-subject-mappings`

### 1. GET All Mappings

```
GET /api/v1/masters/class-subject-mappings/
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| skip | int | No | Pagination offset (default: 0) |
| limit | int | No | Page size (default: 100, max: 1000) |
| class_id | UUID | No | Filter by class |
| section_id | UUID | No | Filter by section |
| academic_year_id | UUID | No | Filter by academic year |
| active_only | bool | No | Only active mappings (default: true) |

**Response**:
```json
{
  "items": [
    {
      "id": "fdd68caf-00ba-49c4-8a03-28bebc10df9e",
      "class_id": "de912c1a-9dd5-45c2-814b-fb140d3491cf",
      "section_id": "89008855-7fad-4c43-9740-d1907a560880",
      "subject_id": "b90cbc3e-7e05-4548-9acf-cc1717ee1048",
      "academic_year_id": "bb30dcea-194c-4f71-8343-80edc5ebcc74",
      "exclude_marks": false,
      "order": 1,
      "is_active": true,
      "created_at": "2025-12-28T03:25:57.958094",
      "updated_at": "2025-12-28T03:25:57.958094",
      "class_name": "CVS1",
      "section_name": "X",
      "subject_name": "Mathematics",
      "academic_year_name": "2025-26"
    }
  ],
  "total_count": 1,
  "has_next": false
}
```

---

### 2. GET Mappings by Class (with Section Filter)

```
GET /api/v1/masters/class-subject-mappings/by-class/{class_id}
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| section_id | UUID | No | Filter by specific section |
| academic_year_id | UUID | No | Filter by academic year |
| active_only | bool | No | Only active mappings (default: true) |

**Response**: Array of mapping objects (same structure as above)

---

### 3. Bulk Create/Update Mappings (Primary Endpoint)

```
POST /api/v1/masters/class-subject-mappings/bulk
```

**section_id Behavior**:
| Value | Behavior |
|-------|----------|
| Valid UUID | Applies mappings to that specific section only |
| `null` or omitted | Applies mappings to **ALL active sections** in the class |

**Request Body (specific section)**:
```json
{
  "class_id": "de912c1a-9dd5-45c2-814b-fb140d3491cf",
  "section_id": "89008855-7fad-4c43-9740-d1907a560880",
  "academic_year_id": "bb30dcea-194c-4f71-8343-80edc5ebcc74",
  "subjects": [
    {"subject_id": "...", "exclude_marks": false, "order": 1, "is_active": true}
  ]
}
```

**Request Body (ALL sections)**:
```json
{
  "class_id": "de912c1a-9dd5-45c2-814b-fb140d3491cf",
  "section_id": null,
  "academic_year_id": "bb30dcea-194c-4f71-8343-80edc5ebcc74",
  "subjects": [
    {"subject_id": "...", "exclude_marks": false, "order": 1, "is_active": true}
  ]
}
```

**Upsert Behavior**:
- Creates new mappings for subjects not already mapped
- Updates existing mappings if subject already exists for class+section+academic_year
- **Deactivates** (sets `is_active=false`) any existing mappings NOT in the request

**Response**:
```json
{
  "success": true,
  "message": "Successfully processed class-subject mappings for 24 sections: 24 created, 0 updated, 0 deactivated",
  "created_count": 24,
  "updated_count": 0,
  "deactivated_count": 0,
  "sections_processed": 24,
  "mappings": [...]
}
```

**Response Fields**:
| Field | Description |
|-------|-------------|
| `sections_processed` | Number of sections that were updated (1 if specific section, N if all sections) |
| `created_count` | Total new mappings created across all sections |
| `updated_count` | Total existing mappings updated across all sections |
| `deactivated_count` | Total mappings deactivated across all sections |

---

### 4. GET Single Mapping

```
GET /api/v1/masters/class-subject-mappings/{mapping_id}
```

---

### 5. Update Mapping

```
PUT /api/v1/masters/class-subject-mappings/{mapping_id}
```

**Request Body** (all fields optional):
```json
{
  "exclude_marks": true,
  "order": 5,
  "is_active": false
}
```

---

### 6. Delete Mapping

```
DELETE /api/v1/masters/class-subject-mappings/{mapping_id}
```

---

### 7. Dropdown Endpoint

```
GET /api/v1/masters/class-subject-mappings/dropdown
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| class_id | UUID | No | Filter by class |
| section_id | UUID | No | Filter by section |
| academic_year_id | UUID | No | Filter by academic year |

**Response**:
```json
[
  {
    "id": "fdd68caf-00ba-49c4-8a03-28bebc10df9e",
    "class_name": "CVS1",
    "section_name": "X",
    "subject_name": "Mathematics",
    "exclude_marks": false,
    "order": 1
  }
]
```

---

## UI/UX Recommendations

### Class Subject Mapping Page

1. **Add Section Selector**: After selecting a class, show a section dropdown with "All Sections" option
2. **Workflow**: Class -> Section (or All) -> Academic Year -> Subject Assignment
3. **"Apply to All Sections"**: When user selects "All Sections", send `section_id: null`
4. **Copy Feature** (optional): Allow copying subject mappings from one section to another

### Suggested UI Flow

```
┌─────────────────────────────────────────────────────────┐
│  Class Subject Mapping                                  │
├─────────────────────────────────────────────────────────┤
│  Class:    [CVS1           ▼]                           │
│  Section:  [All Sections   ▼]  ← INCLUDES "All" OPTION  │
│            ├─ All Sections ─┤                           │
│            ├─ Section A ────┤                           │
│            ├─ Section B ────┤                           │
│            └─ Section C ────┘                           │
│  Year:     [2025-26        ▼]                           │
├─────────────────────────────────────────────────────────┤
│  ☑ Mathematics          Order: [1]  ☐ Exclude Marks    │
│  ☑ English              Order: [2]  ☐ Exclude Marks    │
│  ☑ Science              Order: [3]  ☑ Exclude Marks    │
│  ☐ Physical Education   Order: [4]  ☐ Exclude Marks    │
├─────────────────────────────────────────────────────────┤
│  ⚠️ Applying to 24 sections          [Save Mappings]    │
└─────────────────────────────────────────────────────────┘
```

### Section Dropdown Logic

```javascript
// When building the request:
const payload = {
  class_id: selectedClassId,
  section_id: selectedSectionId === "ALL" ? null : selectedSectionId,
  academic_year_id: selectedAcademicYearId,
  subjects: [...]
};
```

---

## Test Credentials

**Tenant**: `test_tenant_schema`

```json
{
  "username": "admin",
  "password": "testpass123"
}
```

**Headers Required**:
```
Authorization: Bearer <token>
cschema: test_tenant_schema
Content-Type: application/json
```

---

## Test Data Available

| Entity | ID | Name |
|--------|-----|------|
| Class | `de912c1a-9dd5-45c2-814b-fb140d3491cf` | CVS1 |
| Section | `89008855-7fad-4c43-9740-d1907a560880` | X |
| Section | `e1c7e6cb-f2dc-4fc3-8468-9d1dcbd7d418` | W |
| Subject | `b90cbc3e-7e05-4548-9acf-cc1717ee1048` | New test random editing |
| Subject | `d48a4fe6-8e4b-4bc6-8357-744a02781fa1` | Test_Subject |
| Academic Year | `bb30dcea-194c-4f71-8343-80edc5ebcc74` | 2025-26 |

---

## Validation Rules

| Field | Rule |
|-------|------|
| section_id | **Optional** - if null/omitted, applies to ALL sections in the class |
| class_id | Required, must exist |
| subject_id | Required, must exist |
| academic_year_id | Required, must exist |
| order | Optional, integer |
| exclude_marks | Optional, boolean (default: false) |
| is_active | Optional, boolean (default: true) |

**Error Responses**:

| Scenario | HTTP Status | Message |
|----------|-------------|---------|
| `section_id` provided but doesn't belong to class | 404 | `Section not found or does not belong to the specified class` |
| `class_id` has no active sections (when section_id is null) | 404 | `No active sections found for this class` |
| `class_id` not found | 404 | `Class not found` |
| `academic_year_id` not found | 404 | `Academic year not found` |

---

## Pagination

The Class Subject Mapping page includes full pagination support for viewing large datasets.

### Features

- **Previous/Next Navigation**: Navigate through pages using Previous and Next buttons
- **Page Size Selector**: Adjust rows per page (5, 10, 20, 50, 100)
- **Page Information**: View current page, total pages, and record range
- **Auto-disable Logic**: Buttons automatically disable when at first/last page

### UI Elements

```text
┌─────────────────────────────────────────────────────────┐
│  [Previous]  [Next]      Rows per page: [5▼]  1-5 of 50 │
└─────────────────────────────────────────────────────────┘
```

### Implementation Details

- **Component**: Uses the shared `Table` component from `@/components/common/table.tsx`
- **Hook**: `useClassSubjectMappingsPaginated` handles pagination logic
- **State Management**: Page and pageSize state managed in the page component
- **API Parameters**:
  - `skip`: Calculated as `page * pageSize`
  - `limit`: Current page size
- **Styling**: Fully responsive with dark mode support

### Developer Notes

- Pagination state resets when changing page size
- Total count is fetched from the API response
- Next button disabled when: `(page + 1) * pageSize >= total`
- Previous button disabled when: `page === 0`

---

## Testing Checklist

- [ ] Class Subject Mapping page loads without errors
- [ ] Section dropdown appears after selecting a class
- [ ] Section dropdown includes "All Sections" option at the top
- [ ] Section dropdown only shows sections for selected class
- [ ] Bulk save works with specific section_id
- [ ] Bulk save works with section_id = null (applies to all sections)
- [ ] Response shows correct `sections_processed` count
- [ ] Existing mappings display with section name
- [ ] Filter by section works
- [ ] Upsert correctly deactivates removed subjects
- [ ] Dropdown endpoint returns section_name
- [ ] Warning message shown when "All Sections" is selected
- [ ] **Pagination: Previous button works and disables at first page**
- [ ] **Pagination: Next button works and disables at last page**
- [ ] **Pagination: Page size selector changes displayed rows**
- [ ] **Pagination: Page information displays correctly**
- [ ] **Pagination: Works correctly in both light and dark mode**

---

## Related Endpoints (No Changes)

These endpoints can help populate dropdowns:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/masters/classes/dropdown` | Get classes |
| `GET /api/v1/masters/classes/{id}/sections` | Get sections for a class |
| `GET /api/v1/masters/subjects/` | Get subjects |
| `GET /api/v1/masters/academic-years/dropdown` | Get academic years |

---

## Contact

For questions or issues, refer to:
- Backend migration doc: `AI_GOVERNANCE/DATABASE_CHANGES_REVIEW.md`
- Module context: `context/modules/masters.md`
