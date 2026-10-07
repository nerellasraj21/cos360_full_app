# Masters
Tenant reference data that every other module hangs off: academic years, classes and sections, subject categories, subjects, class-subject mappings, caste/location lookups, school settings, and the dropdowns that consume them.
_Last verified against code: 2026-10-07_
Flows, decisions, and feature map: [graph view](../graph/views/masters.md) (source: docs/graph/graph.jsonl).

Holidays and timetable are also mounted under masters. They are documented in [timetable-calendar](timetable-calendar.md). Staff, designations and parents are covered in [staff](staff.md) and [students](students.md), and transport masters in [transport](transport.md).

## What it does
- **Academic year**: has a `title` (unique, case-sensitive), a start and end date, and `is_active`. Classes, subjects, class-subject mappings, holidays, fee setup and admissions are all scoped to a year.
  - `end_date` before `start_date` is rejected on create (422) and update (400, also when only one date changes).
  - **Only one year can be active.** Creating a year with `is_active=true`, or updating one to `is_active=true`, deactivates every other year.
  - When an admin logs in on web, the year they chose is activated on the backend (`web/src/api/auth.ts`, `PUT /masters/academic_years/{id}` with `is_active:true`). So the active year is effectively "the year the last admin logged into".
- **Classes and sections**: a class (`name`, `short_code`, `academic_year_id`, `is_active`) contains sections. On web, a new class is created together with its sections in one call (the modal generates letters, e.g. A-D). Sections can be added, edited or deleted one at a time afterwards.
- **Subject categories**: a flat list of names shared by the whole tenant, with no academic year. Names are trimmed, must not be blank and are at most 100 characters. On web a category can be created inline from the subject form (`CreateCategoryPopover`, shown only with `subject_categories:create`).
- **Subjects**: `name` (1-50 characters), `short_code` (at most 10), `category_id` and `academic_year_id`. The service rejects a duplicate name or duplicate short code within the same academic year.
- **Class-subject mappings (CSM)**: say which subjects a class+section studies in a year, with an `order` and an `exclude_marks` flag (the subject is taught but left out of marks totals). The timetable subject picker and exam subject configuration (`GET /by-classes`) read these mappings. A duplicate single `POST /` is 409; an unknown class, section, subject or year is 400.
- **Lookup masters**: castes with sub-castes, and states -> districts -> mandals. They feed the student admission form's cascading dropdowns, where changing a parent value clears its children.
  - Castes are tenant data (`tenant_id` + row-level security) and are seeded once per tenant by an Admin via `POST /auth/seed/caste-data` (idempotent; an empty caste dropdown means it was never run). Sub-caste names may repeat.
  - States/districts/mandals are shared platform tables with no `tenant_id`, seeded once via the unauthenticated `POST /auth/seed/location-data`.
  - Salary ranges (`/parents/salary-ranges/dropdown`) and admission types (`/students/admission/admission-types/dropdown`) are fixed backend lists, not editable masters. They return `{value, label}` (salary ranges also include `display`) instead of `{id, name}`.
- **School settings**: a single row per tenant with name, contacts, address, board, academic-year label, logo and principal signature. The web menu calls it "School Registration". `GET` is 404 until the row exists; an upload creates the row if needed.
- **Delete semantics** differ by entity:
  - Academic year: `DELETE` only deactivates. `DELETE /{id}/permanent` hard-deletes, and is blocked while admissions, fee mappings, fee types or CSMs reference the year (400 naming the counts); a remaining foreign key (for example a class) gives a generic 400 "Academic Year deletion failed".
  - Class: hard-deleted together with its sections. Blocked if admissions, fee class or student mappings, CSMs, or section-level admissions, fee mappings or timetables exist.
  - Section: hard-deleted. A foreign-key violation comes back as 400 "deactivate it instead".
  - Subject: `DELETE` is a soft deactivate (204, idempotent).
  - Category: hard-deleted. Blocked while any subject uses it.
  - CSM: hard-deleted.
  - Caste: blocked while students or sub-castes reference it.
  - State and district: blocked while children exist.
