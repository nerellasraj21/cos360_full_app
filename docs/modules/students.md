# Students
Admission (student + parent/guardian accounts), student records and status, parent links, student attendance, student documents and photos.
_Last verified against code: 2026-09-29_
Flows, decisions, and feature map: [graph view](../graph/views/students.md) (source: docs/graph/graph.jsonl).

Related: `docs/architecture.md` (tenancy, file storage, Celery), `docs/permissions.md` (the two permission layers and scopes), `docs/modules/auth.md` (login, first-login, `/profile/*/me`), `docs/modules/communication.md` (SMS triggers), `docs/modules/certificates.md`, `docs/modules/staff.md`.

## What it does
- **One admission call creates everything, in one transaction.** It creates the student `users` row, the `students` row, father and mother `parents` + `users` rows (a guardian too, if given), the `student_parent_links`, and the `student_admissions` row. After that it auto-applies mandatory (`all_by_default`) class fees; if that step fails, the error is logged and the admission still succeeds.
- **Logins:**
  - The student's username is the **admission number**.
  - A parent's username is their email. If the parent has no email, it is `{admission_number}.father` or `{admission_number}.mother`.
  - Every new account gets a hardcoded temporary password and `is_first_login = TRUE` (see `auth.md`).
- **Admission number:** typed by hand (free text, but unique against both `student_admissions.admission_number` and `users.username`) or auto-generated.
  - `pre_primary`: `{YEAR}{SEQ:04d}`, e.g. `20260001`. The sequence resets every calendar year of `admission_date`.
  - `regular`: `{SEQ:03d}`, e.g. `001`. One global sequence that never resets.
  - `GET /students/admission/next-admission-number?type=` is a non-binding preview; the number is fixed only at create.
- **Admission type** is `pre_primary | regular` (`AdmissionTypeEnum`). If it is omitted, the backend derives it from `student.is_primary == "primary"`.
- **Required fields:**
  - Admission level: `academic_year_id`, `admitted_class_id`, `address_line1`.
  - Student: `first_name`.
  - Father: `name` and `phone`.
- **Optional fields** and their fallbacks:
  - Everything else is optional. `last_name` is stored as `""` when missing.
  - A blank `date_of_birth` becomes the sentinel `1900-01-01` (`PLACEHOLDER_DATE_OF_BIRTH`).
  - A blank parent `name` becomes the relation label ("Mother").
  - `admission_date` defaults to today and cannot be in the future.
- **Format validation:**
  - Aadhar/APAAR must be exactly 12 digits; `primary_phone` exactly 10.
  - `salary_range` is one of `below_1l | 1l_3l | 3l_5l | 5l_10l | above_10l` (see `GET /parents/salary-ranges/dropdown`).
- **Parent reuse (siblings):** if a father, mother or guardian email already belongs to a user with role `Parent`, that parent is reused. Their fields are overwritten with the new payload and the new child is linked.
  - Father and mother may not share an email.
  - An email already used by a non-Parent user is rejected.
- **Active status** lives on `users.is_active`; `students` has no column of its own. `PATCH /{student_id}/toggle-active` flips it.
  - An inactive student cannot log in.
  - Inactive students are excluded from `/students/dropdown*` (`active_only=true` by default).
- **Role-aware reads** (`check_user_resource_access`):
  - Student: `own` scope.
  - Parent: `related` scope, i.e. children linked in `student_parent_links`.
  - Admin, Staff and Teacher: `all`.
  - Teachers are **not** limited to their classes; there is no teacher–class assignment table. See `permissions.md`.
- **Attendance:** one row per `(student_id, date)` (`uq_student_date`).
  - Statuses: `present | absent | late | half_day | leave` (`app/schemas/common/attendance_status_enum.py`).
  - No future dates, and no dates before the student's `admission_date`.
- **Documents:**
  - General uploads (`student_documents`) have a free-text `document_type`, unique per student. Max 5 MB; pdf/jpg/jpeg/png/docx only, and PDFs must start with `%PDF`.
  - `GET /students/documents/all?student_id=` merges uploads, certificates (`student_certificates`) and fee receipts into one list, newest first.
