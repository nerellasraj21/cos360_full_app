# Module Context - Exam Management

Version: 1.0
Last Updated: 2026-02-27
Source: Codebase Analysis (app/models/exam/, app/service/exam/, app/api/v1/exam/)
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Exam module manages the complete exam lifecycle for a school tenant:

- **Configuration**: Board patterns, remark grade sets, exam grade schemes (exam-level and subject-level)
- **Exam creation**: Full exam setup with class-sections, subject configs, mark components, and exam dates
- **Mark entry**: Permission-controlled teacher mark entry (online form + Excel upload)
- **Results**: Aggregate computation, grading, ranking, and publication
- **Hall tickets**: Attendance + fee eligibility check, override, publish, PDF/ZIP download
- **Audit**: Immutable change log for all significant exam actions
- **Notifications**: Queue notifications to students/parents

Evidence: `app/api/v1/exam/`, `app/service/exam/`, `app/models/exam/`

---

## Key Components

[EVIDENCE-BASED]

### Models

| Model | File | Purpose |
| --- | --- | --- |
| Exam | `exam/exam_model.py` | Core exam record (name, board, level, type, status) |
| ExamClassSection | `exam/exam_class_section_model.py` | Exam-class-section linkage |
| ExamDate | `exam/exam_date_model.py` | Scheduled date per subject (date, time, venue) |
| ExamSubjectConfig | `exam/exam_subject_config_model.py` | Subject config per exam (max marks, grade scheme) |
| ExamSubjectComponent | `exam/exam_subject_config_model.py` | Mark components (internal, external, remarks) |
| StudentMark | `exam/student_marks_model.py` | Individual mark entry per component and student |
| StudentExamResult | `exam/student_result_model.py` | Aggregate exam result (total marks, percentage, grade) |
| StudentSubjectResult | `exam/student_result_model.py` | Subject-level result |
| ExamGradeScheme | `exam/grading_model.py` | Exam-level grade bands |
| ExamGradeBand | `exam/grading_model.py` | Grade thresholds (from_percent → grade_label, gpa) |
| SubjectGradeScheme | `exam/grading_model.py` | Subject-level grade bands |
| SubjectGradeBand | `exam/grading_model.py` | Subject-level grade thresholds |
| BoardExamPattern | `exam/board_pattern_model.py` | Board + level configuration (CBSE, ICSE, State) |
| BoardPatternExamType | `exam/board_pattern_model.py` | Exam types per board (Midterm, Final, SA1, SA2) |
| RemarkGradeSet | `exam/remark_grade_model.py` | Remark grade option set |
| RemarkGradeOption | `exam/remark_grade_model.py` | Individual remark option (grade_letter + label) |
| ExamMarkEntryPermission | `exam/mark_permission_model.py` | Permission record for a user to enter marks |
| ExamSettings | `exam/exam_settings_model.py` | Tenant-level exam config (min attendance, fee type) |
| HallTicketEligibility | `exam/hall_ticket_model.py` | Eligibility per student (attendance, fee, override) |
| ExamAuditLog | `exam/audit_log_model.py` | Immutable change log (JSONB metadata) |
| ExamStream | `exam/exam_stream_model.py` | Academic stream (Science, Commerce, Arts) |

### Services

| Service | File | Purpose |
| --- | --- | --- |
| ExamService | `exam/exam_service.py` | Exam CRUD, full exam creation, clone |
| ExamDateService | `exam/exam_date_service.py` | Date scheduling, bulk creation |
| ExamSubjectConfigService | `exam/exam_subject_config_service.py` | Subject config per exam |
| MarkEntryService | `exam/mark_entry_service.py` | Authorization, upsert marks, grid retrieval |
| MarkPermissionService | `exam/mark_permission_service.py` | Grant/revoke mark entry permissions |
| BoardPatternService | `exam/board_pattern_service.py` | Board pattern CRUD (**commits internally**) |
| GradingService | `exam/grading_service.py` | Grade scheme CRUD (**commits internally**) |
| RemarkGradeService | `exam/remark_grade_service.py` | Remark grade CRUD (**commits internally**) |
| AggregateService | `exam/aggregate_service.py` | Compute overall exam result from marks |
| ResultService | `exam/result_service.py` | Publish results, retrieve, unlock exam |
| HallTicketService | `exam/hall_ticket_service.py` | Compute eligibility, override, publish |
| AuditService | `exam/audit_service.py` | Log actions, retrieve paginated audit trail |
| NotificationService | `exam/notification_service.py` | Queue notifications to students/parents |
| ExcelService | `exam/excel_service.py` | Generate mark entry template, parse Excel upload |
| ExamSettingsService | `exam/exam_settings_service.py` | Get/upsert tenant exam settings |

### API Endpoints

