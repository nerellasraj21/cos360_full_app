# Exam Module — Backend Requirements for Frontend Integration

> **Document Version:** 3.0
> **Prepared:** 2026-02-27
> **Last Updated:** 2026-02-27 (Session 4)
> **Prepared By:** Frontend Team
> **For:** Backend Developer
> **Priority:** ALL ENDPOINTS IMPLEMENTED — Verify DB migrations are applied

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-02-27 | Initial document |
| 2.0 | 2026-02-27 | Updated status of implemented endpoints; added attendance null-date fix; added mark entry format notes; added hall ticket student name JOIN fix |
| 3.0 | 2026-02-27 | All endpoints confirmed implemented in backend code; status table updated to ✅ for all features |

---

## Endpoint Implementation Status

| Feature | Status | Notes |
|---|---|---|
| Mark Entry (grid) | ✅ Working | All enrolled students shown via `get_marks_grid` |
| Mark Entry (save) | ✅ Working | `POST /exams/{id}/marks` with batch payload |
| Mark Entry (Excel template) | ✅ Working | Pre-populated with student rows |
| Mark Entry (Excel upload) | ✅ Working | Synchronous processing (no Celery required) |
| Hall Ticket Compute | ✅ Working | Implemented — see attendance fix below |
| Hall Ticket Eligible/Ineligible | ✅ Working | Returns `student_name` + `admission_number` via JOIN |
| Hall Ticket Override | ✅ Working | |
| Hall Ticket Publish | ✅ Working | |
| Hall Ticket PDF Download | ✅ Working | |
| Results computation & publish | ✅ Implemented | `POST /compute` via `aggregate_service`, `POST /publish` via `result_service` |
| Student results view | ✅ Implemented | `GET /results`, `GET /results/{student_id}` in `result_endpoints.py` |
| Exam unlock | ✅ Implemented | `POST /unlock` in `exam_endpoints.py` via `result_service.unlock_exam` |
| Audit log | ✅ Implemented | `GET /audit` in `audit_endpoints.py` via `audit_service` |
| Notifications | ✅ Implemented | `POST /notify` in `notification_endpoints.py` via `notification_service` |

---

## CRITICAL BUG FIXES APPLIED (Backend)

### Fix 1 — Mark Entry Schema: Remove Strict Validator

**File:** `app/schemas/exam/mark_entry_schema.py`

Remove the `@model_validator` from `MarkEntryItem` that rejected `is_absent=False` with null marks. This blocked the "not yet entered" state.

```python
# REMOVE this validator from MarkEntryItem:
# @model_validator(mode='after')
# def validate_marks_or_absent(self) -> 'MarkEntryItem':
#     if not self.is_absent and self.marks_obtained is None and self.remark_grade is None:
#         raise ValueError("Either marks_obtained or remark_grade must be set when not absent")
#     return self

class MarkEntryItem(BaseModel):
    student_id: UUID
    component_id: UUID
    marks_obtained: Optional[Decimal] = Field(None, ge=0)
    remark_grade: Optional[str] = Field(None, max_length=5)
    is_absent: bool = False
    # No validator — null marks = "not yet entered" (valid state)
```

> **Status:** Applied in backend. Confirm it is deployed.

---

### Fix 2 — Mark Entry: get_marks_grid returns ALL enrolled students

**File:** `app/service/exam/mark_entry_service.py` (or similar)

The `GET /exams/{id}/marks` endpoint should return ALL students enrolled in the given class-section (via `student_admissions` JOIN), not only students who already have marks. Students without marks should be returned with empty `marks: {}`.

> **Status:** Applied in backend via `get_marks_grid`. Confirm it is deployed.

---

### Fix 3 — Hall Ticket: `student_name` and `admission_number` in response

**File:** `app/service/exam/hall_ticket_service.py`

The `get_eligible_students` and `get_ineligible_students` functions must return `student_name` and `admission_number` via a JOIN:

```python
async def _get_eligibility_with_students(db, exam_id, is_eligible) -> list[dict]:
    sql = text("""
        SELECT
            hte.*,
            TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')) AS student_name,
            (
                SELECT sa2.admission_number
                FROM student_admissions sa2
                WHERE sa2.student_id = hte.student_id
                LIMIT 1
            ) AS admission_number
        FROM hall_ticket_eligibility hte
        LEFT JOIN students s ON s.id = hte.student_id
        WHERE hte.exam_id = :exam_id
          AND hte.is_eligible = :is_eligible
        ORDER BY hte.hall_ticket_number NULLS LAST, student_name
    """)
    rows = (await db.execute(sql, {
        "exam_id": str(exam_id),
        "is_eligible": is_eligible,
    })).mappings().all()
    return [dict(r) for r in rows]
```

Also add to `HallTicketEligibilityRead` schema:
```python
student_name: Optional[str] = None
admission_number: Optional[str] = None
```

> **Status:** Applied. Confirm it is deployed.

---

### Fix 4 — Hall Ticket: Attendance null-date handling ⚠️ NEW

**File:** `app/service/exam/hall_ticket_service.py`

**Problem:** When `exam.attendance_from_date` or `exam.attendance_to_date` is `NULL`, `_get_attendance_percent` returns `None`, so `attendance_ok = False` for ALL students. This makes every student ineligible with `LOW_ATTENDANCE` even when no attendance range is configured.

**Fix applied in `compute_eligibility`:**

