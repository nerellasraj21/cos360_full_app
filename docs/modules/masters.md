# Masters
Tenant reference data that every other module hangs off: academic years, classes and sections, subject categories, subjects, class-subject mappings, caste/location lookups, school settings, and the dropdowns that consume them.
_Last verified against code: 2026-09-29_
Flows, decisions, and feature map: [graph view](../graph/views/masters.md) (source: docs/graph/graph.jsonl).

Holidays and timetable are also mounted under masters. They are documented in [timetable-calendar](timetable-calendar.md). Staff, designations and parents are covered in [staff](staff.md) and [students](students.md), and transport masters in [transport](transport.md).

## What it does
- **Academic year**: has a `title` (unique), a start and end date, and `is_active`. Classes, subjects, class-subject mappings, holidays, fee setup and admissions are all scoped to a year.
  - **Only one year can be active.** Creating a year with `is_active=true`, or updating one to `is_active=true`, deactivates every other year.
  - When an admin logs in on web, the year they chose is activated on the backend (`web/src/api/auth.ts`, `PUT /masters/academic_years/{id}` with `is_active:true`). So the active year is effectively "the year the last admin logged into".
- **Classes and sections**: a class (`name`, `short_code`, `academic_year_id`, `is_active`) contains sections. On web, a new class is created together with its sections in one call (the modal generates letters, e.g. A–D). Sections can be added, edited or deleted one at a time afterwards.
- **Subject categories**: a flat list of names shared by the whole tenant, with no academic year. On web a category can be created inline from the subject form (`CreateCategoryPopover`, shown only with `subject_categories:create`).
- **Subjects**: `name`, `short_code`, `category_id` and `academic_year_id`. The service rejects a duplicate name or duplicate short code within the same academic year.
- **Class-subject mappings (CSM)**: say which subjects a class+section studies in a year, with an `order` and an `exclude_marks` flag (the subject is taught but left out of marks totals). The timetable subject picker and exam subject configuration (`GET /by-classes`) read these mappings.
- **Lookup masters**: castes with sub-castes, and states → districts → mandals. They feed the student admission form's cascading dropdowns, where changing a parent value clears its children.
  - Castes live in the tenant schema and are seeded once per tenant by an Admin via `POST /auth/seed/caste-data` (an empty caste dropdown means it was never run). States/districts/mandals live in the **public** schema, shared by all tenants, seeded once via the unauthenticated `POST /auth/seed/location-data`.
  - Salary ranges (`/parents/salary-ranges/dropdown`) and admission types (`/students/admission/admission-types/dropdown`) are fixed backend lists, not editable masters. They return `{value, label}` (salary ranges also include `display`) instead of `{id, name}`.
- **School settings**: a single row per tenant with name, contacts, address, board, academic-year label, logo and principal signature. The web menu calls it "School Registration".
- **Delete semantics** differ by entity:
  - Academic year: `DELETE` only deactivates. `DELETE /{id}/permanent` hard-deletes, and is blocked while admissions, fee mappings, fee types or CSMs reference the year.
  - Class: hard-deleted together with its sections. Blocked if admissions, fee class or student mappings, CSMs, or section-level admissions, fee mappings or timetables exist.
  - Section: hard-deleted. A foreign-key violation comes back as 400 "deactivate it instead".
  - Subject: `DELETE` is a soft deactivate (204).
  - Category: hard-deleted. Blocked while any subject uses it.
  - CSM: hard-deleted.
  - Caste: blocked while students or sub-castes reference it.
  - State and district: blocked while children exist.
- **Who can do what**: every endpoint runs the two-layer check `check_role_plan_permission_with_error(resource, action)` (see [permissions](../permissions.md)). Resources are `academic_years`, `classes` (adding sections to an existing class uses `sections:create`), `subject_categories`, `subjects`, `class_subject_mappings`, `castes`, `locations` and `school_settings`. Admin gets full CRUD; the other roles get read/list.

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Models | `backend/app/models/masters/` (`academic_year_model`, `class_model`, `sections_model`, `subject*_model`, `class_subject_mapping_model`, `caste_model`, `location/`, `school_settings_model`) | — | — |
| Schemas / types | `backend/app/schemas/masters/` | `web/src/types/masters/`, `web/src/types/schoolSettings.ts` | `mobile/src/types/`, inline types in `mobile/src/api/masters.ts` |
| Services | `backend/app/service/masters/` | — | — |
| Endpoints / API | `backend/app/api/v1/masters/` | `web/src/api/masters/`, `web/src/api/schoolSettings.ts`, `web/src/constants/api/masters/` | `mobile/src/api/masters.ts`, `mobile/src/api/schoolSettings.ts` |
| Hooks | — | `web/src/api/hooks/masters/`, `web/src/hooks/masters/` | `mobile/src/api/hooks/masters/` |
| UI | — | `web/src/pages/masters/` (generic `common/MasterPage.tsx`), `web/src/components/masters/`, `web/src/pages/settings/SchoolSettings.tsx`, routes `web/src/routes/_app/masters/`, `/settings/school` | `mobile/app/masters/`, hub `mobile/app/(tabs)/masters.tsx`, `mobile/app/admin/school-settings.tsx` |
| Dropdowns | `@cache_dropdown` in `backend/app/tools/cache_utils.py` | `web/src/components/dropdown-system/`, `web/src/components/dropdown/`, `web/src/constants/dropdown/endpoints.ts` | `mobile/components/ui/dropdown.tsx` (`CustomDropdown`) |
| Year selection | public `GET /auth/academic-years` | `web/src/lib/academicYearStore.ts` | `mobile/contexts/AcademicYearContext.tsx` |