- **Photos:** `POST|DELETE /students/admission/id/{student_id}/photo`, multipart field `photo`, jpg/png/webp, max 2 MB. The file is stored at `media/student/photos/{student_id}.{ext}` and the response field is `photo_url` (`/media/...`).
- **Bulk admission:**
  - Upload an Excel sheet named `Student Admission` to `POST /students/admission/bulk-upload`.
  - Required headers: `First name`, `joining class`, `Father name`, `Father phone`, `Address Line 1`.
  - Each row goes through `add_admission` separately: good rows are created even when others fail. The response is `{created[], errors[], total_rows}`.
  - The academic year is the tenant's **active** year.
  - Template: `GET .../bulk-upload/template` gives a blank sheet with dropdowns (hidden `Lists` sheet, cascading sub-caste). `?include_data=true` pre-fills every existing admission.

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Endpoints | `app/api/v1/student/{admission,attendance,student_document,student_parent}_endpoints.py`, `app/api/v1/masters/parent_endpoints.py` | — | — |
| Prefixes | `/students/admission`, `/student/attendance` (singular!), `/students/documents`, `/student-parent-links`, `/parents` | | |
| Services | `app/service/student/{admission,admission_bulk,student,student_attendance,student_document}_service.py`, `app/service/masters/{parent,student_parent_link}_service.py` | | |
| Models | `app/models/student/{student,student_document}_model.py`, `app/models/masters/{admission,parent,student_parent_association,attendance}_model.py` | | |
| Schemas | `app/schemas/student/{admission,student,attendance,student_document}_schema.py`, `app/schemas/masters/{parent,student_parent_link}_schema.py` | `src/types/{admission,attendance,documents,parent}.ts` | `src/types/{admission,attendance,documents}.ts` |
| API / hooks | | `src/api/students/*`, `src/api/hooks/students/*`, `src/api/masters/{classesandsections,parents}.ts`, `src/api/auth.ts` (`useParentChildren`) | `src/api/students.ts`, `src/api/hooks/students/*` |
| UI | Excel templates: `app/static/templates/student_admission_bulk_upload_template.xlsx` | `src/pages/students/*`, `src/components/students/*` (`MultiStepAdmissionForm`, `admission-steps/`, `AdmissionTable`, `BulkAdmissionUploadDialog`), `src/routes/_app/students/*`, `src/pages/masters/parents.tsx` | `app/students/*`, `app/parents/*` |
| Scripts | `scripts/find_stale_pre_admission_attendance.py <schema>\|--all [--apply]` | | |

## Rules & gotchas
1. **Two different IDs.** List rows carry `id` = admission id and `student.id` = student id. `GET /id/{…}`, `PATCH /{…}`, `toggle-active` and photo routes take the **student id**. `DELETE /{…}` and `GET /by-admission/{…}` take the **admission id**. Mixing them up gives a 404.
2. **Parents are nested under `student`.** The response has `student.father`, `student.mother` and `student.guardian`, not top-level fields. Ownership: `StudentOut.extract_father_mother_guardian` copies the `_father`/`_mother`/`_guardian` values the service sets. The **list** endpoint fills father and mother but **not guardian**. `student.is_active` is filled only by list and toggle; the detail GET returns `null`.
3. **Guardian needs an email.** `add_admission` silently drops a guardian whose email is blank, so both clients require the guardian email once a guardian name is entered. PATCH can only update an existing guardian link; it cannot add one.
4. **Login identity never follows edits.**
   - Changing `admission_number` or a parent's email via PATCH updates the `student_admissions` / `parents` row only; `users.username` and `users.email` keep their original values.
   - Parents are shared across siblings, so editing a parent through one child's admission changes it for all siblings.
   - Creating an admission with an existing parent email overwrites that parent's name, phone and other fields.
5. **`DELETE /students/admission/{admission_id}` is unsafe.**
   - It deletes the student, the student's user, **every linked parent and their users**. That includes parents shared with siblings.
   - It then returns a dict while declaring `response_model=StudentAdmissionResponse`, so the client gets a 500 **after** the commit.
   - No client calls it. Use toggle-active instead.
6. **List pagination:** `GET /students/admission/` defaults to `limit=10` (max 100) and **ignores `active_only`**.
   - Both attendance rosters (web `getStudentsByClassSection`, mobile `studentAdmissionsApi.getStudentsByClassSection`) send no `limit`, so they show at most 10 students per class.
   - They also include inactive students.
   - Pass `limit=100` and filter on `student.is_active`, or use `/students/admission/students/dropdown`, which honours `active_only`.
7. **`is_primary` means two different things.**
   - UI (web `StudentStepForm`, mobile): `not_primary` = "Day Scholar", `primary` = "Hostel".
   - Bulk upload and backend: "Student type" `Pre Primary` → `primary`, and `add_admission` turns `is_primary == "primary"` into `admission_type = pre_primary` when no `admission_type` is sent. The bulk path never sends one.
   - Don't read one meaning into the other; `admission_type` is authoritative.
