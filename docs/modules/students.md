# Students
Admission (student + parent/guardian accounts), student records and status, parent links, student attendance, student documents and photos.
_Last verified against code: 2026-10-07_
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
- **Admission type** is `pre_primary | regular` (`AdmissionTypeEnum`). If it is omitted, the backend derives it from `student.is_primary == "primary"`; an explicit `regular` wins over `is_primary`.
- **Required fields:**
  - Admission level: `academic_year_id`, `admitted_class_id`, `address_line1` (blank is 422).
  - Student: `first_name` (blank is 400), and the `father` and `mother` objects (each needs `relation_to_student`).
  - Father: `phone`. A missing father `name` falls back to "Father" like any parent name, so it is not enforced.
- **Optional fields** and their fallbacks:
  - Everything else is optional. `last_name` is stored as `""` when missing.
  - A blank or omitted `date_of_birth` becomes the sentinel `1900-01-01` (`PLACEHOLDER_DATE_OF_BIRTH`).
  - A blank parent `name` becomes the relation label ("Mother").
  - `admission_date` defaults to today and cannot be in the future.
- **Format validation:**
  - Aadhar/APAAR must be exactly 12 digits; `primary_phone` exactly 10.
  - Parent Aadhaar (`father_/mother_/guardian_aadhar_number`) is optional but must be 12 digits when given, on admission (`ParentCreate`) and on PATCH (`StudentAdmissionUpdate`, which also checks student Aadhar/APAAR, primary phone, parent email and salary range). `ParentOut` does not re-validate, so stored values of any length read back fine.
  - A guardian with a name (other than "Guardian") or any other detail but no email is rejected (422).
  - `salary_range` is one of `below_1l | 1l_3l | 3l_5l | 5l_10l | above_10l` (see `GET /parents/salary-ranges/dropdown`).
- **Parent reuse (siblings):** if a father, mother or guardian email already belongs to a user with role `Parent`, that parent is reused. Their fields are overwritten with the new payload and the new child is linked.
  - Father and mother may not share an email (400).
  - An email already used by a non-Parent user is rejected (422).
- **Active status** lives on `users.is_active`; `students` has no column of its own. `PATCH /{student_id}/toggle-active` flips it.
  - An inactive student cannot log in.
  - Inactive students are excluded from `/students/dropdown*` (`active_only=true` by default).
- **Role-aware reads** (`check_user_resource_access`):
  - Student: `own` scope.
  - Parent: `related` scope, i.e. children linked in `student_parent_links`.
  - Admin, Staff and Teacher: `all`.
  - Teachers are **not** limited to their classes; there is no teacher-class assignment table. See `permissions.md`.
- **Attendance:** one row per `(student_id, date)` (`uq_student_date`).
  - Statuses: `present | absent | late | half_day | leave` (`app/schemas/common/attendance_status_enum.py`).
  - No future dates, and no dates before the student's `admission_date`.
  - Attendance percentage counts `half_day` as half a present day (`app/service/student/attendance_percentage.py`; mobile `src/utils/attendance.ts` mirrors it).
- **Documents:**
  - General uploads (`student_documents`) have a free-text `document_type`, unique per student. Max 5 MB; pdf/jpg/jpeg/png/docx only, and PDFs must start with `%PDF`.
  - `GET /students/documents/all?student_id=` merges uploads, certificates (`student_certificates`) and fee receipts into one list, newest first. Generated (issuable) certificates are not included.
  - The list, `/all` and single-document reads limit a Student to their own record and a Parent to linked children (`app/tools/ownership.py` `ensure_student_access`, 403 otherwise).