Endpoint prefixes (all under `/api/v1`). Note that the naming is inconsistent (underscores, hyphens and nesting); always copy the exact prefix:
- `/masters/academic_years/`: `dropdown`, `active`, `/{id}/permanent`.
- `/masters/class_sections/`
  - `read_all`, `dropdown` (active only), `by_class_id/{id}`, `by_class_id/{id}/sections` (dropdown, active only).
  - `POST /{class_id}/sections` takes a **list** body.
  - `sections/{section_id}` supports GET, PUT and DELETE.
  - Also `class-list`, `section-list`, `class-section-list`, `by-class-section`.
- `/masters/subject_categories/categories` (`/dropdown`, `/{id}`). The alias `/subject-categories` supports GET and POST only.
- `/masters/subjects/`
  - `GET /` returns a **plain array** of up to 1000 subjects. `/paginated` returns `{items,total_count,has_next}`.
  - Also `dropdown`, `by-academic-year/{id}`, `categories/{id}/subjects[/dropdown]`.
- `/masters/class-subject-mappings/`: `bulk`, `by-class/{class_id}`, `by-classes?class_ids=`, `dropdown`.
- `/masters/castes/`: `dropdown`, `/{id}/sub-castes[/dropdown]`, `sub-castes/{id}`.
- `/masters/locations/`: `states`, `states/{id}/districts[/dropdown]`, `districts/{id}/mandals[/dropdown]`, `districts`, `mandals`.
- `/school-settings`: GET and PUT, plus `upload-image` and `upload-signature` (multipart field `photo`).

## Rules & gotchas
1. **Bulk CSM replaces the set; it does not append.** Any subject missing from `subjects[]` for that class+section+year is set to `is_active=false`. The web "Add mappings" modal does not preload existing mappings, so submitting two new subjects deactivates every other mapping for those sections. Unknown `subject_id`s are skipped without an error.
2. **`PUT /masters/class_sections/{id}` with `sections` deletes every section of the class and re-inserts them with new IDs.** That breaks admissions, fee mappings and timetables that point at the old IDs, or fails on the foreign key. Keep `sections` out of the payload and edit sections one at a time. `ClassUpdate.academic_year_id` has no default, so it must be sent (it may be null). `SectionUpdate.id` must be sent too.
3. **Sections endpoints have two URL shapes.** Only `/masters/class_sections/sections/{id}` exists for GET, PUT and DELETE. Web `api/masters/classesandsections.ts` still exports `/{classId}/sections/{sectionId}` variants that return 404, so don't use them. Also, `POST /{class_id}/sections` expects a JSON **array**, while mobile `classSectionsApi.createSection` sends a single object.
4. **List endpoints default `active_only=true`.** Academic years, holidays and subjects default to true, and the class/section dropdowns filter on `is_active`. Management screens must pass `active_only=false`, as web and mobile do, or they only show the active year.
5. **Backend dropdowns and the academic-year list are cached in memory for 5 minutes** (`@cache_dropdown`, a `TTLCache` keyed by `current_schema()`).
   - The cache lives in each process, so other workers see stale data until the TTL expires.
   - Invalidation is by key substring, and several invalidations are no-ops: `invalidate_cache("castes_dropdown")` and the `states_`/`districts_`/`mandals_` variants pass a pattern as the cache *type*. Section update/delete and subject update/deactivate do not invalidate at all.
   - Expect up to 5 minutes of stale dropdowns after edits.
