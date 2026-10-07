# Exam
Exam setup (grading, board patterns, templates), exam creation per class-section, component-wise mark entry, result computation and publishing, hall tickets, and the exam audit trail.
_Last verified against code: 2026-10-07_
Flows, decisions, and feature map: [graph view](../graph/views/exam.md) (source: docs/graph/graph.jsonl).

## What it does
- **One-time setup (Admin):** exam grade schemes (grand total) and subject grade schemes (per subject), both percentage bands. Also remark grade sets (letter + label options for non-numeric components), board patterns (board + level → list of exam types), the singleton exam settings row, and reusable subject-config templates.
- **Exam** = name + board + level + exam_type + nature + academic year. It is attached to one or more class-sections. Each class-section has its own **subject configs** (one per subject), and each config has **components** such as Written / Oral / Practical. A component is either `marks` (with `max_marks`) or `remarks` (with a `remark_grade_set_id`). Exam dates are stored per (class, section, subject).
- **Mark entry** is per student × component (`student_marks`). A null `marks_obtained` means "not entered yet". `is_absent` is a separate flag.
- **Results:** `POST /exams/{id}/compute` aggregates the marks into `student_subject_results` and `student_exam_results` (grade, GPA, pass/fail, per-class-section rank). Publishing makes them visible to students and parents.
- **Hall tickets:** per-student eligibility from attendance % and fee-paid %, admin overrides, publish flag, and PDF / ZIP download.
- **Who can do what:** every endpoint checks resource permissions. How the plan and role layers combine is in [permissions](../permissions.md).

  | Area | Endpoints | Resource:action |
  |---|---|---|
  | Exams, class-sections, subject-configs, dates, patterns, grading, settings, hall tickets, results (admin view), audit | see "Where the code lives" | `exams:create/read/update/delete` (templates list uses `exams:list`) |
  | Mark grid, template download | `GET /exams/{id}/marks[/template]` | `exam_marks:read` |
  | Save marks, Excel upload | `POST /exams/{id}/marks[/upload]` | `exam_marks:create` |
  | Student's own result / list | `GET /exams/{id}/my-result`, `/exams/my-results` | `exam_results:read_own` / `list_own` |
  | Raw marks (student / parent) | `GET /exams/{id}/my-marks`, `/child-marks/{sid}`, `/child-result/{sid}` | `exams:read` + student/parent identity from the token |
  | Module SMS | `send-results-notification`, `send-hall-ticket-notification`, `dates/send-schedule` | `exams:send_sms` |

  **Student and Parent extra checks** (on top of `exams:read`, by exact role name `Student` / `Parent`): `GET /results`, `/hall-tickets/eligible`, `/hall-tickets/ineligible`, `/hall-tickets/download-all` and `/audit` return 403. `GET /results/{student_id}` and `/hall-tickets/download?student_id=` call `ensure_student_access` (`backend/app/tools/ownership.py`): a Student passes only for their own record, a Parent only for a linked child. Use the same helper for any new single-student exam endpoint.

  Role defaults live in `ROLE_PERMISSIONS` in `backend/app/service/tenant/permission_catalog.py`. `POST /auth/seed/all-role-permissions` seeds them **limited to the resources the tenant's plan allows**. Teacher gets `exams` read/list and `exam_marks` create/read/list. Staff gets `exams` and `exam_marks` read/list. Student and Parent get `exams` read/list plus the `*_own` / `*_related` keys for `exam_marks` and `exam_hall_tickets` (Student also lists `exam_results`). Admin gets `exams` and `exam_marks` CRUD. No role, Admin included, gets `exams:send_sms`.
- **Web/mobile admin UI gating:** create, edit, delete, dates, permissions and audit screens are shown only to role names `admin`, `superadmin` and `principal`. This is a case-insensitive check in `web/src/lib/roleUtils.ts` and `mobile/src/lib/roles.ts`, not the permission system. Other screens check permissions, for example `exams:update` or `exam_marks:create`.

## Where the code lives
| Layer | backend | web | mobile |
|---|---|---|---|
| Models | `app/models/exam/` (23 classes, `__init__.py`) | — | — |
| Schemas / types | `app/schemas/exam/` (`enums.py` holds status/nature/level/board) | `src/types/exam.ts`, Zod in `src/schemas/examSchemas.ts` | `src/api/exam.ts` (types inline) + `src/types/exam.ts` |
| Services | `app/service/exam/` (`aggregate_service.py` = compute, `grading_service.py` = `lookup_grade`) | — | — |
| Endpoints | `app/api/v1/exam/` | `src/api/exam/index.ts` | `src/api/exam.ts` |
| Hooks / state | — | `src/api/hooks/exam/useExam.ts` (`examKeys`), `src/lib/examStore.ts` (wizard + mark-entry filter, sessionStorage) | react-query inline in screens |
| Screens | — | `src/pages/exam/`, `src/components/exam/`, routes `src/routes/_app/exam/` | `app/exam/` |
| PDF / tasks | `app/tasks/exam/hall_ticket_pdf.py` (ReportLab). The other `app/tasks/exam/*` Celery tasks are registered but never enqueued | — | — |

