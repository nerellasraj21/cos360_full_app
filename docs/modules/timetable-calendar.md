# Timetable & Calendar
The weekly class timetable for each section, and the school holiday/event calendar.
_Last verified against code: 2026-10-07_
Flows, decisions, and feature map: [graph view](../graph/views/timetable-calendar.md) (source: docs/graph/graph.jsonl).

Classes, sections, subjects and class-subject mappings are covered in [masters](masters.md). Permissions are covered in [permissions](../permissions.md).

## What it does
- **Timetable**: one weekly grid per **section**. Rows are time ranges and columns are days.
  - A **subject row** assigns one subject per day.
  - A **special row** (Snacks, Lunch, Dispersal or a custom event such as "Assembly") spans every day with a label.
  - Saturday is an optional column that can be switched on.
  - The model has **no teacher/staff and no academic year**. The year is implied by the section's class.
- **Who edits**: admin, with `timetable_management:create/update/delete`. Reading needs `timetable_management:read`.
  - The default role seed (`app/service/tenant/permission_catalog.py`) grants `timetable_management` to Admin only. Staff, Teacher, Student and Parent get 403 on every timetable read unless the tenant adds the grant.
  - Web shows the editor in read-only mode when `timetable_management:update` is missing.
  - On mobile, students and parents get a read-only per-day viewer for their own or their child's section (it needs the read grant above).
- **Editor conveniences** (web and mobile):
  - The subject picker only lists subjects mapped to the class. A mapping counts if it has no `section_id` or matches the selected section.
  - "Repeat All for Week" copies one day's subjects to every other day.
  - "Repeat One Subject" fills every day of each row that already contains that subject. This is the web behaviour; mobile differs (see parity).
  - Export to PNG, CSV and Excel happens entirely on the client.
- **Holidays / calendar**: holidays and events belong to an academic year. Each has `name` (<=50 chars), `description` (<=100), `start_date`, `end_date`, `color` (hex, `#rrggbb`) and `is_active`. Admin manages them (`holiday_management:create/update/delete`); viewing needs `holiday_management:read/list`.
  - The default role seed grants `holiday_management:read/list` to Teacher and Staff. Student and Parent have no grant, so the mobile calendar gets 403 for them unless the tenant adds it.
  - Delete is a soft deactivate (repeatable). `PATCH /{id}/activate` restores the holiday.
  - An update cannot move a holiday to another academic year: `HolidayUpdate` has no `academic_year_id`, so it is silently dropped.
  - Holidays are **not** consumed by attendance, timetable or fee logic. They are display-only.

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Models | `backend/app/models/masters/timetable_model.py`, `timetable_slot_model.py`, `timetable_subject_option_model.py`, `slot_time_model.py`, `holidays_model.py` | — | — |
| Schemas / types | `backend/app/schemas/masters/timetable_schema.py` (`Frontend*` classes), `holidays_schema.py` | `web/src/types/masters/timetable.ts`, `web/src/types/masters/holiday.ts` | `mobile/src/api/students.ts` (`TimetableDataItem`, `FrontendTimetable*`), `mobile/src/api/masters.ts` (`HolidayRead`) |
| Services | `backend/app/service/masters/timetable_service.py`, `holiday_service.py` | — | — |
| Endpoints / API | `backend/app/api/v1/masters/timetable_routes.py`, `holiday_endpoints.py` | `web/src/api/timetable.ts` (API and hooks together), `web/src/api/masters/holidays.ts`, `web/src/api/hooks/masters/holiday.ts` | `timetableApi` in `mobile/src/api/students.ts`, `holidaysApi` in `mobile/src/api/masters.ts` |
| UI | — | `web/src/pages/masters/TimeTableEditor.tsx` (route `/_app/TimeTable`), `web/src/components/calendar/Calendar.tsx` (routes `/_app/masters/holidays` and `/_app/Calender`, both the same component) | editor `mobile/app/masters/timetable.tsx`, viewer `mobile/app/timetable.tsx`, holiday admin `mobile/app/masters/holidays.tsx`, read-only calendar `mobile/app/calendar.tsx` |

