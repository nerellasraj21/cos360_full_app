# COS360 Frontend Integration Guide

**For**: Frontend Developer
**Last Updated**: 2026-03-04 (rev 2)
**Status**: Active — reflects backend as of March 2026 dev session

---

## Overview

This document covers every backend change that requires a corresponding frontend change,
plus the full API contract for Student and Parent role pages. Read this before implementing
any student-facing or parent-facing screens.

---

## 1. Login & First-Login Flow

### 1.1 Login endpoint

```http
POST /api/v1/auth/login
Headers: cschema: <tenant-name>   (e.g. "test_tenant")
Body: { "username": "...", "password": "..." }
```

Login accepts **username, email, or phone number** in the `username` field.

### 1.2 Two possible responses

**Case A — Normal login (is_first_login = false)**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "<user-uuid>",
    "username": "lambodhar.vinayak",
    "email": "...",
    "role": "Student",
    "entity_id": "<student-uuid>"
  },
  "menus": [ ... ],
  "permissions": { ... }
}
```

`entity_id` is critical for student/parent pages — it is the `student.id` or `parent.id`,
NOT the `user.id`. Store it alongside the JWT.

**Case B — First login (temp password, must change)**

```json
{
  "requires_password_change": true,
  "change_password_token": "<15-min JWT>",
  "message": "Please set a new password to continue"
}
```

When you receive `requires_password_change: true`, redirect to the set-password screen.

### 1.3 Set password endpoint (all roles)

```http
POST /api/v1/auth/staff/set-password
Headers: cschema: <tenant-name>
Body:
{
  "change_password_token": "<token from login response>",
  "new_password": "...",
  "confirm_password": "..."
}
```

- Minimum password length: **8 characters**
- Returns the same `LoginResponse` as Case A on success
- The `change_password_token` expires in **15 minutes** — show a countdown or warn the user
- This endpoint is used for ALL roles (Staff, Teacher, Student, Parent)

### 1.4 Default credentials for dev/test

| Username | Role | Password |
| -------- | ---- | -------- |
| `TestStaff34b527d0` | Admin | `Admin@123` |
| `Ganesh1@gmail.com` | Teacher | `Ganesh@123` |
| `sita.sharma` | Parent | `Test@1234` |
| `lambodhar.vinayak` | Student | `Lambodhar@123` |
| `arjun.sharma` | Student | `Arjun@123` |

> **New accounts** created via `POST /students/admission/` get:
>
> - Student: username = `firstname.lastname` (e.g. `ravi.sharma`), password `student@123`
> - Parent: username = their email, password `parent@123`
> - No first-login flow required — they can log in immediately.

---

## 2. Menu Structure by Role

The `menus` array in the login response is already role-filtered. **Do not hardcode menus.**
Render exactly what the API returns.

### Student & Parent — 13 menus returned

| Menu Name | URL |
| --------- | --- |
| Dashboard | `/dashboard` |
| Students | `/students` |
| Student Admissions | `/students/admission` |
| Student Attendance | `/students/attendance` |
| Student Transport | `/students/studenttransport` |
| Student Documents | `/students/studentdocuments` |
| Student Certificates | `/students/studentcertificates` |
| Exam | `/exam` |
| Exams | `/exam/exams` |
| Mark Entry | `/exam/marks` |
| Hall Tickets | `/exam/hall-tickets` |
| Results | `/exam/results` |

> **Change from previous**: Student Transport URL is now `/students/studenttransport`
> (all lowercase). Update any hardcoded route in the frontend router.

Admin Transport pages (`/transport/routes`, `/transport/vehicles`, etc.) will NOT appear
for Student or Parent roles. If your router renders these pages regardless of menu,
add a role guard.

---

## 3. Student Admissions Page

### 3.1 API call

```http
GET /api/v1/students/admission/
Headers: Authorization: Bearer <token>
         cschema: <tenant-name>
Query:   skip=0&limit=10
```

### 3.2 What each role receives

| Role | Data returned |
| ---- | ------------- |
| Student | List with **1 item** — their own admission record |
| Parent | List of their **linked children's** admission records |
| Admin / Teacher | Full paginated list of all students |

The response shape is identical for all roles — the backend filters automatically.
**No role-specific API calls needed.**

### 3.3 Response shape

```json
{
  "items": [
    {
      "id": "<admission-uuid>",
      "student": {
        "id": "<student-uuid>",
        "first_name": "Lambodhar",
        "last_name": "Vinayak",
        "class_id": "...",
        "section_id": "...",
        ...
      },
      "admission_number": "NP2025001",
      "admission_date": "2025-01-15",
      ...
    }
  ],
  "total_count": 1,
  "has_next": false,
  "access_scope": "own",
  "user_role": "Student"
}
```

`access_scope` and `user_role` are informational — can be used for debugging, not required
for rendering.

### 3.4 Single admission fetch

```http
GET /api/v1/students/admission/id/{student_id}
```

`student_id` here is the **student UUID** (from `entity_id` in login response), not the
admission UUID. A Student/Parent calling this with a student_id they don't own will receive
`404 Not Found` (not 403 — this is intentional for security).

---

## 4. Student Attendance Page

### 4.1 For Students (viewing own attendance)

```http
GET /api/v1/student/attendance/my-attendance
Headers: Authorization: Bearer <token>
         cschema: <tenant-name>