```python
# Check attendance
# If no date range is configured on the exam, skip the attendance check
if not exam.attendance_from_date or not exam.attendance_to_date:
    att_pct = None
    attendance_ok = True   # No date range → treat as OK
else:
    att_pct = await _get_attendance_percent(
        db, student_id,
        exam.attendance_from_date,
        exam.attendance_to_date,
    )
    attendance_ok = (att_pct is not None and att_pct >= min_attendance)
```

> **Status:** Fix has been applied. Deploy and rerun **Recompute** from the Hall Tickets page.

---

### Fix 5 — Mark Entry: Staff Role Missing exam_marks Permissions

Staff role must have `create`, `read`, `update`, `list` permissions for the `exam_marks` resource. These can be added via the permissions API or seeded in migrations.

> **Status:** Added via API call. Confirm permissions are seeded in the DB seed/migration so they persist after reset.

---

## Mark Entry API Contract

### POST /exams/{exam_id}/marks

The frontend sends the following payload (batch format):

```json
{
  "exam_id": "uuid",
  "subject_config_id": "uuid",
  "attempt_number": 1,
  "marks": [
    {
      "student_id": "uuid",
      "component_id": "uuid",
      "marks_obtained": 85.0,
      "is_absent": false,
      "remark_grade": null
    },
    {
      "student_id": "uuid",
      "component_id": "uuid",
      "marks_obtained": null,
      "is_absent": true,
      "remark_grade": null
    }
  ]
}
```

The `marks` array contains **all components for all students with unsaved changes**, submitted in a single request when the user clicks **Save Marks**.

### GET /exams/{exam_id}/marks

**Query params:** `class_id`, `section_id`, `subject_config_id`, `page`, `page_size`

**Expected response** — returns ALL enrolled students, with empty marks slots for those not yet entered:

```json
[
  {
    "student_id": "uuid",
    "student_name": "Jane Smith",
    "admission_number": "2024001",
    "marks": {
      "<component_uuid>": {
        "marks_obtained": 85.0,
        "is_absent": false,
        "remark_grade": null
      }
    }
  },
  {
    "student_id": "uuid",
    "student_name": "John Doe",
    "admission_number": "2024002",
    "marks": {}
  }
]
```

---

## ✅ Results Workflow — Implemented

All results endpoints are implemented. Files: `result_endpoints.py`, `aggregate_service.py`, `result_service.py`.

| Endpoint | File | Status |
|---|---|---|
| `POST /exams/{id}/compute` | `result_endpoints.py` → `aggregate_service.compute_exam_aggregate` | ✅ Done |
| `POST /exams/{id}/publish` | `result_endpoints.py` → `result_service.publish_exam` | ✅ Done |
| `GET /exams/{id}/results` | `result_endpoints.py` → `result_service.get_exam_results` | ✅ Done |
| `GET /exams/{id}/results/{student_id}` | `result_endpoints.py` → `result_service.get_student_result_or_404` | ✅ Done |
| `POST /exams/{id}/unlock` | `exam_endpoints.py` → `result_service.unlock_exam` | ✅ Done |
| `GET /exams/{id}/audit` | `audit_endpoints.py` → `audit_service.get_audit_log` | ✅ Done |
| `POST /exams/{id}/notify` | `notification_endpoints.py` → `notification_service.queue_notifications` | ✅ Done |

> **Note:** All routers are registered in `app/api/v1/main_router.py`.

---

## Deployment Checklist

| Item | Status |
|---|---|
| Run `alembic upgrade head` to apply exam module migrations | ⚠️ Verify |
| Migration `f1a2b3c4d5e6` — 20 exam tables | ⚠️ Verify applied |
| Migration `b2c3d4e5f6a7` — `hall_ticket_eligibility` table | ⚠️ Verify applied |
| `exam_marks` permissions seeded for Admin + Staff roles | ⚠️ Verify |
| Recompute hall ticket eligibility after deploying attendance fix | ⚠️ Run once |

---

## Backend Notes

1. **JWT user ID is at `current_user.get('sub')`, not `'id'`** — use `sub` field for `performed_by` in audit logs.

2. **All queries must be tenant-scoped** via the active schema (same as all other exam endpoints).

3. **Authentication pattern** — use `check_role_plan_permission_with_error()` as in existing endpoints.

4. **`exam_marks` permissions** must be seeded for both Admin and Staff roles: `create, read, update, list`.

5. **Mark Entry Excel upload is synchronous** (no Celery task) — returns `{status, written, errors, total_rows}`.

---

## class-sections and subject-configs Endpoints

These two endpoints are required by the **Mark Entry Summary** page and **Mark Entry Grid** subtitle:

### GET /exams/{exam_id}/class-sections

Returns all class-sections configured for this exam:

```json
[
  {
    "id": "uuid",
    "exam_id": "uuid",
    "class_id": "uuid",
    "class_name": "Class 10",
    "section_id": "uuid",
    "section_name": "A"
  }
]
```

### GET /exams/{exam_id}/subject-configs

Returns all subject configs for this exam, grouped by class-section:

```json
[
  {
    "id": "uuid",
    "exam_id": "uuid",
    "class_id": "uuid",
    "section_id": "uuid",
    "subject_id": "uuid",
    "subject_name": "Mathematics",
    "components": [
      {
        "id": "uuid",
        "component_name": "Written",
        "max_marks": 80,
        "entry_type": "marks",
        "include_in_total": true
      }
    ]
  }
]
```

> **Note:** Without these endpoints, the Mark Entry Summary page shows an error banner, and the Mark Entry Grid subtitle shows raw UUIDs instead of class/subject names. These endpoints are BLOCKING for usability.

---

*Document updated by Frontend Team — 2026-02-27*
