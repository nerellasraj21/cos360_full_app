# Staff
Staff enrollment (a login account plus an HR record with extended fields and qualifications), designations, staff attendance, and staff photos.
_Last verified against code: 2026-10-07_
Flows, decisions, and feature map: [graph view](../graph/views/staff.md) (source: docs/graph/graph.jsonl).

Related: `docs/architecture.md` (file storage), `docs/permissions.md`, `docs/modules/auth.md` (staff login by email/phone, first-login, `/profile/staff/me`), `docs/modules/communication.md` (staff SMS triggers), `docs/modules/students.md` (the attendance pattern shared with students).

## What it does
- **Enrollment creates a `users` row and a `staff` row together** (`create_staff_enrollment`).
  - Username = `email`, or `phone` when there is no email. At least one of the two is required.
  - Role = `role_id` from the request. If none is sent, the backend uses the tenant role named `Staff`.
  - The account gets a hardcoded temporary password and `is_first_login = TRUE` (see `auth.md`). Staff can also log in with their phone number (auth lookup order).
- **Required on create:** `first_name`, `phone`, `address`. `email` is optional but unique within the tenant (`staff.email` and `users.username` are UNIQUE per tenant, so the same email can exist in two tenants).
- **Required on update:** a PATCH may omit fields, but if it sends `first_name`, `email`, `phone` or `address`, the value cannot be blank or null (`_mandatory_fields_cannot_be_cleared`).
- **Extended HR fields** are columns on `staff`:
  - Work experience: `work_org`, `work_from_date`, `work_to_date`, `subjects_dealt`, `work_remarks`.
  - Bank: `bank_name`, `bank_branch`, `account_number`, `ifsc_code`, `account_holder_name`, `account_type` (`Savings | Current`).
  - Salary and PF: `last_drawn_salary`, `current_salary` (both Numeric(10,2)), `pf_account_number`, `uan_number`.
- **Qualifications** live in the separate table `staff_qualifications` (CASCADE on staff delete), managed at `/staff/{staff_id}/qualifications[/{qualification_id}]`. The `level` enum has DB values `Below Graduation | Graduation | Post Graduation | PhD`. `staff.qualification` (free text) is a separate legacy summary field.
- **Designations** (`designations.title`, UNIQUE):
  - CRUD at `/staff/designations/`. The list is paginated (`limit` ≤ 100) and each item carries `staff_count`, `created_at` and `updated_at`.
  - A designation still assigned to staff cannot be deleted (400 with the count).
  - `GET /staff/designations/dropdown` returns `{id,title}` sorted by title.
- **Drivers:** `GET /staff/drivers` returns staff whose designation title is exactly `driver` (case-insensitive). It returns `id = user_id` because transport assigns drivers by **user id**; see the transport doc.
- **Staff attendance:** one row per `(staff_id, date)` (`uq_staff_date`).
  - Statuses come from the shared enum `present | absent | late | half_day | leave`.
  - `PATCH /staff/attendance/by-date/{date}` upserts a list of `{staff_id,status,remarks}`. It returns 400 for a future date, an empty list, a malformed `staff_id` or an unknown status.
    - An unknown but well-formed `staff_id` fails the whole batch with 500 and nothing is saved.
    - `remarks` is only overwritten when the new value is non-empty, so this path cannot clear a remark.
  - `GET /staff/attendance` filters by date only when both `start_date` and `end_date` are sent; one of them alone is ignored. `GET /staff/{staff_id}/attendance/filter` accepts either bound alone.
- **Photos:** `POST|DELETE /staff/enrollment/{staff_id}/photo`, multipart field `photo`, jpg/jpeg/png/webp (checked by extension only), max 2 MB. The file is stored at `media/{tenant_id}/staff/photos/{staff_id}.{ext}` and returned as `photo_url` (`/media/{tenant_id}/...`). Uploading a different extension removes the old file.
- **Bulk enrollment:**
  - `POST /staff/enrollment/bulk-upload` takes an Excel file with a sheet named `Staff Admission`. Required headers: `First Name`, `Phone`, `Address`.
  - Designation and Role are matched **by name** (case-insensitive). A duplicate email, or an email already used as a username, fails that row.
  - Rows are created one by one through `create_staff_enrollment`, so a bad row does not stop the others.
  - The template comes from `GET /staff/enrollment/bulk-upload/template`.
- **Permission resources:** `staff`, `staff_attendance`, `designations` (and `transport_trips:read` for `/drivers`). Note the odd one out: `/staff/send-interview-calls` checks `staff_enrollment:send_sms`.

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Endpoints (prefix `/staff`) | `app/api/v1/masters/staff_endpoints.py` | — | — |
| Services | `app/service/masters/{staff,staff_bulk,designation}_service.py` | | |
| Models | `app/models/masters/{staff_model (Staff, StaffQualification), designations_model, staff_attendance_model}.py` | | |
| Schemas | `app/schemas/masters/{staff,staff_attendance,designation}_schema.py` | `src/types/staff/staff.ts`, `src/types/staff.ts` | `src/types/masters/staff.ts` |
| API | | `src/api/staff/{staff,attendance}.ts`, `src/api/staff.ts` (roster `useStaff`) | `src/api/staff.ts` |
| Hooks | | `src/hooks/staff/useStaff.ts` (enrollment table, designations, drivers), `src/api/hooks/staff/{staff,attendance,useStaffProfile}.ts` (bulk upload, day attendance, own profile) | `hooks/use-staff-api.ts` |
| UI | Excel template: `app/static/templates/staff_bulk_upload_template.xlsx` | Routes `src/routes/_app/staff/{index,staff,enrollment,attendance,designations,profile}.tsx`; `src/pages/staff/{staff,enrollment,attendance,designations,StaffProfile}.tsx`; `src/components/staff/{StaffEnrollmentTable,DesignationsTable,BulkStaffUploadDialog}.tsx` | `app/staff/{_layout,index,[id],enrollment,attendance,designations,bulk-upload,profile}.tsx` |

