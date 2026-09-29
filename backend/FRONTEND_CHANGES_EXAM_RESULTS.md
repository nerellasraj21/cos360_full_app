# Exam Results — New Student Endpoints

## Overview

Two student-facing exam result endpoints have been added to support `read_own` and `list_own` access for the Student role.

---

## New Endpoint

### `GET /exams/my-results`

List all published/finalized exam results for the currently logged-in student across all exams.

**Who can call it:** Student only

**Headers:**
```
Authorization: Bearer <student_jwt_token>
cschema: <tenant_schema_name>
```

**Query Params:** None

**Response:** `200 OK`
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "exam_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "student_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "student_name": "John Doe",
    "admission_number": "ADM001",
    "total_marks_obtained": 450.0,
    "total_max_marks": 500.0,
    "percentage": 90.0,
    "grade_label": "A+",
    "gpa": 4.0,
    "rank": 1,
    "is_passed": true,
    "computed_at": "2025-01-01T10:00:00",
    "subject_results": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "subject_config_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "subject_name": "Mathematics",
        "marks_obtained": 95.0,
        "max_marks": 100.0,
        "percentage": 95.0,
        "grade_label": "A+",
        "gpa": 4.0,
        "remark_grade": null,
        "is_absent": false,
        "is_passed": true
      }
    ]
  }
]
```

**Empty case:** Returns `[]` if no published results exist yet.

**Error responses:**
| Status | Reason |
|--------|--------|
| 400 | Token does not belong to a student |
| 401 | Missing or invalid JWT |
| 403 | Student role does not have `exam_results:list_own` permission (seed not run yet) |

---

## Updated Endpoint

### `GET /exams/{exam_id}/my-result`

Get the logged-in student's result for a specific exam.

**No change to URL, request shape, or response shape.**

**What changed (backend only):** Permission check updated from `exams:read` to `exam_results:read_own`. Frontend does not need to change anything for this endpoint.

**Headers:**
```
Authorization: Bearer <student_jwt_token>
cschema: <tenant_schema_name>
```

**Path Param:**
| Param | Type | Description |
|-------|------|-------------|
| exam_id | UUID | The exam whose result to fetch |

**Response:** `200 OK` — single object (same shape as one item in the list above)

**Error responses:**
| Status | Reason |
|--------|--------|
| 400 | Token does not belong to a student |
| 401 | Missing or invalid JWT |
| 403 | Results not yet published for this exam |
| 404 | No result found for this student in this exam |

---

## Existing Endpoints (unchanged, for reference)

| Method | URL | Who | Description |
|--------|-----|-----|-------------|
| `GET` | `/exams/{exam_id}/my-marks` | Student | Raw entered marks (visible before publish) |
| `GET` | `/exams/{exam_id}/child-result/{student_id}` | Parent | Child's result (after publish) |
| `GET` | `/exams/{exam_id}/child-marks/{student_id}` | Parent | Child's raw marks |
| `GET` | `/exams/{exam_id}/results` | Admin/Staff/Teacher | All student results for an exam |

---

## Important Note for Backend Deploy

After deploying, the following seed endpoint must be called **once** by an admin to activate the new permissions in the database:

```
POST /auth/seed/all-role-permissions
cschema: <tenant_schema_name>
```

Until this is done, students will receive `403 Forbidden` on both new endpoints.