- **Who can do what**: every endpoint runs the two-layer check `check_role_plan_permission_with_error(resource, action)` (see [permissions](../permissions.md)). Resources are `academic_years`, `classes` (adding sections to an existing class uses `sections:create`), `subject_categories`, `subjects`, `class_subject_mappings`, `castes`, `locations` and `school_settings`. With the default grants:
  - Admin has full CRUD on all of them.
  - Every role (including Student and Parent) reads academic years, classes, sections and subjects.
  - Staff and Teacher, but not Student or Parent, read castes, locations, subject categories and CSMs.
  - `school_settings` is Admin only, reads included.

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Models | `backend/app/models/masters/` (`academic_year_model`, `class_model`, `sections_model`, `subject*_model`, `class_subject_mapping_model`, `caste_model`, `location/`, `school_settings_model`) | - | - |
| Schemas / types | `backend/app/schemas/masters/` | `web/src/types/masters/`, `web/src/types/schoolSettings.ts` | `mobile/src/types/`, inline types in `mobile/src/api/masters.ts` |
| Services | `backend/app/service/masters/` | - | - |
| Endpoints / API | `backend/app/api/v1/masters/` | `web/src/api/masters/`, `web/src/api/schoolSettings.ts`, `web/src/constants/api/masters/` | `mobile/src/api/masters.ts`, `mobile/src/api/schoolSettings.ts` |
| Hooks | - | `web/src/api/hooks/masters/`, `web/src/hooks/masters/` | `mobile/src/api/hooks/masters/` |
| UI | - | `web/src/pages/masters/` (generic `common/MasterPage.tsx`), `web/src/components/masters/`, `web/src/pages/settings/SchoolSettings.tsx`, routes `web/src/routes/_app/masters/`, `/settings/school` | `mobile/app/masters/`, hub `mobile/app/(tabs)/masters.tsx`, `mobile/app/admin/school-settings.tsx` |
| Dropdowns | `@cache_dropdown` in `backend/app/tools/cache_utils.py` | `web/src/components/dropdown-system/`, `web/src/components/dropdown/`, `web/src/constants/dropdown/endpoints.ts` | `mobile/components/ui/dropdown.tsx` (`CustomDropdown`) |
| Year selection | public `GET /auth/academic-years` | `web/src/lib/academicYearStore.ts` | `mobile/contexts/AcademicYearContext.tsx` |
| Migrations | `backend/migrations/versions/0005_sections_unique_per_class.py`, `0006_classes_subjects_unique_per_year.py`, `0007_class_subject_mappings_unique.py` | | |

Endpoint prefixes (all under `/api/v1`). Note that the naming is inconsistent (underscores, hyphens and nesting); always copy the exact prefix:
- `/masters/academic_years/`: `dropdown`, `active`, `/{id}/permanent`. The list is paginated `{items,total_count,has_next}` with a default `limit` of 10.
- `/masters/class_sections/`
  - `read_all`, `dropdown` (active only), `by_class_id/{id}`, `by_class_id/{id}/sections` (dropdown, active only).
  - `POST /{class_id}/sections` takes a **list** body.
  - `sections/{section_id}` supports GET, PUT and DELETE.
  - Also `class-list`, `section-list`, `class-section-list`, `sections-by-class-name`, `by-class-section`.
- `/masters/subject_categories/categories` (`/dropdown`, `/{id}`). The alias `/subject-categories` supports GET and POST only.
- `/masters/subjects/`
  - `GET /` returns a **plain array** of up to 1000 subjects. `/paginated` returns `{items,total_count,has_next}`.
  - Also `dropdown`, `categories` (plain array of categories), `by-academic-year/{id}`, `categories/{id}/subjects[/dropdown]`.
- `/masters/class-subject-mappings/`: `bulk`, `by-class/{class_id}`, `by-classes?class_ids=`, `dropdown`.
- `/masters/castes/`: `dropdown`, `/{id}/sub-castes[/dropdown]`, `sub-castes/{id}`.
- `/masters/locations/`: `states`, `states/{id}/districts[/dropdown]`, `districts/{id}/mandals[/dropdown]`, `districts`, `mandals`.
- `/school-settings`: GET and PUT, plus `upload-image` and `upload-signature` (multipart field `photo`, jpg/png/webp, max 2 MB).

