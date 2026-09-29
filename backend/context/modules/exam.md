# Module Context - Exam Management

Version: 1.1
Last Updated: 2026-02-28
Source: Codebase Analysis (app/models/exam/, app/service/exam/, app/api/v1/exam/)
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Exam module manages the complete exam lifecycle for a school tenant:

- Configuration: board patterns, remark grade sets, exam grade schemes (exam-level and subject-level)
- Exam creation: full exam setup with class-sections, subject configs, mark components, and exam dates
- Mark entry: permission-controlled teacher mark entry (online form + Excel upload)
- Results: aggregate computation, grading, ranking, and publication
- Hall tickets: attendance + fee eligibility check, override, publish, PDF/ZIP download
- Audit: immutable change log for all significant exam actions
- Notifications: queue notifications to students/parents

Evidence: `app/api/v1/exam/`, `app/service/exam/`, `app/models/exam/`

---

## Key Components

[EVIDENCE-BASED]

### Models

| Model                    | File                              | Purpose                                               |
| ------------------------ | --------------------------------- | ----------------------------------------------------- |
| Exam                     | `exam_model.py`                   | Core exam record (name, board, level, type, status)   |
| ExamClassSection         | `exam_class_section_model.py`     | Exam-class-section linkage                            |
| ExamDate                 | `exam_date_model.py`              | Scheduled date per subject (date, time, venue)        |
| ExamSubjectConfig        | `exam_subject_config_model.py`    | Subject config per exam (max marks, grade scheme)     |
| ExamSubjectComponent     | `exam_subject_config_model.py`    | Mark components (internal, external, remarks)         |
| StudentMark              | `student_marks_model.py`          | Individual mark entry per component and student       |
| StudentExamResult        | `student_result_model.py`         | Aggregate exam result (total marks, percentage, grade)|
| StudentSubjectResult     | `student_result_model.py`         | Subject-level result                                  |
| ExamGradeScheme          | `grading_model.py`                | Exam-level grade bands                                |
| ExamGradeBand            | `grading_model.py`                | Grade thresholds (from_percent → grade_label, gpa)    |
| SubjectGradeScheme       | `grading_model.py`                | Subject-level grade bands                             |
| SubjectGradeBand         | `grading_model.py`                | Subject-level grade thresholds                        |
| BoardExamPattern         | `board_pattern_model.py`          | Board + level configuration (CBSE, ICSE, State)       |
| BoardPatternExamType     | `board_pattern_model.py`          | Exam types per board (Midterm, Final, SA1, SA2)       |
| RemarkGradeSet           | `remark_grade_model.py`           | Remark grade option set                               |
| RemarkGradeOption        | `remark_grade_model.py`           | Individual remark option (grade_letter + label)       |
| ExamMarkEntryPermission  | `mark_permission_model.py`        | Permission record for a user to enter marks           |
| ExamSettings             | `exam_settings_model.py`          | Tenant-level exam config (min attendance, fee type)   |
| HallTicketEligibility    | `hall_ticket_model.py`            | Eligibility per student (attendance, fee, override)   |
| ExamAuditLog             | `audit_log_model.py`              | Immutable change log (JSONB metadata)                 |
| ExamStream               | `exam_stream_model.py`            | Academic stream (Science, Commerce, Arts)             |

### Services

| Service                  | File                             | Purpose                                                    |
| ------------------------ | -------------------------------- | ---------------------------------------------------------- |
| ExamService              | `exam_service.py`                | Exam CRUD, full exam creation, clone                       |
| ExamDateService          | `exam_date_service.py`           | Date scheduling, bulk creation                             |
| ExamSubjectConfigService | `exam_subject_config_service.py` | Subject config per exam                                    |
| MarkEntryService         | `mark_entry_service.py`          | Authorization, upsert marks, grid retrieval                |
| MarkPermissionService    | `mark_permission_service.py`     | Grant/revoke mark entry permissions                        |
| BoardPatternService      | `board_pattern_service.py`       | Board pattern CRUD (**commits internally**)                |
| GradingService           | `grading_service.py`             | Grade scheme CRUD (**commits internally**)                 |
| RemarkGradeService       | `remark_grade_service.py`        | Remark grade CRUD (**commits internally**)                 |
| AggregateService         | `aggregate_service.py`           | Compute overall exam result from marks                     |
| ResultService            | `result_service.py`              | Publish results, retrieve, unlock exam                     |
| HallTicketService        | `hall_ticket_service.py`         | Compute eligibility, override, publish                     |
| AuditService             | `audit_service.py`               | Log actions, retrieve paginated audit trail                |
| NotificationService      | `notification_service.py`        | Queue notifications to students/parents                    |
| ExcelService             | `excel_service.py`               | Generate mark entry template, parse Excel upload           |
| ExamSettingsService      | `exam_settings_service.py`       | Get/upsert tenant exam settings                            |