6. **`GET /masters/class_sections/read_all` ignores `academic_year_id`.** Web sends it, but the endpoint doesn't pass it on, so classes from every year come back. If there are no classes, it returns 400 (a wrapped 404) rather than `[]`.
7. **Name mismatches between backend and clients.**
   - Subjects: backend `short_code`/`category` vs web `code`/`subject_category`. `fetchSubjects` maps them and handles both the array and `{items}` shapes.
   - Academic years: the field is `title`, not `name`.
   - Dropdown items: always `{id, name}` (years use `{id, title}`). Mobile `getClassSectionsDropdown`/`getHolidaysDropdown` are typed `{id,label}`, which is wrong.
8. **`SubjectRead.category` is required.** A subject with a null `category_id` (the column is nullable) breaks every subject response with a 500. Always set a category.
9. **Uniqueness depends on which layer checks it.**
   - The models declare `unique=True` on `classes.name`, `sections.name`, `subjects.name` and `subject_categories.name`.
   - The service only checks subject name and short code *per academic year*. Category names are compared case-sensitively.
   - Section names are meant to repeat across classes (the web generates A–D for every class). Treat global uniqueness as unverified in tenant schemas, which are cloned from `cos360_master`, before relying on either behaviour.
10. **A CSM created with a null section** (single `POST /` with no `section_id`) is a class-level row.
    - Postgres unique constraints treat NULLs as distinct, so duplicates are possible.
    - `GET /dropdown` fails validation for such rows (`section_name: str`).
    - The timetable editor treats `section_id == null` as "applies to every section".
    - Prefer the bulk endpoint.
    - Without `section_id`, `GET /by-class/{class_id}` (and `/by-classes`) returns one row per section mapping, so a subject repeats. Dedupe by `subject_id` when you need the class's subject list.
11. **`GET /masters/subjects/categories` is broken.** It declares `list[dict]` but returns a paginated dict. Use `/masters/subject_categories/categories/dropdown`.
12. **School settings `PUT` is a full replace** of the text fields: omitted fields become null. `image_url` and `principal_signature_url` are only changed through the upload endpoints.
13. **The web "School Registration" menu item is injected on the client** under Masters (`web/src/lib/menuUtils.ts` `injectSchoolSettings`). It is hidden for teacher and student roles, and mobile strips it the same way.
14. **Web dropdown-system configs are partly stale.** Only `ClassesDropdown` and `SectionsByClassDropdown` are used.
    - `SectionsByClassDropdown` uses the `useSectionsByClassId` hook because the backend takes a path parameter.
    - The `SECTIONS_BY_CLASS`, `SUBJECTS`, `SUBJECT_CATEGORIES` and `HOLIDAYS` entries in `constants/dropdown/endpoints.ts` point at wrong URLs or wrong `dataPath`/`labelField`. Fix an entry before you use it.
15. **Mobile `CustomDropdown`** (react-native-element-dropdown) crashes on search if any option's `label` is `undefined`. Always map with a fallback: `label: x.name || ''`.
16. **Dropdown `value` props on web** take `string | number | undefined`; pass `val ?? undefined`, never `null`.

## Web / mobile parity
- Web only:
  - Inline table editing via `MasterPage`.
  - Inline category popover.
  - Admin login activates the chosen year; mobile only scopes the session.
- Mobile only:
  - A Locations screen (`app/masters/locations.tsx`). It calls a flat `/masters/locations/` that does not exist (the backend only has `states`/`districts`/`mandals`), so it is broken.
  - A Roles & Permissions screen under masters. The hub's fallback list also includes Parents, Locations and Roles, but only when the backend menu hasn't loaded.
- Subjects: mobile sends `is_practical` and `description`, and the backend ignores both.
- Classes & Sections: web shows a Class → Sections tree, while mobile shows a flattened list and its add-section call sends an object instead of the expected list (rule 3).
- Caste/sub-caste and state/district/mandal have **no management UI on either client**. Data is seeded or entered through the API.

## Known gaps
- Academic years and holidays have no start ≤ end check and no overlap check.
- `update_class_with_sections` catches every exception and returns 400 with the text "Error fetching classes…". Real 404s are masked the same way in `get_class_with_sections`.
- School logo and signature uploads are written to `media/school/{images,signatures}/school_<field>.<ext>`. That path is **not tenant-scoped**, so every tenant overwrites the same file. `PUT /school-settings` also uses `commit()` → `refresh()`, which is against the repo rule.
- Mobile Locations screen and mobile add-section are broken (see parity above).
- There are two copies of the bulk-mapping API and hook on web:
  - The duplicate `createBulkClassSubjectMappings` in `web/src/api/masters/subjects.ts` posts to `/class-subject-mappings/` (missing `/masters`). It is wrapped by a duplicate `useCreateBulkClassSubjectMappings` in `api/hooks/masters/subjects.ts`.
  - Only the pair in `api/masters/classsubjectmappings.ts` / `api/hooks/masters/classsubjectmappings.ts` is correct, and that is the one the modal uses.