Query:   start_date=2026-03-01&end_date=2026-03-04
```

> **REQUIRED**: Both `start_date` and `end_date` must always be sent.
> Omitting either returns `422 Unprocessable Entity`.
> Recommended default: first day of current month → today.

### 4.2 For Parents / Admin / Teacher (viewing a specific student's attendance)

```http
GET /api/v1/student/attendance/student/{student_id}/filter
Headers: Authorization: Bearer <token>
         cschema: <tenant-name>
Query:   start_date=2026-03-01&end_date=2026-03-04
```

`student_id` = the student UUID from `entity_id` (for Student self-view) or from
the children list (for Parent).

A Parent calling this with a `student_id` that is not their linked child returns `403`.

### 4.3 Date picker recommendation

Always pre-fill the date range. Do not allow the user to submit the attendance page
without both dates selected. Suggested UX: default to current month on page load.

---

## 5. Student Transport Page

### 5.1 Frontend route

The menu URL for Student Transport is `/students/studenttransport` (all lowercase).
Update your frontend router if it was previously `/transport/studentTransport`.

### 5.2 API call

```http
GET /api/v1/students/student-transport/student/{student_id}
Headers: Authorization: Bearer <token>
         cschema: <tenant-name>
```

`student_id` = `entity_id` from the login response (for Student) or the selected
child's student UUID (for Parent).

- A Student calling with another student's ID → `403 Forbidden`
- A Parent calling with a non-linked child's ID → `403 Forbidden`

### 5.3 Response shape (enriched — updated March 2026)

Returns a **list** (array). Each item has full nested route, vehicle, and stop details:

```json
[{
  "id": "ccb0fda2-...",
  "student_id": "ca0f68a3-...",
  "trip_id": "55c9282e-...",
  "stop_id": "f2467526-...",
  "fee_term_id": null,
  "fee_per_term": 500.0,
  "created_at": "2026-03-04T11:32:31.496602",
  "updated_at": "2026-03-04T11:32:31.496602",
  "trip": {
    "id": "55c9282e-...",
    "trip_number": 1,
    "route": {
      "id": "a46ae131-...",
      "route_name": "zhb-hyd",
      "starting_stop": "hyd",
      "ending_stop": "tr",
      "start_time": "07:00:00",
      "end_time": "08:30:00"
    },
    "vehicle": {
      "id": "45decfc3-...",
      "name": "bus",
      "registration_number": "ap 29 cw 2569",
      "vehicle_type": "Van"
    }
  },
  "stop": {
    "id": "f2467526-...",
    "name": "ZHB Bus Stand",
    "number": 1,
    "reaching_time": null,
    "fees": 500
  }
}]
```

| UI Label | JSON Path |
| -------- | --------- |
| Route name | `trip.route.route_name` |
| From / To | `trip.route.starting_stop` / `trip.route.ending_stop` |
| Departure | `trip.route.start_time` |
| Arrival | `trip.route.end_time` |
| Vehicle reg | `trip.vehicle.registration_number` |
| Vehicle type | `trip.vehicle.vehicle_type` |
| Bus stop | `stop.name` |
| Pick-up time | `stop.reaching_time` (may be `null`) |
| Fee / Term | `fee_per_term` |

> **Note:** `stop.reaching_time` and `trip.vehicle` can be `null` — handle gracefully.

---

## 6. Student Profile Page

### 6.1 Get profile

```http
GET /api/v1/profile/student/me
Headers: Authorization: Bearer <token>
         cschema: <tenant-name>
```

Returns the logged-in student's profile (personal details, class, section, roll number,
attendance percentage, certificate count, document count).

### 6.2 Update profile

```http
PUT /api/v1/profile/student/me
Headers: Authorization: Bearer <token>
         cschema: <tenant-name>
Body: { "email": "new@email.com" }
```

Only the `email` field is editable by the student. All other fields (class, section,
roll number, etc.) are read-only — managed by Admin.

> **New in March 2026**: This endpoint previously returned `403` for Student role.
> It now works correctly. If your frontend was showing an error screen for this page,
> remove that workaround.

---

## 7. Parent: Viewing Children

### 7.1 Get parent's linked children

```http
GET /api/v1/student-parent-links/parent/{parent_id}/students
Headers: Authorization: Bearer <token>
         cschema: <tenant-name>