### API Endpoints

| Endpoint File                      | Route Prefix                          |
| ---------------------------------- | ------------------------------------- |
| `exam_endpoints.py`                | `/api/v1/exams`                       |
| `exam_date_endpoints.py`           | `/api/v1/exams/{id}/dates`            |
| `exam_subject_config_endpoints.py` | `/api/v1/exams/{id}/subjects`         |
| `mark_entry_endpoints.py`          | `/api/v1/exams/{id}/marks`            |
| `mark_permission_endpoints.py`     | `/api/v1/exams/{id}/mark-permissions` |
| `result_endpoints.py`              | `/api/v1/exams/{id}/results`          |
| `hall_ticket_endpoints.py`         | `/api/v1/exams/{id}/hall-tickets`     |
| `audit_endpoints.py`               | `/api/v1/exams/{id}/audit`            |
| `notification_endpoints.py`        | `/api/v1/exams/{id}/notify`           |
| `board_pattern_endpoints.py`       | `/api/v1/board-patterns`              |
| `grading_endpoints.py`             | `/api/v1/grade-schemes`               |
| `remark_grade_endpoints.py`        | `/api/v1/remark-grades`               |
| `exam_settings_endpoints.py`       | `/api/v1/exam-settings`               |

Evidence: `app/api/v1/exam/`, `app/api/v1/main_router.py`

---

## Data Model Summary

[EVIDENCE-BASED]

### Exam

- exam_name, status (draft | published | locked), nature (class_exam | board_exam)
- academic_year_id, board_id, exam_type_id
- publish_rank, created_by
- Unique: (exam_name, academic_year_id)

### ExamSubjectConfig

- exam_id, class_id, section_id, subject_id
- max_marks, passing_marks, grade_scheme_id
- Children: ExamSubjectComponent (inline components list)

### StudentMark

- exam_id, student_id, subject_config_id, component_id
- marks_obtained, entered_by
- Unique: (student_id, component_id)

### ExamGradeScheme / SubjectGradeScheme

- name, description, is_default
- Children: ExamGradeBand / SubjectGradeBand (from_percent, to_percent, grade_label, gpa, is_pass)

### BoardExamPattern

- board, level, custom_board_name, is_active
- Children: BoardPatternExamType (exam_type_name, nature, weightage_percent, count_per_year)

### RemarkGradeSet

- name
- Children: RemarkGradeOption (grade_letter, label, sort_order)

### HallTicketEligibility

- exam_id, student_id
- attendance_eligible, fee_eligible
- override_by, override_reason, is_published

### ExamAuditLog

- exam_id (no FK — survives exam deletion), action, performed_by
- metadata (JSONB), created_at (naive DateTime)

Evidence: `app/models/exam/`, `app/schemas/exam/`

---

## Invariants and Rules

[EVIDENCE-BASED]

- Exam name is unique per academic year per tenant schema.
- Full exam creation is atomic: one POST creates exam + class-sections + subject configs + dates.
- Subject auto-population uses ClassSubjectMapping.exclude_marks to filter eligible subjects.
- Mark entry requires an ExamMarkEntryPermission record for the user and exam.
- Marks are entered per component (internal, external, remarks) — not a single marks field.
- Grade computation is percentage-based: ExamGradeBand for exam-level, SubjectGradeBand for subject-level.
- Hall ticket attendance threshold is checked against ExamSettings.hall_ticket_min_attendance (default 75%).
- Hall ticket fee eligibility integrates with the Fee module via ExamSettings.exam_fee_type_id.
- ExamAuditLog rows are never updated or deleted.
- BoardPattern, Grading, and RemarkGrade services commit internally — endpoints must NOT re-commit.

Evidence: `app/service/exam/`, `app/schemas/exam/`, `app/models/exam/`

---

## Permissions

[EVIDENCE-BASED]

| Resource    | Actions                            |
| ----------- | ---------------------------------- |
| exams       | create, read, update, delete, list |
| exam_marks  | create, read, list                 |

- Plan-based: seeded in `public.plan_resource_access` for all 4 plans.
- Menu-based: 13 exam menus × 4 plans = 52 rows in `public.plan_menu_access`.
- Role-based: 13 menus in tenant `menus`; Admin role fully seeded in `role_menu_permissions`.

Evidence: `app/api/v1/exam/`, seed scripts (Feb 2026)