8. **`state` holds a UUID.** Both clients send `state = state_id` (the `StateDropdown` UUID), so the text column is not a name. Read `state_id`, `district_id` and `mandal_id` (public-schema location masters) and resolve names from them.
9. **Status casing:** single create/update lowercases `status`. `PATCH /by-date/{date}` takes raw dicts, so the status must already be lowercase. That call also only sets `remarks` when the value is non-empty, so it cannot clear remarks.
10. **Admission-date guard:** a single create/update before `admission_date` returns 422, while the bulk by-date call silently **skips** those students. Rows saved before this guard existed can be found and removed with `find_stale_pre_admission_attendance.py`.
11. **Route order:** static routes (`/search`, `/my-attendance`) must come before `/{attendance_id}`. Otherwise FastAPI parses `my-attendance` as a UUID and returns 422. Keep new static routes above dynamic ones.
12. **Unscoped attendance reads:** `GET /student/attendance/` and `/by-date/{date}` return **every** student's rows to any role holding `student_attendance:list`. Also, `/student/{id}/filter` checks ownership only for the `own` scope; parents are not checked. Always query with a date and student filter; never fetch everything.
13. **`X-Student-ID` is ignored.** Web and mobile send it for parents, but the backend never reads it. Parent scoping works only through explicit `student_id` params plus the `related` scope check.
14. **Document files are not downloadable.** `student_documents` files go to `./student_documents/` (relative to CWD). That directory is **not tenant-scoped and not served**; only `media/` is mounted.
    - Web builds `${mediaBase}${file_path}`, which yields a broken URL.
    - Web `src/api/documents.ts` calls endpoints that don't exist: `/students/documents/{id}/download`, `/{id}/verify`, `/students/document-types/`. So the web document-type dropdown is empty, while mobile hardcodes its list.
    - Mobile `studentDocumentsApi`/`documentTypesApi` (`src/api/students.ts`) define the same missing routes, and the download button in `app/students/studentdocuments.tsx` calls `/{id}/download`, so it always fails.
15. **Standalone parents can't be created.** `POST /parents/` inserts a `parents` row without `user_id` (NOT NULL), which causes a 500. Parents only come into existence through admission.
    - The `/parents` master checks resource `parent_management` (not `parents`).
    - To find an existing parent use `GET /parents/search?phone=|email=|search_query=` (paginated `{items,total_count,has_next,skip,limit}`; used by the communication picker). Web `parentsApi.searchParentByPhone` treats that response as a single `Parent` and is unused.
    - Web `src/api/masters/parents.ts` also calls `GET /parents/{id}/students` and `DELETE /student-parent-links/{linkId}`, which don't exist. The real routes are `/student-parent-links/parent/{id}/students` and `DELETE /student-parent-links/student/{sid}/parent/{pid}`.
16. **After `commit()`, reload before serialising.** `toggle_student_active` commits and then re-selects with `selectinload(Student.user)`. Without that, the expired relationship caused a 500 while serialising the response. Follow the repo rule: `flush()` → `select()` → `commit()`.
17. **Manual SMS triggers are broken.** `/students/admission/send-confirmation` and `/student/attendance/send-absence-alerts` import `app.models.student.student_parent_association_model`, which doesn't exist (the model is in `models/masters/`). Both return 500. No client calls them; see `communication.md`.

## Web / mobile parity
| Area | Web | Mobile |
|---|---|---|
| Attendance write | Writes only non-present marks (`by-date` upsert + PATCH) | Writes a row for **every** student, including `present` (POST/PATCH per student). Reports see extra `present` rows from mobile-marked days. |
| Student statuses | present/absent/late/half_day/leave | present/absent/late/leave (no half_day) |
| Roster `as_of_date` | sent | not sent (later joiners appear on past dates) |
| Bulk "Auto Fetch" (`include_data=true`) | no | yes |
| Document types | from a non-existent endpoint (empty) | hardcoded list |
| Parents master (`/masters/parents`) | yes (create is broken, rule 15) | no |
| Parent role detection | role name `parent` | `parent`, `guardian`, `father`, `mother` |
| Admission number | required client-side, pre-filled with the verified next number | same |
| Admission form dates | `DatePicker` | typed `DD/MM/YYYY` (slashes auto-inserted) **or** calendar icon, both kept in sync; form state and payload stay `YYYY-MM-DD` |

## Known gaps
- Admission stores parent Aadhaar numbers unvalidated: `admission_schema.py` has no check on `father_/mother_/guardian_aadhar_number`, while `ParentCreate` requires 12 digits. `test_tenant_schema` has one 10-digit value. `ParentOut` no longer re-validates, so reads work, but the admission form can still save bad values.
- Attendance roster capped at 10 students and includes inactive students (rule 6).
- Teachers are not scoped to their classes; they see and mark every student.
- Student document files cannot be downloaded (rule 14), and there is no document-type master or verification on the backend.
- `DELETE` admission is destructive to shared parents and returns 500 (rule 5).
- `POST /parents/` is broken (rule 15). There is no way to add a guardian to an existing admission (rule 3).
- `send-confirmation` / `send-absence-alerts` fail on import (rule 17).
- Homework is not built: a `student_homework` model exists, but the only route is `POST /students/homework/send-reminders` (no CRUD, no UI).
- Student and staff photos are not tenant-scoped (`media/student/photos/`) and are served without auth (see `architecture.md`).