Endpoints (all under `/api/v1`):
- Timetable, under the prefix `/students/timetable` (not `/masters`):
  - `POST /frontend` creates.
  - `GET /frontend/{section_id}`, `PUT /frontend/{section_id}` and `DELETE /frontend/{section_id}` read, replace and delete.
  - Legacy routes: `GET /section/{section_id}` returns the grouped DB shape. `POST /bulk` takes the `FullTimetableCreate` shape. The bulk slot patch lives at `PATCH /timetable/slots/bulk`, so its full path is `/students/timetable/timetable/slots/bulk`.
- Holidays, under `/masters/holidays/`:
  - `GET /`, which takes `skip`, `limit` (default **10**), `active_only` (default **true**) and `academic_year_id`.
  - `POST /`, `GET /dropdown`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}` (deactivates) and `PATCH /{id}/activate`.

## Data model
`timetables` (one row per section; `section_id` is UNIQUE) → `timetable_slots` (`day` string, `slot_time_id`, `is_break`, `break_label`) → `timetable_subject_options` (`subject_id`). Each slot row stores one day of one period.

`slot_times` holds `section_id`, `label = "HH:MM-HH:MM"`, `start_time` and `end_time`.

The wire format that both clients use:
```json
{ "section_id": "…", "timetable_data": [
  { "time": {"from": "09:00", "to": "09:45"}, "type": "subject", "subjects": {"Monday": "<subject uuid>", "Saturday": "<uuid>"} },
  { "time": {"from": "10:30", "to": "10:45"}, "type": "special", "label": "SNACKS" } ] }
```
Validation rules:
- `type` must be `subject` or `special`.
- A `subject` row needs a non-empty `subjects` object and no `label`.
- A `special` row needs a `label` and no `subjects`.

## Rules & gotchas
1. **Create and update disagree on days.**
   - `POST /frontend` only keeps **Monday–Friday**: Saturday subjects are silently dropped, and special rows are written for Monday–Friday only.
   - `PUT` keeps any day key, and writes special rows for Monday–**Sunday**.
   - So the first save of a timetable that includes Saturday loses Saturday, and a second save (a `PUT`) keeps it. Save twice, or fix `create_frontend_timetable`, when Saturday matters.
2. **`POST /frontend` on a section that already has a timetable** returns 409 `A timetable already exists for this section`. Clients must choose between PUT and POST based on the GET result, as web and mobile both do.
   - POST also returns 404 for an unknown section, 400 for an unknown subject id, and 422 for a time that is not `H:MM`/`HH:MM`.
3. **`subjects` values must be UUIDs** (`dict[str, UUID]`).
   - On web, the Saturday cell is a `CreatableSelect` that also accepts special labels or free text. Saving any non-UUID Saturday value fails with a 422.
   - Mobile starts new subject rows with `subjects: {}` and does not filter them out, so saving an untouched subject row also fails with a 422.
4. **Row order after reload is not chronological.** The backend groups slots by `slot_time_id`, which is a random UUID, not by start time. Neither client sorts the returned `timetable_data`. Sort by `time.from` if you touch this code.
5. **Only one subject per cell is read back.** The DB allows several `subject_options` per slot, but the read path takes `subject_options[0]`. A time group is returned as `special` only if *every* slot in it is a break.
6. **Custom special events exist only on the client.** The name is validated as 1–50 alphanumeric characters or spaces and stored upper-cased with underscores (`MORNING_PRAYER`). It survives only as `break_label` on saved rows, and there is no shared list across sections.
7. **Web `Calendar.tsx` checks the wrong holiday resource.**
   - The backend enforces `timetable_management` and `holiday_management`. The web and mobile timetable editors (`PERMISSION_RESOURCES.TIMETABLES` is `timetable_management`) and mobile `masters/holidays.tsx` check those names.
   - Web `Calendar.tsx` checks `holidays:create/update/delete`. Unless the tenant's permission map also contains that alias resource, its add/edit/delete controls stay hidden even for users who can perform the actions.
8. **The holiday list defaults to `limit=10, active_only=true`.** The web month view (`Calendar.tsx`) and the mobile admin month view pass only `academic_year_id`, so they show at most 10 holidays. The read-only mobile `calendar.tsx` passes `limit: 100`. `limit` has no upper bound. Always pass an explicit limit.
9. **`HolidayCreate.is_active` defaults to `false`**, and a default list call hides inactive rows. Any new client must send `is_active: true`, or a newly created holiday seems to vanish.
10. **Holiday validation is split between schema and database.**
    - The schema rejects a `color` that is not `#rrggbb` and an `end_date` before `start_date` (422). A PUT that moves only one date before the stored other date gets 400.
    - The name and description lengths, and an unknown `academic_year_id`, are enforced only by the database and come back as 400 `Error creating holiday` / `Error updating holiday`.