## Rules & gotchas
1. **Bulk CSM adds or updates; it does not replace.** Subjects missing from `subjects[]` are left untouched (`deactivated_count` is always 0), duplicate ids in a request are collapsed, and removal is a per-row update or delete. With `section_id=null` it fans out to every active section of the class. Unique indexes on (class, section, subject, year) and a class-wide one for null sections (migration 0007) prevent duplicate rows. Unknown `subject_id`s are skipped without an error.
2. **`PUT /masters/class_sections/{id}` with `sections` deletes every section of the class and re-inserts them with new IDs.** If any old section is referenced (admissions, fee mappings, timetables, CSMs) the whole update fails with 400 and nothing changes; otherwise the IDs change. Keep `sections` out of the payload and edit sections one at a time.
   - `ClassUpdate.academic_year_id` has no default, so it must be sent (omitted is 422, null is 400). `SectionUpdate.id` must be sent too.
   - A rename that clashes with another class in the same year is 400.
3. **Sections endpoints have two URL shapes.** Only `/masters/class_sections/sections/{id}` exists for GET, PUT and DELETE. Web `api/masters/classesandsections.ts` and mobile `classSectionsApi` still export `/{classId}/sections/{sectionId}` variants that return 404, so don't use them. Also, `POST /{class_id}/sections` expects a JSON **array** (a single object is 422), while mobile `classSectionsApi.createSection` sends a single object.
4. **List endpoints default `active_only=true`.** Academic years, holidays and subjects default to true, and the class/section dropdowns filter on `is_active`. Management screens must pass `active_only=false`, as web and mobile do, or they only show the active year. `read_all` is the exception (rule 6).
5. **Backend dropdowns and the academic-year list are cached in memory for 5 minutes** (`@cache_dropdown`, a `TTLCache` keyed by the tenant id from the session).
   - The cache lives in each process, so other workers see stale data until the TTL expires.
   - Writes in the same process invalidate by key substring, and a pattern passed as the cache type (`invalidate_cache("castes_dropdown")`, `states_`/`districts_`/`mandals_` with a trailing UUID) is mapped to the dropdown cache, so create, update and delete of years, classes, sections, categories, subjects, castes and locations show up immediately on that worker.
6. **`GET /masters/class_sections/read_all`** takes `academic_year_id` and `active_only` (default false), orders by name, and returns `[]` when nothing matches.
7. **Name mismatches between backend and clients.**
   - Subjects: backend `short_code`/`category` vs web `code`/`subject_category`. `fetchSubjects` maps them and handles both the array and `{items}` shapes.
   - Academic years: the field is `title`, not `name`. Web `fetchPaginatedAcademicYears` ignores `total_count` and estimates the total from the page size.
   - Dropdown items: always `{id, name}` (years use `{id, title}`). Mobile `getClassSectionsDropdown`/`getHolidaysDropdown` are typed `{id,label}`, which is wrong.
8. **`SubjectRead.category` is required.** A subject with a null `category_id` (the column is nullable) breaks every subject response with a 500. Always set a category.
9. **Uniqueness depends on which layer checks it.**
   - Classes and subjects are unique per academic year (`tenant_id, academic_year_id, name`, migration 0006); `subject_categories.name` is unique per tenant. Sections are unique per class (`tenant_id, class_id, name`, migration 0005), so every class can have its own A, B, C. Lookups by class name alone (`sections-by-class-name`, `by-class-section`) are ambiguous when a name exists in several years and take the first match.
   - The services check class and subject names per academic year before insert and on update; subject short codes are checked per year by the service only. Category names are compared case-sensitively.
   - Section names repeat across classes (the web generates A-D for every class); a Section row belongs to one class through `class_id`, there is no shared mapping table. Renaming a section to a sibling's name is 400.
10. **A CSM created with a null section** (single `POST /` with no `section_id`) is a class-level row.
    - A partial unique index on (tenant, class, subject, year) where `section_id IS NULL` prevents duplicates of it.
    - `GET /dropdown` returns it with `section_name: null`.
    - The timetable editor treats `section_id == null` as "applies to every section".
    - Prefer the bulk endpoint.
    - Without `section_id`, `GET /by-class/{class_id}` (and `/by-classes`) returns one row per section mapping, so a subject repeats. Dedupe by `subject_id` when you need the class's subject list.