Route prefixes, all under `/api/v1`: `/exams` (CRUD, lifecycle, class-sections, subject-configs, `/marks`, `/mark-permissions`, `/dates`, `/compute`, `/publish`, `/results`, `/hall-tickets/*`, `/audit`, `/notify`), `/exam-settings`, `/board-patterns`, `/grade-schemes/exam`, `/grade-schemes/subject`, `/remark-grades`, `/exam-patterns` (templates, copy, apply-template, compare, auto-detect).

## Data model
```
exam_settings (singleton)            board_exam_patterns (board+level unique) ─< board_pattern_exam_types
exam_grade_schemes ─< exam_grade_bands        subject_grade_schemes ─< subject_grade_bands
remark_grade_sets ─< remark_grade_options     exam_config_templates ─< exam_config_template_items (components_json)

exams (exam_name+academic_year_id unique; exam_grade_scheme_id → exam_grade_schemes)
 ├─< exam_class_sections (class, section NULL = whole class)
 ├─< exam_subject_config (exam, class, section, subject unique; subject_grade_scheme_id)
 │     └─< exam_subject_components (entry_type marks|remarks, max_marks, include_in_total, remark_grade_set_id)
 ├─< exam_dates (exam, class, section, subject unique)
 ├─< exam_mark_entry_permissions (exam, user, is_active)
 ├─< hall_ticket_eligibility (exam, student, overrides, HT no.)
 │     (everything above cascades when the exam is deleted)
 ├── student_marks (exam, student, component, attempt_number unique)   ─┐ FK to exams,
 ├── student_subject_results (per subject_config)                       │ NO cascade
 └── student_exam_results (totals, grade, gpa, rank, is_passed)       ─┘
exam_audit_log (exam_id with NO FK, so it survives deletes; append-only)
exam_streams (table only, no endpoints; exam_class_sections.stream_id unused)
```
`exams.board / level / exam_type` are plain strings. Nothing links them by foreign key to board patterns.
Every exam table carries `tenant_id` under RLS. The unique constraints above are per tenant in the migration (`tenant_id` first), although the model `__table_args__` omit it.