- **Photos:** `POST|DELETE /students/admission/id/{student_id}/photo`, multipart field `photo`, jpg/png/webp, max 2 MB. The file is stored at `media/{tenant_id}/student/photos/{student_id}.{ext}` and the response field is `photo_url` (`/media/{tenant_id}/...`).
- **Standalone parents:** `POST /parents/` (resource `parent_management`) creates a Parent login and the `parents` row together. Email or phone is required; the username is the email, else the phone. A username or email already in use is 409. The account gets the temporary parent password and `is_first_login = TRUE`. Link it to a student with `POST /student-parent-links/`.
- **Bulk admission:**
  - Upload an Excel sheet named `Student Admission` to `POST /students/admission/bulk-upload`.
  - Required headers: `First name`, `joining class`, `Father name`, `Father phone`, `Address Line 1`.
  - Each row goes through `add_admission` separately: good rows are created even when others fail. The response is `{created[], errors[], total_rows}`.
  - The academic year is the tenant's **active** year.
  - Template: `GET .../bulk-upload/template` gives a blank sheet with dropdowns (hidden `Lists` sheet, cascading sub-caste). `?include_data=true` pre-fills every existing admission.

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Endpoints | `app/api/v1/student/{admission,attendance,student_document,student_parent}_endpoints.py`, `app/api/v1/masters/parent_endpoints.py` | - | - |
| Prefixes | `/students/admission`, `/student/attendance` (singular!), `/students/documents`, `/student-parent-links`, `/parents` | | |
| Services | `app/service/student/{admission,admission_bulk,student,student_attendance,student_document}_service.py`, `app/service/student/attendance_percentage.py`, `app/service/masters/{parent,student_parent_link}_service.py`, ownership checks in `app/tools/ownership.py` | | |
| Models | `app/models/student/{student,student_document}_model.py`, `app/models/masters/{admission,parent,student_parent_association,attendance}_model.py` | | |
| Schemas | `app/schemas/student/{admission,student,attendance,student_document}_schema.py`, `app/schemas/masters/{parent,student_parent_link}_schema.py` | `src/types/{admission,attendance,documents,parent}.ts`, `src/types/masters/parent.ts` | `src/types/{admission,attendance,documents}.ts` |
| API / hooks | | `src/api/students/*`, `src/api/hooks/students/*`, `src/api/masters/{classesandsections,parents}.ts`, `src/api/auth.ts` (`useParentChildren`) | `src/api/students.ts`, `src/api/masters.ts` (`parentsApi`), `src/api/hooks/students/*` |
| UI | Excel templates: `app/static/templates/student_admission_bulk_upload_template.xlsx` | `src/pages/students/*`, `src/components/students/*` (`MultiStepAdmissionForm`, `admission-steps/`, `AdmissionTable`, `BulkAdmissionUploadDialog`), `src/routes/_app/students/*`, `src/pages/masters/parents.tsx` (`src/components/masters/parents/ParentsTable.tsx`) | `app/students/*`, `app/parents/*`, `app/masters/parents.tsx` |
| Scripts | `scripts/find_stale_pre_admission_attendance.py` (still per-schema; not converted to the shared schema) | | |

## Rules & gotchas
1. **Two different IDs.** List rows carry `id` = admission id and `student.id` = student id. `GET /id/{...}`, `PATCH /{...}`, `toggle-active` and photo routes take the **student id**. `DELETE /{...}` and `GET /by-admission/{...}` take the **admission id**. Mixing them up gives a 404.
2. **Parents are nested under `student`.** The response has `student.father`, `student.mother` and `student.guardian`, not top-level fields. Ownership: `StudentOut.extract_father_mother_guardian` copies the `_father`/`_mother`/`_guardian` values the service sets.
   - Only the detail GET (`/id/{student_id}`) fills all three. The **list** fills father and mother but **not guardian**, and the **create** response (`POST /students/admission/`) returns all three as `null`; re-read the detail after create.
   - `student.is_active` is filled only by list and toggle; the detail GET returns `null`.
3. **Guardian needs an email.** The API rejects (422) a guardian that has a name or details but no email, and both clients require the guardian email once a guardian name is entered. PATCH can only update an existing guardian link; it cannot add one (guardian fields are ignored when no link exists).
4. **Login identity never follows edits.**
   - Changing `admission_number` or a parent's email via PATCH updates the `student_admissions` / `parents` row only; `users.username` and `users.email` keep their original values.
   - Parents are shared across siblings, so editing a parent through one child's admission changes it for all siblings.
   - Creating an admission with an existing parent email overwrites that parent's name, phone and other fields.
   - PATCH cannot blank `first_name`, `father_name` or `father_phone` (400) or null `academic_year_id`/`admitted_class_id` (400). A null `date_of_birth` becomes the sentinel.
5. **`DELETE /students/admission/{admission_id}`** deletes the student's attendance, documents, certificates (uploaded and generated), fee mappings, transport assignments, parent links, admission, student and user, and a parent (with their user) only when no other student is linked. It returns 200 `{message}`, or 409 (nothing deleted) when the student has fee payments, concessions, previous dues, exam marks or results, homework, or another admission. No client calls it; prefer toggle-active.
6. **List pagination:** `GET /students/admission/` defaults to `limit=10` (max 100); `active_only=true` (default false) keeps only active students.
   - The roster helpers (web `getStudentsByClassSection`, mobile `studentAdmissionsApi`/`classSectionsApi.getStudentsByClassSection`) send `active_only=true` and page 100 at a time until `has_next` is false.
7. **`is_primary` means two different things.**
   - UI (web `StudentStepForm`, mobile): `not_primary` = "Day Scholar", `primary` = "Hostel".
   - Bulk upload and backend: "Student type" `Pre Primary` -> `primary`, and `add_admission` turns `is_primary == "primary"` into `admission_type = pre_primary` when no `admission_type` is sent. The bulk path never sends one.
   - Don't read one meaning into the other; `admission_type` is authoritative.