**Dead code (do not extend):**
- Web `src/api/staff/index.ts` calls `/masters/staff/...`, which doesn't exist. Only the unimported `src/hooks/staff/index.ts` uses it.
- Web `src/pages/masters/staff.tsx` is unrouted. It is the only user of `src/components/staff/StaffAttendanceTable.tsx`, which sends `half-day`, a status the backend rejects.
- Web `src/hooks/masters/useStaff.ts` is unused. Its `src/api/masters/staff.ts` is still imported by the transport vehicles page.
- Mobile `staffAssignmentsApi` (`src/api/staff.ts`) targets `/staff/assignments/*`, which doesn't exist (there is no staff-assignment table). Nothing calls it.

**Import resolution:** `@/api/staff` resolves to `src/api/staff.ts` (a file wins over the directory index).

## Rules & gotchas
1. **Two response shapes.**
   - `GET /staff/` returns `StaffOut`, which has `designation_obj {id,title}` and no `designation_id`.
   - `/staff/enrollment*` returns `StaffEnrollmentOut`, which has `designation_id` and no title.
   - Map the correct one. Reading `designation_id` from `/staff/` always gives undefined.
2. **`created_at` / `updated_at` are always null.** `StaffEnrollmentOut` declares them as optional, but the `staff` table has no timestamp columns (`BaseOrg` adds none). Keep them `| None = None`; making them required causes a 500 on every staff response.
3. **Decimals come back as strings.** Salary fields arrive as strings, so clients must call `Number()` before sending them back. Web form state holds strings and converts at the mutate call.
4. **`GET /staff/` ignores `is_active`, `skip` and `limit`.** It only filters by `gender`. The web attendance roster sends `is_active=true` and still gets inactive staff. `GET /staff/enrollments` is also unpaginated.
5. **`staff.is_active` does not block login.** Login checks `users.is_active`. To lock a staff member out, deactivate the user (admin user management); see `auth.md`.
6. **Deleting staff leaves the user row behind.** `DELETE /staff/enrollment/{id}` removes the staff row, its attendance and its qualifications, but not the user. The orphaned username (email or phone) keeps the login working and blocks re-enrolling the same person.
   - Single create has no pre-checks. A duplicate email or phone, an unknown `role_id` or `designation_id`, and a value longer than its column all return the same 500 `Error creating staff enrollment`.
   - PATCH maps the same integrity errors (duplicate email, unknown designation) to 400.
7. **Updates never touch the user row.** PATCH changes `staff.email` and `staff.phone` but not `users.username` or `users.email`, so the person still logs in with the old identifier. The role is chosen only at create: `role_id` is not in `StaffEnrollmentUpdate` and is silently dropped.
8. **Staff attendance status is not lowercased.** Unlike the student schema, `StaffAttendanceCreate` has no before-validator, so `"Present"` → 422. Always send lowercase.
9. **Single-create attendance has no guards.** `POST /staff/attendance` accepts future dates, and a duplicate (`uq_staff_date`) or an unknown `staff_id` returns 500. There is no joining-date guard anywhere, unlike the admission-date guard for students.
10. **"Present" means delete (web and mobile).**
    - Switching a staff member back to present DELETEs the row, so the marker needs `staff_attendance:delete`. Without it the save partially fails. Web runs the calls with `Promise.all`, which hides which ones failed; mobile uses `Promise.allSettled` and keeps the failed rows pending.
    - Student attendance avoids this by PATCHing to `present`; see `students.md`.
11. **Photo URLs are fixed per staff member.** The filename is `{staff_id}.{ext}`, so a re-upload in the same format keeps the same URL and browsers may keep showing the old image; add a cache-buster in the client. Photos written before the shared-schema change keep their old unprefixed `/media/staff/photos/...` URLs (see `architecture.md`).
12. **Enum `values_callable` is required.** `StaffQualification.level` uses `values_callable=lambda x: [e.value for e in x]`, because the Python member names (`post_graduation`) differ from the DB labels (`Post Graduation`). Drop it and inserts fail.

## Web / mobile parity
| Area | Web | Mobile |
|---|---|---|
| Role picker on enroll | yes (any tenant role) | no (always defaults to `Staff`) |
| Attendance statuses | present/absent/late/half_day (no `leave`, although the backend accepts it) | same |
| Attendance day load | `GET /staff/attendance/by-date/{date}` | `GET /staff/attendance?start_date&end_date` |
| Bulk enrollment | `BulkStaffUploadDialog` | `app/staff/bulk-upload.tsx` |
| Staff detail screen | view dialog in table | `app/staff/[id].tsx` |

## Known gaps
- **Privilege escalation:** anyone holding `staff:create` can create an **Admin** (or any other role) user, both through `role_id` and through the bulk sheet's Role column. Role assignment should be restricted.
- **Photos do not load from a plain browser request.** `GET /media/...` without a `cschema` header or bearer token is rejected with 400 by the tenant middleware, and an `<img>` tag cannot send either.
- There is no "my attendance" endpoint for staff. A staff member sees their attendance only if they hold `staff_attendance:list`.
- `staff.is_active` and `users.is_active` are not kept in sync (rule 5). Orphaned users are left behind after delete (rule 6).
- The `/staff/send-attendance-summary` and `/staff/send-interview-calls` SMS triggers are not called by any client (see `communication.md`).