---

## Dependencies and Preconditions

[EVIDENCE-BASED]

- Academic years, classes, sections, and students must exist before exam creation.
- ClassSubjectMapping must be populated (subject auto-population on full exam create).
- Tenant context is required via the `cschema` header.
- Authenticated access uses JWT with plan and role permissions enforced.
- Hall ticket PDF generation requires ReportLab (`app/tasks/exam/hall_ticket_pdf.py`).
- Exam results feed the Reports module for report generation.

Open issues:

- OQ-01 (Blocked): Teacher-class assignment table does not exist yet (Staff module). `authorize_mark_entry` is bypassed — any user with mark entry permission can enter marks for any class/section.
- Hall ticket migration: `hall_ticket_eligibility` table was missing from the original migration. Added via `b2c3d4e5f6a7_add_hall_ticket_eligibility.py` — must be applied to all tenant schemas.
- Excel upload is synchronous: large mark files may block the request. Celery task exists in `app/celery_app.py` but not wired up yet.
- Notification delivery channel (email/SMS/push) is not confirmed — service queues but delivery is unimplemented.

Evidence: `app/api/v1/exam/`, `app/service/exam/`, `app/tasks/exam/`

---

## Bug Fixes Applied (2026-02-28)

[EVIDENCE-BASED]

No database migrations required — schema (tables/columns) unchanged; only service logic and Pydantic schemas were updated.

| Endpoint                          | Was                                   | Now                                   |
| --------------------------------- | ------------------------------------- | ------------------------------------- |
| `GET /grade-schemes/exam`         | Returned `gpa` etc. as strings        | Returns as JSON numbers (float)       |
| `GET /grade-schemes/subject`      | Returned `gpa` etc. as strings        | Returns as JSON numbers (float)       |
| `PUT /grade-schemes/exam/{id}`    | Ignored `bands[]` in body             | Replaces all bands                    |
| `PUT /grade-schemes/subject/{id}` | Ignored `bands[]` in body             | Replaces all bands                    |
| `PUT /remark-grades/{id}`         | Name-only update, ignored `options[]` | Replaces all options when provided    |
| `PUT /board-patterns/{id}`        | Ignored `exam_types[]` in body        | Replaces all exam types when provided |

- Frontend `GradeBandEditor.tsx` + Backend `grading_schema.py`: Pydantic v2 serializes PostgreSQL Numeric columns (`gpa`, `from_percent`, `to_percent`) as strings in JSON mode (e.g. `"4.50"`). Calling `.toFixed()` on a string threw TypeError and crashed the page via React's error boundary. Frontend fix: wrap with `Number()` before formatting. Backend fix: `GradeBandRead` and `SubjectGradeBandRead` now override `from_percent`, `to_percent`, `from_marks`, `to_marks`, and `gpa` as `float` so the API returns JSON numbers directly.
- Backend `grading_schema.py` + `grading_service.py`: `ExamGradeSchemeUpdate` and `SubjectGradeSchemeUpdate` had no `bands` field; update functions only saved scalar fields. Added `bands: List[GradeBandCreate]` to both schemas; update functions now delete all existing bands and re-insert from payload.
- Backend `remark_grade_schema.py` + `remark_grade_service.py`: `RemarkGradeSetUpdate` had no `options` field; update only saved `name`. Added `options: Optional[List[RemarkGradeOptionCreate]]`; update now deletes and re-inserts options when provided.
- Frontend `RemarkGradeSets.tsx`: Edit form had no drag reordering; `sort_order` was only set on `append()`. Added GripVertical drag handles; dragging reorders via `react-hook-form` `move()` and recalculates `sort_order` on drag end. Backend already handles `sort_order` correctly via delete-all + re-insert.
- Backend `board_pattern_schema.py` + `board_pattern_service.py`: `BoardPatternUpdate` had no `exam_types` field; update only saved scalar fields. Added `exam_types: Optional[List[BoardPatternExamTypeCreate]]`; update now deletes and re-inserts exam types when provided.

Evidence: `app/schemas/exam/`, `app/service/exam/`

---

## Related Documents

- `context/modules/fee.md` — Fee module (hall ticket fee eligibility integration)
- `tests/test_all_exam_endpoints.py` — 41 passed, 4 skipped (Phase 1 + Phase 2)
- `tests/test_exam_phase2.py` — 6 passed, 10 skipped gracefully
- `app/tasks/exam/hall_ticket_pdf.py` — ReportLab PDF generation for hall tickets
- `migrations/versions/b2c3d4e5f6a7_add_hall_ticket_eligibility.py` — missing table migration

---

End of Context Document
