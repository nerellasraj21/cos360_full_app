# Database Changes Review Document

## Task: Add section_id to class_subject_mappings

**Date**: 2025-12-27
**Completed**: 2025-12-28
**Target Schema**: `test_tenant_schema`
**Status**: COMPLETED

---

## Migration Summary

Added `section_id` column to `class_subject_mappings` table to enable section-specific subject assignments.

---

## Changes Applied

### Database Changes

| Step | SQL Command                                                 | Result             |
| ---- | ----------------------------------------------------------- | ------------------ |
| 1    | `DELETE FROM class_subject_mappings`                        | 6 rows deleted     |
| 2    | `ALTER TABLE ADD COLUMN section_id UUID NOT NULL`           | Column added       |
| 3    | `ADD CONSTRAINT fk_class_subject_mappings_section_id`       | FK to sections(id) |
| 4    | `CREATE INDEX ix_..._section_id`                            | Index created      |
| 5    | `ADD CONSTRAINT uq_..._class_section_subject_academic_year` | Unique constraint  |

### Final Table Structure

| Column           | Type      | Nullable | Notes                    |
| ---------------- | --------- | -------- | ------------------------ |
| id               | uuid      | NO       | Primary key              |
| class_id         | uuid      | NO       | FK to classes            |
| **section_id**   | **uuid**  | **NO**   | **NEW** - FK to sections |
| subject_id       | uuid      | NO       | FK to subjects           |
| academic_year_id | uuid      | NO       | FK to academic_years     |
| exclude_marks    | boolean   | NO       | Default: false           |
| order            | integer   | YES      | Display order            |
| is_active        | boolean   | YES      | Status flag              |
| created_at       | timestamp | NO       | Auto-generated           |
| updated_at       | timestamp | NO       | Auto-updated             |

### New Constraints

| Constraint                                                  | Type        | Columns                                              |
| ----------------------------------------------------------- | ----------- | ---------------------------------------------------- |
| `fk_class_subject_mappings_section_id_test_tenant_schema`   | FOREIGN KEY | section_id -> sections(id)                           |
| `uq_test_tenant_schema_class_section_subject_academic_year` | UNIQUE      | (class_id, section_id, subject_id, academic_year_id) |
| `ix_test_tenant_schema_class_subject_mappings_section_id`   | INDEX       | section_id                                           |

---

## Code Changes

### Files Modified

| File                                                    | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `app/models/masters/class_subject_mapping_model.py`     | Added section_id field and relationship |
| `app/models/masters/sections_model.py`                  | Added back_populates relationship       |
| `app/schemas/masters/class_subject_mapping_schema.py`   | Added section_id (optional in bulk)     |
| `app/service/masters/class_subject_mapping_service.py`  | Added multi-section bulk support        |
| `app/api/v1/masters/class_subject_mapping_endpoints.py` | Updated bulk endpoint docs              |

### API Behavior

**Bulk Create/Update Endpoint** (`POST /bulk`):

- `section_id` is **optional** in request body
- If `section_id` is provided: applies to that specific section
- If `section_id` is `null` or omitted: applies to **ALL active sections** in the class
- Response includes `sections_processed` count

---

## Rollback Script (If Needed)

```sql
-- Remove constraints and column
ALTER TABLE test_tenant_schema.class_subject_mappings
DROP CONSTRAINT uq_test_tenant_schema_class_section_subject_academic_year;

DROP INDEX test_tenant_schema.ix_test_tenant_schema_class_subject_mappings_section_id;

ALTER TABLE test_tenant_schema.class_subject_mappings
DROP CONSTRAINT fk_class_subject_mappings_section_id_test_tenant_schema;

ALTER TABLE test_tenant_schema.class_subject_mappings
DROP COLUMN section_id;
```

---

## Testing Results

| Test                                 | Result                         |
| ------------------------------------ | ------------------------------ |
| Bulk create with specific section_id | PASS                           |
| Bulk create with section_id = null   | PASS - Applied to 24 sections  |
| Bulk create with section_id omitted  | PASS - Applied to all sections |
| GET all mappings                     | PASS - Returns section_name    |
| GET by class with section filter     | PASS                           |
| PUT update mapping                   | PASS                           |
| Upsert deactivation                  | PASS                           |

---

## Related Documents

- Frontend Handover: `docs/04-modules/masters/class-subject-mappings/FRONTEND_HANDOVER_CLASS_SUBJECT_MAPPING.md`
- Module Context: `context/modules/masters.md`