## Rules & gotchas
1. **Use the `sub` claim for the user id.** Real JWTs carry `sub` = user UUID and no `id` (`multi_tenant_auth_service.py`). `uuid.UUID(current_user.get("id"))` is `uuid.UUID(None)` and a 500. Use `current_user.get("sub")`.
2. **Grading/remark/board-pattern services commit internally; the rest only flush.** Endpoints for `grading_service`, `remark_grade_service` and `board_pattern_service` must not commit or refresh again. The other exam services expect the endpoint to commit. Several exam endpoints still do `commit()` -> `refresh()` (update exam, clone, settings PUT, mark-permission, date create/update, templates). That goes against the repo rule in [architecture](../architecture.md), so don't copy them. Visible effects: `PUT /exams/{id}/subject-configs/{cid}` commits and then serializes the expired object, so any column change returns 500 (MissingGreenlet) although the change is saved. The PUT responses of board patterns, grade schemes and remark sets list the old child rows (exam types, bands, options) although the replacement is saved. Re-fetch after those PUTs.
3. **Decimals arrive as JSON strings.** Pydantic v2 serializes `Decimal` as a string: result totals, percentage, gpa, `StudentMarksView` marks, `hall_ticket_min_attendance`, settings. Always wrap with `Number()` before `.toFixed()` or comparisons. Grade band reads (`GradeBandRead`) are the exception: they are declared `float`. The mark grid values are floats because the service converts them.
4. **The body needs `exam_id` even when the path has it.** `MarkEntryCreate`, `ExamDateCreate`, `ExamDateBulkCreate.dates[]`, `ExamDateMultiSectionCreate` and `MarkPermissionCreate` all require `exam_id` in the body. Without it you get 422. Web adds it. Mobile's `examDatesApi.create` / `bulkCreate` omit it, so adding a date on mobile after creation fails.
5. **Sectionless class-sections use the nil UUID on mark endpoints.** `GET /marks`, `/template` and `/upload` declare `section_id` as a required UUID. Send `00000000-0000-0000-0000-000000000000` for "no section", which the backend maps to NULL.
6. **Backend field names are the contract.** `exam_name` (not `title`). Status filter param `exam_status` (not `status`). Results use `total_marks_obtained`, `percentage`, `grade_label`, `gpa`, `rank`, `is_passed`. Eligibility uses `attendance_ok`, `fee_paid` and a single `ineligibility_reason`. `GET /exams` returns a bare array. `class-sections` and `subject-configs` carry **no names**, so clients resolve class, section and subject names from masters dropdowns. The web list's Edit dialog prefills from `ExamListItem`, so that schema must carry every editable field (`term`, attendance dates, `hall_ticket_min_attendance`, `publish_rank`); a field missing there silently shows blank in the dialog.
7. **Router order matters for literal `/exams/<word>` paths.** `exam_result_router` (which holds `GET /exams/my-results`) is included before `exam_router` (`GET /exams/{exam_id}`) in `main_router.py`. A literal path on a router included after `exam_router` is parsed as a UUID and returns 422. Put literal routes on a router included earlier, or above `/{exam_id}` in the same router.
8. **Grade lookup is inclusive and has no gap handling.** It takes the first band (by `from_percent` desc) with `from ≤ pct ≤ to`. A percentage that falls in a gap (for example 89.5 between 80–89 and 90–100) drops to the **lowest** band. Define bands contiguously, for example `to_percent` 89.99.
9. **Mark entry and header edits don't check exam status.** Marks can be saved on locked or published exams and after `mark_entry_deadline`. `PUT /exams/{id}` also succeeds on any status, including published. Only `max_marks` is validated. `remark_grade` is not checked against the component's set. Authorization runs on the **path** `exam_id` but rows are written with `payload.exam_id`.
10. **Backend Excel upload matches headers exactly.** The upload matches `"<name> (Max: <Decimal>)"`, so a template downloaded before `max_marks` changed silently skips that column. Empty and non-numeric cells, **including `ABS`**, are skipped, so absence can't be set via upload. The template download and the upload do not call `authorize_mark_entry`, so mark-permission grants do not restrict them. Rows are keyed by column A (`student_id`) and marks are read from column D onward, so the first three columns must not be removed or reordered.
11. **Deleting an exam removes its marks and results.** `DELETE /exams/{id}` deletes `student_marks`, `student_subject_results` and `student_exam_results` first (no DB cascade), writes an `exam_deleted` audit row, then deletes the exam. Any status except `published` is allowed; published returns 409.
12. **Some deletes don't check references.** Deleting an exam grade scheme in use returns 409. A subject grade scheme or remark set still referenced by configs/components is **not** checked and fails with an FK error (500). Board pattern delete returns 409 if any exam has the same board+level.
13. **Template names stay unique after soft delete.** Uniqueness is checked only among active templates, but the DB constraint `uq_exam_config_template_name` covers all rows. Reusing a deleted template's name gives an IntegrityError (500).
14. **Hall-ticket numbers are unstable.** They are `HT-2025-` plus the student's position in an unordered enrolled-student query. The year is hard-coded and the numbers change on every recompute. Don't treat them as stable identifiers.
15. **Hall-ticket attendance counts only `present`.** `late` and `half_day` count against the student. If the exam has no `attendance_from_date` / `attendance_to_date`, the attendance check passes. With a fee threshold set, a student with no fee mapping counts as 0% paid and fails.
16. **Exam settings is one row per tenant with odd GET/PUT semantics.** The service reads it with RLS plus `LIMIT 1`; no unique constraint on `tenant_id` enforces one row. `GET /exam-settings` returns 404 until the first `PUT`. `PUT` overwrites **every** field, and omitted fields reset to defaults, so send the full object.
17. **Clone copies the header only.** It copies no class-sections, configs or dates, and it ignores the request body. Clients send `new_name`, but the clone is always "Copy of …". The response is `ExamRead`, not the create-full response.
18. **Web exam-create wizard state persists.** It lives in sessionStorage (`exam-store`). Configs for deselected class-sections must be filtered out before submit or the backend rejects them (422). `CreateExam.tsx` filters by the currently selected `class|section` keys and drops blank configs.
19. **Web exam hook signatures** (`useExam.ts`): compute/publish results and hall-ticket compute/publish/override bind `examId` at creation (`useComputeAggregate(examId).mutate()`), `useDeleteExamDate().mutate({examId, dateId})`, and `useHallTicketEligibility(examId)` returns `{eligible, ineligible}` query objects.