| Endpoint File | Route Prefix | Description |
| --- | --- | --- |
| `exam_endpoints.py` | `/exams` | CRUD exams, clone |
| `exam_date_endpoints.py` | `/exams/{id}/dates` | CRUD dates, bulk create |
| `exam_subject_config_endpoints.py` | `/exams/{id}/subjects` | Manage subject configs |
| `mark_entry_endpoints.py` | `/exams/{id}/marks` | Template, grid, save, Excel upload |
| `mark_permission_endpoints.py` | `/exams/{id}/mark-permissions` | Grant/revoke/list permissions |
| `board_pattern_endpoints.py` | `/board-patterns` | CRUD board patterns |
| `grading_endpoints.py` | `/grade-schemes` | CRUD exam & subject grade schemes |
| `remark_grade_endpoints.py` | `/remark-grades` | CRUD remark grade sets |
| `exam_settings_endpoints.py` | `/exam-settings` | GET/PUT tenant settings |
| `result_endpoints.py` | `/exams/{id}/...` | Compute, publish, list results |
| `hall_ticket_endpoints.py` | `/exams/{id}/hall-tickets` | Eligibility, override, publish, PDF/ZIP |
| `audit_endpoints.py` | `/exams/{id}/audit` | Paginated audit log |
| `notification_endpoints.py` | `/exams/{id}/notify` | Queue notifications |

---

## Data Model Summary

[EVIDENCE-BASED]

### Exam
- `id` (UUID, PK), `exam_name` (String, not null), `academic_year_id` (UUID, FK)
- `board_id` (UUID, FK → BoardExamPattern), `exam_type_id` (UUID, FK → BoardPatternExamType)
- `nature` (String: `class_exam` | `board_exam`), `status` (String: `draft` | `published` | `locked`)
- `publish_rank` (Boolean), `created_by` (UUID, FK → users)
- **Unique**: `(exam_name, academic_year_id)`

### ExamSubjectConfig
- `id` (UUID, PK), `exam_id` (UUID, FK), `class_id` (UUID, FK), `section_id` (UUID, FK)
- `subject_id` (UUID, FK), `max_marks` (Integer), `passing_marks` (Integer)
- `grade_scheme_id` (UUID, FK → SubjectGradeScheme, nullable)
- **Children**: `ExamSubjectComponent` (inline components list)

### StudentMark
- `id` (UUID, PK), `exam_id` (UUID, FK), `student_id` (UUID, FK)
- `subject_config_id` (UUID, FK → ExamSubjectConfig), `component_id` (UUID, FK)
- `marks_obtained` (Numeric), `entered_by` (UUID, FK → users)
- **Unique**: `(student_id, component_id)`

### HallTicketEligibility
- `id` (UUID, PK), `exam_id` (UUID, FK), `student_id` (UUID, FK)
- `attendance_eligible` (Boolean), `fee_eligible` (Boolean)
- `override_by` (UUID, FK → users, nullable), `override_reason` (String)
- `is_published` (Boolean, default False)

### ExamAuditLog
- `id` (UUID, PK), `exam_id` (UUID — no FK, survives exam deletion)
- `action` (String), `performed_by` (UUID, FK → users)
- `metadata` (JSONB), `created_at` (DateTime, naive)

---

## Invariants & Rules

[EVIDENCE-BASED]

1. **Exam uniqueness**: `(exam_name, academic_year_id)` must be unique per tenant schema
2. **Full exam creation**: One POST atomically creates exam + class-sections + subject configs + dates
3. **Subject auto-population**: Uses `ClassSubjectMapping.exclude_marks` to filter eligible subjects
4. **Mark entry authorization**: User must have an `ExamMarkEntryPermission` record for the exam
5. **Components required**: Marks are entered per component (internal, external, remarks) — not a single marks field
6. **Grade computation**: Exam-level grade from `ExamGradeBand` (from_percent → grade_label); subject-level from `SubjectGradeBand`
7. **Hall ticket attendance**: Checked against `ExamSettings.hall_ticket_min_attendance` (default 75%)
8. **Hall ticket fee**: Integration with Fee module via `ExamSettings.exam_fee_type_id`
9. **Audit immutability**: `ExamAuditLog` rows are never updated or deleted
10. **Service commit pattern**: BoardPattern, Grading, RemarkGrade services commit internally — endpoints must NOT re-commit

---

## Public Interfaces

[EVIDENCE-BASED]

### Exam Management
```
POST   /api/v1/exams                                      Create full exam
GET    /api/v1/exams                                      List exams
GET    /api/v1/exams/{exam_id}                            Get exam
PUT    /api/v1/exams/{exam_id}                            Update exam
DELETE /api/v1/exams/{exam_id}                            Delete exam
POST   /api/v1/exams/{exam_id}/clone                      Clone exam
```

### Mark Entry
```
GET    /api/v1/exams/{exam_id}/marks/template             Download Excel template
GET    /api/v1/exams/{exam_id}/marks                      Get marks grid (paginated)
POST   /api/v1/exams/{exam_id}/marks                      Save/upsert marks
POST   /api/v1/exams/{exam_id}/marks/upload               Upload marks via Excel
```

