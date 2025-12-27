# Handover Document (REVISED)

## Document Info

- **Task ID**: TASK-CLASS-SECTION-SUBJECT-BULK-001
- **Date**: 2025-12-27
- **From Agent**: Feature Implementation Analyst
- **To Agent**: Development Team
- **Status**: Ready for Review

---

## Executive Summary

Investigation reveals the **bulk subject mapping feature already exists**, but it maps subjects to **class + academic_year only** (no section). The user requirement is to map subjects to **class + section + academic_year**. This requires adding `section_id` to the existing implementation.

---

## Current State Analysis

### What Actually Exists (CORRECTED)

| Component | File                                                    | Status |
| --------- | ------------------------------------------------------- | ------ |
| Model     | `app/models/masters/class_subject_mapping_model.py`     | EXISTS |
| Schema    | `app/schemas/masters/class_subject_mapping_schema.py`   | EXISTS |
| Service   | `app/service/masters/class_subject_mapping_service.py`  | EXISTS |
| Endpoint  | `app/api/v1/masters/class_subject_mapping_endpoints.py` | EXISTS |

### Current Model Structure

```python
# File: app/models/masters/class_subject_mapping_model.py

class ClassSubjectMap(BaseOrg):
    __tablename__ = 'class_subject_mappings'

    id = Column(UUID, primary_key=True)
    class_id = Column(UUID, ForeignKey('classes.id'), nullable=False)      # EXISTS
    subject_id = Column(UUID, ForeignKey('subjects.id'), nullable=False)   # EXISTS
    academic_year_id = Column(UUID, ForeignKey('academic_years.id'), nullable=False)  # EXISTS
    exclude_marks = Column(Boolean, default=False)   # EXISTS ✓
    order = Column(Integer, nullable=True)           # EXISTS ✓
    is_active = Column(Boolean, default=True)        # EXISTS ✓
    # section_id = ???                               # MISSING ✗
```

### Current Bulk Create Schema

```python
# File: app/schemas/masters/class_subject_mapping_schema.py

class SubjectMappingItem(BaseModel):
    subject_id: UUID
    exclude_marks: bool = False      # EXISTS ✓
    order: Optional[int] = None      # EXISTS ✓
    is_active: bool = True           # EXISTS ✓

class ClassSubjectMapBulkCreate(BaseModel):
    class_id: UUID                   # EXISTS
    academic_year_id: UUID           # EXISTS
    subjects: List[SubjectMappingItem]  # EXISTS
    # section_id: ???                # MISSING ✗
```

### Current Bulk Endpoint

```
POST /api/v1/masters/class-subject-mappings/bulk
```

**Request Body:**

```json
{
  "class_id": "uuid",
  "academic_year_id": "uuid",
  "subjects": [
    {
      "subject_id": "uuid",
      "exclude_marks": false,
      "order": 1,
      "is_active": true
    }
  ]
}
```

### Current Bulk Service Behavior

```python
# File: app/service/masters/class_subject_mapping_service.py

async def bulk_create_or_update_class_subject_mappings(...):
    # 1. Delete ALL existing mappings for class + academic_year
    await db.execute(
        delete(ClassSubjectMap).where(
            ClassSubjectMap.class_id == class_id,
            ClassSubjectMap.academic_year_id == academic_year_id
        )
    )

    # 2. Create new mappings
    for mapping_data in mappings_data:
        new_mapping = ClassSubjectMap(...)
        db.add(new_mapping)
```

**Behavior**: REPLACE strategy (deletes all existing, creates new)

---

## Gap Analysis: Current vs Required

| Feature                  | Current       | Required          | Gap           |
| ------------------------ | ------------- | ----------------- | ------------- |
| Select Class             | ✓ Yes         | ✓ Yes             | None          |
| Select Section           | ✗ No          | ✓ Yes             | **MISSING**   |
| Select Academic Year     | ✓ Yes         | ✓ Yes             | None          |
| Multiple Subjects        | ✓ Yes         | ✓ Yes             | None          |
| Order field              | ✓ Yes         | ✓ Yes             | None          |
| Exclude Marks field      | ✓ Yes         | ✓ Yes             | None          |
| Active field             | ✓ Yes         | ✓ Yes             | None          |
| Bulk Create              | ✓ Yes         | ✓ Yes             | None          |
| Upsert (Update existing) | ✗ Replace All | ✓ Update existing | **DIFFERENT** |

---

## Required Changes

### Change 1: Add `section_id` to Model