## Web / mobile parity
| Area | Web | Mobile |
|---|---|---|
| Create | Wizard with sessionStorage state. `exam_type` is auto-set to the exam name (hidden). Has term. Also sends an exam-level `subject_grade_scheme_id`, which the backend drops | Free-text `exam_type`. No `term` |
| Edit | List dialog: shown for any status, includes publish_rank. Detail dialog: draft/active only, has exam/subject grade-scheme selects the backend ignores, no publish_rank | Detail edit (no term) |
| Lifecycle | Activate, deactivate, clone, delete. **No unlock UI** (hook unused) | Activate, deactivate, clone, delete, unlock (reason required) |
| Mark entry | Combined all-subjects grid per class-section (`page_size` 1000), client-side Excel, absent is read-only, "Send Marks" QuickSend | Per-subject list (20/page), absent toggle, server template and upload |
| Remark components | No grade picker (numeric input only) | No grade picker |
| Results | Compute always `force=true`. Publish enabled only when status `locked`, which is unreachable | Compute without `force` (409 on recompute). Publish gated by `exams:update` |
| Student/parent | `results/$id` role switch (my-result / child-result), `my-marks/$examId` | `results/[examId]`, `my-marks/[examId]` |
| Hall tickets | Admin compute/override/publish/download. Download-all saves the ZIP under a `.pdf` file name. No student self-download screen, although the backend allows a student's own ticket | Admin compute/override/publish/download. No student self-download screen |
| Audit | Shows action, old/new value, `reason`, `performed_at`. No actor name: the API returns only the `performed_by` UUID | Same fields; the actor shows as a fallback label |
| Templates / copy / auto-detect / add class-section | API and hooks only, no screen | API only, no screen |

## Known gaps
- **Students can't see computed results.** The plans do not include the `exam_results` resource, so plan-limited seeding never grants Student `exam_results:read_own/list_own`. `GET /exams/{id}/my-result` and `/exams/my-results` return 403 for every student. Raw marks (`my-marks`) work.
- **SMS is unreachable by default.** `POST /publish` only sets status `published` and sends nothing. The `send-*` endpoints queue `NotificationQueue` rows and enqueue the communication module's `send_notification_batch`, but no seeded role holds `exams:send_sms`, so they return 403 until it is granted.
- **500s that should be 4xx.** `PUT /exams/{id}` with another exam's name (409 expected), `POST /unlock` with a reason over 300 characters (422 expected), plus the subject-config PUT and the unchecked deletes in gotchas 2, 12 and 13.
- **Compute bugs in multi-class exams.** Compute applies every subject config of the exam to every student. In any multi-class-section exam, and whenever a subject has no marks yet, students get spurious `ABS` subject rows and `is_passed=false`. `sub_max` counts only entered components, which inflates percentages when marks are partially entered.
- **Stored but ignored settings.** These fields are stored but no logic reads them:
  - `publish_rank` (ranks are always returned), `mark_entry_deadline`, `weightage_percent`, `term`, `attendance_mode`, `is_internal`
  - `credit_hours`, the internal/external split, component `min_pass_marks`
  - `exam.hall_ticket_min_attendance` (only the settings value is used), `exam_fee_type_id`, `grace_*`, `reconduct_max_failed_subjects`
  - attempts above 1
  - `hall_ticket_published`: download doesn't require it
- **Remaining student/parent exposure.** `GET /results/{student_id}` checks ownership but not publish status, so a student or parent sees their own or linked child's unpublished result there. `GET /hall-tickets/enrolled-students` lists every enrolled student to any `exams:read` holder. Hall-ticket download does not require `hall_ticket_published`. The Student/Parent blocks match exact role names, so custom roles holding `exams:read` are not blocked. The seeded `exam_hall_tickets:*_own/_related` permissions are not used by any endpoint.
- **Mark permissions lock out admins.** Once any active grant exists for an exam, only granted users pass the grid and save, Admin included.
- **No lock step.** No endpoint sets `locked`/`finalized`, so web can never publish (backend publish also accepts `active`).
- **Section-less classes can't do mark entry.** The web grid's queries are disabled when the section is empty (`enabled: !!sectionId`). Mobile omits `section_id`, which gets 422.
- **Notifications are stubs.** `POST /exams/{id}/notify` only counts. The `app/tasks/exam/*` Celery tasks (async upload, PDF, aggregate, notifications) are never called.
- **Not built:** report cards / marksheet PDFs, co-scholastic grades, SGPA/CGPA, formative/summative weighted aggregation, reconduct/supplementary, re-evaluation, promotion, merit certificates, streams. These are specified in the local-only `backend/docs/04-modules/exam.md`.