11. **`HolidayUpdate.start_date`/`end_date` are typed `datetime`** while create uses `date`; the service truncates them to dates. Send `yyyy-MM-dd`; web and mobile both do.
12. **Deleting a class counts section timetables as dependencies** (see [masters](masters.md)). A section with a timetable cannot be hard-deleted until the timetable is removed with `DELETE /students/timetable/frontend/{section_id}`. Neither client has a button for that.
13. **The web editor's data-load effect must skip background refetches.** `useFrontendTimetable` uses `placeholderData: keepPreviousData`, and the effect returns early while `isFetching && data`. Without that, the refetch after a save resets the rows and throws the page back into edit mode. Toasts and `setIsEditing(false)` run inside the `mutate` callbacks, not in an effect watching `isSuccess`.
14. **Time cells are `HH:MM` strings on the wire.** The service parses them with `strptime("%H:%M")` because asyncpg's `TIME` needs `datetime.time`. Keep the pickers in 24-hour format.

## Web / mobile parity
- Both clients have the timetable editor, including Saturday, custom events, Repeat All, and PNG/CSV/Excel export.
  - "Repeat One Subject" works differently on each client. Web fills every day of every row that contains the chosen subject. Mobile copies one source day across the days of a *single selected row*.
  - Mobile Repeat All can copy an empty source cell as `''`, which then fails UUID validation (rule 3).
- The student/parent viewer is **mobile only** (`app/timetable.tsx`). Web has no dedicated viewer. The editor route is read-only without `timetable_management:update`, and it does not auto-select the user's own section.
- The web calendar enables only the **Month** and **All Events** views. The week, day and year views exist in code but are commented out. Drag-and-drop rescheduling is web only.
- Mobile has a separate read-only `app/calendar.tsx` (list/grid, upcoming/past filter) for every role, plus the admin `masters/holidays.tsx`.

## Known gaps
- The auto-generation spec in `backend/docs/timetable_module_spec.md` (local-only) is **not implemented**. It covers:
  - Level timing templates and a period skeleton.
  - The class teacher always taking Period 1.
  - Staff workload limits (default 6 periods/day, 3 subjects) and clash checks.
  - Level-scoped staff assignment.
  - A staff view, publish/draft states, copying from the previous year, and Class 10 extended hours.

  None of these have tables or endpoints today. Building them needs a staff column on slots, which does not exist.
- There is no validation of time overlaps, `from < to`, or that a subject is mapped to the section. The backend accepts any existing subject UUID.
- With the default role seed, students and parents cannot use the mobile timetable viewer or calendar (403), and staff and teachers cannot read timetables. See "What it does".
- Web `api/hooks/masters/timetable.ts` is dead code that targets non-existent `/masters/timetables/*` routes. `api/timetable.ts` also calls `PATCH /students/timetable/slots/bulk`, which does not exist (the real path is `/students/timetable/timetable/slots/bulk`). It is unused.
- UI-TTC-01 and UI-TTC-02: on web, creating a holiday from a day cell and drag and drop are blocked by the missing `holidays:create` and `holidays:update` aliases (the client gates on `holidays:*`, the backend and seed use `holiday_management:*`).