**File**: `app/models/masters/class_subject_mapping_model.py`

**Current**: No `section_id` field

**Required**: Add `section_id` foreign key to `sections` table

```python
section_id = Column(UUID(as_uuid=True), ForeignKey('sections.id'), nullable=False)
section = relationship("Section", back_populates="class_subject_mappings")
```

### Change 2: Update Unique Constraint

**Current**: Unique on `(class_id, subject_id, academic_year_id)` (implicit)

**Required**: Unique on `(class_id, section_id, subject_id, academic_year_id)`

### Change 3: Update Bulk Schema

**File**: `app/schemas/masters/class_subject_mapping_schema.py`

**Current**:

```python
class ClassSubjectMapBulkCreate(BaseModel):
    class_id: UUID
    academic_year_id: UUID
    subjects: List[SubjectMappingItem]
```

**Required**:

```python
class ClassSubjectMapBulkCreate(BaseModel):
    class_id: UUID
    section_id: UUID              # ADD THIS
    academic_year_id: UUID
    subjects: List[SubjectMappingItem]
```

### Change 4: Update Bulk Service for Upsert

**File**: `app/service/masters/class_subject_mapping_service.py`

**Current Behavior**: DELETE all existing → CREATE new (replace strategy)

**Required Behavior**:

- For each subject in request:
  - If mapping exists → UPDATE it
  - If mapping doesn't exist → CREATE it
- Keep existing mappings not in the request (or delete them based on preference)

### Change 5: Update Response Schemas

Add `section_id` and `section_name` to response schemas.

### Change 6: Database Migration

Create Alembic migration to add `section_id` column to `class_subject_mappings` table.

---

## Open Questions for User

Before implementation, please clarify:

| #   | Question                                                                              | Options                                                                                                                                |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Upsert behavior**: What should happen to existing mappings NOT in the bulk request? | A) Keep them unchanged<br>B) Delete them (current behavior)<br>C) Mark them as inactive                                                |
| 2   | **Section requirement**: Should section be required or optional?                      | A) Required (always map to class+section)<br>B) Optional (can map to class only, or class+section)                                     |
| 3   | **Migration strategy**: The current table has data without section_id. How to handle? | A) Set section_id to NULL for existing data<br>B) Delete existing data and start fresh<br>C) Assign a default section to existing data |

---

## Files to Modify

| File                                                    | Change Required                                 |
| ------------------------------------------------------- | ----------------------------------------------- |
| `app/models/masters/class_subject_mapping_model.py`     | Add `section_id` field and relationship         |
| `app/schemas/masters/class_subject_mapping_schema.py`   | Add `section_id` to schemas                     |
| `app/service/masters/class_subject_mapping_service.py`  | Update bulk logic for section + upsert          |
| `app/api/v1/masters/class_subject_mapping_endpoints.py` | Update endpoint to include section in responses |
| `alembic/versions/`                                     | New migration for `section_id` column           |
| `app/models/masters/sections_model.py`                  | Add back_populates relationship (if needed)     |

---

## Current API Reference

| Method | Endpoint                                                     | Description                 |
| ------ | ------------------------------------------------------------ | --------------------------- |
| POST   | `/api/v1/masters/class-subject-mappings/`                    | Create single mapping       |
| POST   | `/api/v1/masters/class-subject-mappings/bulk`                | Bulk create/update mappings |
| GET    | `/api/v1/masters/class-subject-mappings/`                    | List all with pagination    |
| GET    | `/api/v1/masters/class-subject-mappings/by-class/{class_id}` | Get by class                |
| GET    | `/api/v1/masters/class-subject-mappings/dropdown`            | Dropdown list               |
| GET    | `/api/v1/masters/class-subject-mappings/{mapping_id}`        | Get by ID                   |
| PUT    | `/api/v1/masters/class-subject-mappings/{mapping_id}`        | Update single               |
| DELETE | `/api/v1/masters/class-subject-mappings/{mapping_id}`        | Delete single               |

---

## Summary

### What Already Works ✓

1. Bulk subject selection with multiple subjects
2. `order` field for display ordering
3. `exclude_marks` field for marks exclusion
4. `is_active` field for active status
5. Academic year scoping
6. All CRUD operations

### What Needs to Be Added ✗

1. **`section_id`** field in model, schema, service, and endpoints
2. **Upsert logic** instead of replace-all logic (per user requirement)
3. **Database migration** for new column

---

## Confidence Level

**High** - All code has been reviewed and the gaps are clearly identified.