### Results (Phase 2)
```
POST   /api/v1/exams/{exam_id}/compute                    Compute aggregate results (?force=true)
POST   /api/v1/exams/{exam_id}/publish                    Publish results
GET    /api/v1/exams/{exam_id}/results                    List results
GET    /api/v1/exams/{exam_id}/results/{student_id}       Single student result
POST   /api/v1/exams/{exam_id}/unlock                     Unlock exam (body: {reason})
```

### Hall Tickets (Phase 2)
```
POST   /api/v1/exams/{exam_id}/hall-tickets/compute       Compute eligibility
GET    /api/v1/exams/{exam_id}/hall-tickets/eligible      List eligible students
GET    /api/v1/exams/{exam_id}/hall-tickets/ineligible    List ineligible students
PUT    /api/v1/exams/{exam_id}/hall-tickets/{student_id}/override  Override eligibility
POST   /api/v1/exams/{exam_id}/hall-tickets/publish       Publish hall tickets
GET    /api/v1/exams/{exam_id}/hall-tickets/download      PDF download (single, ?student_id=UUID)
GET    /api/v1/exams/{exam_id}/hall-tickets/download-all  ZIP download (all)
```

### Configuration
```
POST/GET/PUT/DELETE  /api/v1/board-patterns/{id}          Board pattern CRUD
POST/GET/PUT/DELETE  /api/v1/grade-schemes/exam/{id}      Exam grade scheme CRUD
POST/GET/PUT/DELETE  /api/v1/grade-schemes/subject/{id}   Subject grade scheme CRUD
POST/GET/PUT/DELETE  /api/v1/remark-grades/{id}           Remark grade set CRUD
GET/PUT              /api/v1/exam-settings                 Tenant exam settings
```

### Audit & Notifications
```
GET    /api/v1/exams/{exam_id}/audit                      Paginated audit log
POST   /api/v1/exams/{exam_id}/notify                     Queue notifications
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

| Module | Used For |
| --- | --- |
| AcademicYear (masters) | Exam grouped by academic year |
| Class / Section (masters) | Exam scope, attendance tracking |
| Subject (masters) | Components in subject configs |
| ClassSubjectMapping (masters) | Auto-populate subjects (exclude_marks filter) |
| Student (student) | Enrollment for mark entry and results |
| User | `created_by` (exam), `entered_by` (marks) |
| Fee Module | Check fee paid status for hall ticket eligibility |

### Downstream Consumers

| Consumer | Uses |
| --- | --- |
| Reports module | Exam results data for report generation |
| Hall ticket PDF | ReportLab generator at `app/tasks/exam/hall_ticket_pdf.py` |

---

## Permissions

[EVIDENCE-BASED]

| Resource | Actions Seeded |
| --- | --- |
| `exams` | create, read, update, delete, list |
| `exam_marks` | create, read, list |

- **Plan-based**: Seeded in `public.plan_resource_access` for all 4 plans
- **Menu-based**: 13 exam menus × 4 plans = 52 rows in `public.plan_menu_access`
- **Role-based**: 13 menus in tenant `menus`; Admin role fully seeded in `role_menu_permissions`

---

## Known Risks

[INFERENCE]

1. **OQ-01 (Blocked)**: Teacher-class assignment table does not exist yet (Staff module). `authorize_mark_entry` is bypassed — any user with mark entry permission can enter marks for any class/section.
2. **Hall ticket migration gap**: `hall_ticket_eligibility` table was missing from original migration; added via `b2c3d4e5f6a7_add_hall_ticket_eligibility.py` — must be applied to all tenant schemas.
3. **DateTime inconsistency**: Some models use `TIMESTAMP WITHOUT TIME ZONE` (requires `datetime.utcnow()`); others use `DateTime(timezone=True)`. Do NOT use `datetime.now(timezone.utc)` for naive columns.
4. **Excel upload is synchronous**: Large mark files may block the request. Celery task exists in `app/celery_app.py` but not wired up yet.

---

## Test Coverage

[EVIDENCE-BASED]

| Test File | Coverage |
| --- | --- |
| `tests/test_all_exam_endpoints.py` | 41 passed, 4 skipped — Phase 1+2 comprehensive integration tests |
| `tests/test_exam_phase2.py` | 6 passed, 10 skipped gracefully |

`pytest.ini` requires `asyncio_mode = strict` and `asyncio_default_test_loop_scope = session` for asyncpg pool reuse.

---

## Uncertainties

[UNCERTAIN]

- Subject-level grade scheme assignment per class-section combination — unclear if all sections can have different schemes
- Notification delivery mechanism (email/SMS/push) — service queues but delivery channel not confirmed in code

---

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based (extracted from model/service/endpoint source code) or explicitly marked.