```

`parent_id` = `entity_id` from the Parent's login response.

A Parent calling with a `parent_id` that is not their own → `403 Forbidden`.

Returns a list of student objects linked to this parent. Each student has:
- `id` — the student UUID (use as `student_id` in all subsequent child-specific calls)
- `first_name`, `last_name`, `class`, `section`, etc.

### 7.2 Switching between children

When a Parent switches from one child to another (e.g. via a dropdown), update the
active `student_id` in state. All child-specific calls (attendance, admission, transport)
use this `student_id`.

---

## 8. Error Handling Contract

| HTTP Status | Meaning | Frontend action |
| ----------- | ------- | --------------- |
| `200` / `201` | Success | Render data |
| `400` | Bad request / validation error | Show field errors from `detail` |
| `401` | Token missing / expired | Redirect to login |
| `403` | Permission denied | Show "Access Denied" screen |
| `404` | Record not found (or ownership denied) | Show "Not Found" or redirect |
| `422` | Missing/invalid query param | Check required params (e.g. `start_date`) |

### 403 vs 404

The backend intentionally returns `404` (not `403`) when a user tries to access
a record they don't own. This prevents information leakage. Handle both codes
with a "record not found" message on detail pages.

---

## 9. Headers Required on Every Request

```http
Authorization: Bearer <access_token>
cschema: <tenant-name>          (e.g. "test_tenant" for dev)
Content-Type: application/json  (for POST/PUT/PATCH requests)
```

The `cschema` header tells the backend which tenant schema to use. Without it,
most endpoints return `400` or `404`. Set it globally in your HTTP client.

---

## 10. Numeric Fields (Decimal Serialization)

PostgreSQL `Numeric` columns (e.g. `gpa`, `from_percent`, `to_percent` on grade band
responses) are serialized by Pydantic v2 as **strings** in JSON:

```json
{ "gpa": "4.50", "from_percent": "85.00" }
```

If you call `.toFixed()` or do arithmetic directly on these values, JavaScript will
throw `TypeError` because they are strings. Always cast first:

```js
const gpa = Number(response.gpa);  // "4.50" → 4.5
```

---

## 11. Summary of Changes (March 2026 Session)

| Area | Change | Action required |
| ---- | ------ | --------------- |
| Student Transport menu URL | Changed from `/transport/studentTransport` to `/students/studenttransport` | Update frontend router |
| Student Admissions page | Was 403 (missing `list_own`), now returns own admission | No change needed — it now works |
| Parent Admissions page | Was 403 (missing `list_related`), now returns children's admissions | No change needed — it now works |
| Student Profile page | Was 403 (`profile:read_own` not seeded), now works | Remove any 403 workaround on profile page |
| Attendance endpoints | Require mandatory `start_date` and `end_date` query params | Ensure both params are always sent |
| Student/Parent menus | Now limited to 13 student-facing menus only | Do not hardcode admin menus for these roles |
| Admin Transport menus | Not returned for Student/Parent roles | Ensure router doesn't render transport admin pages for these roles |
| **Transport response** | Now returns full nested `trip` (route + vehicle) and `stop` objects | Use `trip.route.route_name`, `stop.name`, etc. — see Section 5.3 |
| **Children URL** | `GET /students/parents/{id}/students` was wrong — correct URL is `/student-parent-links/parent/{id}/students` | Update the parent children fetch URL |
| **Student username** | Now generated as `firstname.lastname` (e.g. `ravi.sharma`), collision-safe | Login with this format for new students |
| **Parent username** | Now set to parent's email address | Login with email for parents created via admission API |

---

## 12. Student Photo (Added 2026-04-22)

Students now have a profile photo field. Photo management follows the same pattern as staff photos.

### 12.1 Upload photo

```http
POST /api/v1/students/admission/id/{student_id}/photo
Headers: Authorization: Bearer <token>
         cschema: <tenant-name>
         Content-Type: multipart/form-data
Body: form field name = "photo", value = <file>
```

Constraints: jpg/png/webp only, max 2 MB. Replaces any existing photo.

Response: full `StudentOut` object including `photo_url`.

### 12.2 Delete photo

```http
DELETE /api/v1/students/admission/id/{student_id}/photo
Headers: Authorization: Bearer <token>
         cschema: <tenant-name>
```

Response: `{ "detail": "Student photo deleted successfully" }`

### 12.3 Displaying the photo

The `photo_url` field in `StudentOut` (and all admission responses) is a relative path:

```json
{ "photo_url": "/media/student/photos/<student_id>.jpg" }
```

Build the full image URL by prepending the API base URL **without** `/api/v1`:

```js
const mediaBase = API_BASE_URL.replace(/\/api\/v1$/, "");
const imgSrc = student.photo_url ? mediaBase + student.photo_url : null;
```

### 12.4 Frontend implementation checklist

- [ ] Add `photo_url?: string | null` to the Student TypeScript interface
- [ ] Add `uploadStudentPhoto(studentId, file)` — `POST` multipart/form-data, field name `"photo"`
- [ ] Add `deleteStudentPhoto(studentId)` — `DELETE`
- [ ] Add `useUploadStudentPhoto()` hook — invalidates student detail + admissions list on success
- [ ] Add `useDeleteStudentPhoto()` hook — same invalidation
- [ ] In Create/Edit admission dialog:
  - Hold file in `pendingPhotoFile` state (upload after record is created, once `student_id` is available)
  - Show avatar if `photo_url` exists, placeholder icon otherwise
  - Client-side guard: reject files > 2 MB before uploading
- [ ] In admission detail/view: show avatar at top of details panel