11. **School settings `PUT` is a full replace** of the text fields: omitted fields (or an empty body) become null. `image_url` and `principal_signature_url` are only changed through the upload endpoints, which write `media/{tenant_id}/school/{images,signatures}/school_<field>.<ext>`; re-uploading with another extension leaves the old file on disk.
12. **The web "School Registration" menu item is injected on the client** under Masters (`web/src/lib/menuUtils.ts` `injectSchoolSettings`). It is hidden for teacher and student roles, and mobile strips it the same way.
13. **Web dropdown-system configs are partly stale.** Only `ClassesDropdown` and `SectionsByClassDropdown` are used.
    - `SectionsByClassDropdown` uses the `useSectionsByClassId` hook because the backend takes a path parameter.
    - The `SECTIONS_BY_CLASS`, `SUBJECTS`, `SUBJECT_CATEGORIES` and `HOLIDAYS` entries in `constants/dropdown/endpoints.ts` point at wrong URLs or wrong `dataPath`/`labelField`. Fix an entry before you use it.
14. **Mobile `CustomDropdown`** (react-native-element-dropdown) crashes on search if any option's `label` is `undefined`. Always map with a fallback: `label: x.name || ''`.
15. **Dropdown `value` props on web** take `string | number | undefined`; pass `val ?? undefined`, never `null`.
16. **Web classes page gate.** `web/src/pages/masters/classesandsections.tsx` loads classes and their sections with `classes:list` alone; `sections:list` is not required.

## Web / mobile parity
- Web only:
  - Inline table editing via `MasterPage`.
  - Inline category popover.
  - Admin login activates the chosen year; mobile only scopes the session.
- Mobile only:
  - A Locations screen (`app/masters/locations.tsx`). It calls a flat `/masters/locations/` that does not exist (the backend only has `states`/`districts`/`mandals`), so it is broken.
  - A Roles & Permissions screen under masters. The hub's fallback list (Parents, Locations, Roles and the rest) is used only when the backend menu hasn't loaded, and is filtered by the user's read/list permissions.
- Subjects: mobile sends `is_practical` and `description`, and the backend ignores both.
- Classes & Sections: web shows a Class -> Sections tree, while mobile shows a flattened list and its add-section call sends an object instead of the expected list (rule 3).
- Caste/sub-caste and state/district/mandal have **no management UI on either client**. Data is seeded or entered through the API.

## Known gaps
- Academic years and holidays have no overlap check.
- School logo and signature URLs point at `/media/{tenant_id}/...`, and in strict tenant mode a `/media/...` request with no `cschema` header and no bearer token is rejected (400 in the current middleware), so a plain `<img>` tag cannot load them (see `architecture.md`).
- `PUT /school-settings` (in the endpoint) and the upload service use `commit()` -> `refresh()`, which is against the repo rule.
- Mobile Locations screen and mobile add-section are broken (see parity above).
- There are two copies of the bulk-mapping API and hook on web:
  - The duplicate `createBulkClassSubjectMappings` in `web/src/api/masters/subjects.ts` posts to `/class-subject-mappings/` (missing `/masters`). It is wrapped by a duplicate `useCreateBulkClassSubjectMappings` in `api/hooks/masters/subjects.ts`.
  - Only the pair in `api/masters/classsubjectmappings.ts` / `api/hooks/masters/classsubjectmappings.ts` is correct, and that is the one the modal uses.
- UI defects found by the UI automation run (details and case IDs in `docs/features/masters.md`, Known gaps 20 to 24):
  - UI-MST-01: web Add Academic Year dialog closes even when the save fails.
  - UI-MST-02: mobile ignores the academic year chosen at sign-in.
  - UI-MST-20: web bulk mapping dialog numbers subjects 1, 3, 5 when picked one at a time.
  - UI-MST-21: mobile "Select Class" picker opens behind the "Add Subject Mappings" sheet.
  - UI-MST-30: School Email relies on native browser validation; the inline errors do not show for "bad".
- Tests leave rows behind because some masters cannot be removed through the API: subjects (deactivate only), the school settings row, and Parent-role users created with parents.