8. **`state` holds a UUID.** Both clients send `state = state_id` (the `StateDropdown` UUID), so the text column is not a name. Read `state_id`, `district_id` and `mandal_id` (public-schema location masters) and resolve names from them.
9. **Status casing:** single create/update lowercases `status`. `PATCH /by-date/{date}` takes raw dicts, so the status must already be lowercase (400 otherwise). That call also only sets `remarks` when the value is non-empty, so it cannot clear remarks, and it skips items without `student_id` or `status`. A malformed `student_id` is 422; an unknown one is a 500 `DATABASE_ERROR`.
10. **Admission-date guard:** a single create/update before `admission_date` returns 422, while the bulk by-date call silently **skips** those students.
11. **Route order:** static routes (`/search`, `/my-attendance`) must come before `/{attendance_id}`. Otherwise FastAPI parses `my-attendance` as a UUID and returns 422. Keep new static routes above dynamic ones.
12. **Unscoped attendance reads:** `GET /student/attendance/`, `/search` and `/by-date/{date}` return **every** student's rows to any role holding `student_attendance:list` (by default Admin, Staff and Teacher; Student and Parent get 403). `/student/{id}/filter` checks ownership for Students and the linked-child check for Parents. Always query with a date and student filter; never fetch everything.
13. **`X-Student-ID` is ignored.** Web and mobile send it for parents, but the backend never reads it. Parent scoping works only through explicit `student_id` params plus the `related` scope check.
14. **Document files are not downloadable.** `student_documents` files go to `./student_documents/` (relative to CWD). That directory is **not tenant-scoped and not served**; only `media/` is mounted.
    - Web builds `${mediaBase}${file_path}`, which yields a broken URL.
    - Web `src/api/documents.ts` calls endpoints that don't exist: `/students/documents/{id}/download`, `/{id}/verify`, `/students/document-types/` (all 404). So the web document-type dropdown is empty, while mobile hardcodes its list.
    - Mobile `studentDocumentsApi`/`documentTypesApi` (`src/api/students.ts`) define the same missing routes, and the download buttons in `app/students/studentdocuments.tsx` and `mydocuments.tsx` call `/{id}/download`, so they always fail.
15. **Parents master routes.**
    - The `/parents` master checks resource `parent_management` (not `parents`). By default Admin and Staff hold it; Staff can create but not delete.
    - `GET /parents/search?phone=|email=|search_query=|relation_to_student=` ANDs the given filters and returns `{items,total_count,has_next,skip,limit}` (used by the communication picker). Web `parentsApi.searchParentByPhone` treats that response as a single `Parent` and is unused.
    - Web `src/api/masters/parents.ts` also calls `GET /parents/{id}/students` and `DELETE /student-parent-links/{linkId}`, which don't exist. The real routes are `/student-parent-links/parent/{id}/students` and `DELETE /student-parent-links/student/{sid}/parent/{pid}`.
16. **After `commit()`, reload before serialising.** `toggle_student_active` commits and then re-selects with `selectinload(Student.user)`. Without that, the expired relationship caused a 500 while serialising the response. Follow the repo rule: `flush()` -> `select()` -> `commit()`.
17. **Manual SMS triggers need `send_sms`.** `/students/admission/send-confirmation` checks `student_admissions:send_sms` and `/student/attendance/send-absence-alerts` checks `student_attendance:send_sms`; no default role holds either, so both return 403. No client calls them; see `communication.md`.

## Web / mobile parity
| Area | Web | Mobile |
|---|---|---|
| Attendance write | Writes only non-present marks (`by-date` upsert + PATCH) | Writes a row for **every** student, including `present` (POST/PATCH per student). Reports see extra `present` rows from mobile-marked days. |
| Student statuses | present/absent/late/half_day/leave | present/absent/late/leave to mark (no half_day); history and stats show half_day |
| Roster `as_of_date` | sent | not sent (later joiners appear on past dates) |
| Bulk "Auto Fetch" (`include_data=true`) | no | yes |
| Document types | from a non-existent endpoint (empty) | hardcoded list |
| Parents master | `/masters/parents` (create needs email or phone) | `app/masters/parents.tsx` (same rule) |
| Parent role detection | role name `parent` | `parent`, `guardian`, `father`, `mother` |
| Admission number | required client-side, pre-filled with the verified next number | same |
| Admission form dates | `DatePicker` | typed `DD/MM/YYYY` (slashes auto-inserted) **or** calendar icon, both kept in sync; form state and payload stay `YYYY-MM-DD` |

## Known gaps
- Teachers are not scoped to their classes; they see and mark every student.
- Student document files cannot be downloaded (rule 14), and there is no document-type master or verification on the backend.
- There is no way to add a guardian to an existing admission (rule 3).
- The create response carries null parents (rule 2).
- Bulk upload resolves `joining section` and `Current Section` by name across the whole tenant, so a section name used by more than one class (A, B, ...) fails the row.
- Homework is not built: a `student_homework` model and `student_homework_endpoints.py` exist, but the router is not registered (`/students/homework/*` is 404), and there is no CRUD or UI.
- Student photos are stored under `media/{tenant_id}/` and served without an auth check, but in strict tenant mode a `/media/...` request with no `cschema` header and no bearer token gets 400, so a plain `<img>` or browser link cannot load them (see `architecture.md`).
