# Exam Module — Frontend Developer Guide

> COS360 School Management System
> Document Version: 3.0
> Prepared: 2026-02-25
> Updated: 2026-02-27 (v3.0 — Results flow end-to-end fixed: backend result_service rewrite, schema fields added, frontend type corrections, ResultsExamList active-exam filter fix, Compute Results button on results page, hall ticket ZIP fix — §0.13)
> Previously: v2.0 — Full module audit, Excel upload implemented, dashboard nav fixed, query param fix, absent logic fix, hall ticket download fix, backend requirements doc generated — §0.11)
> Audience: Frontend Developer
> Based On: EXAM_MODULE_IMPLEMENTATION_PLAN.md v1.0 + EXAM_MODULE_REQUIREMENTS.md v1.2 + EXAM_MODULE_BACKEND_DEV.md v1.0

---

## 0. Implementation Status (Added 2026-02-25)

### ✅ All Sprints Complete — Ready for Integration Testing

The full exam module has been implemented. All files compile without TypeScript errors.

### Files Created

#### Foundation Layer
| File | Purpose |
|------|---------|
| `src/types/exam.ts` | All TypeScript interfaces and types |
| `src/api/exam/index.ts` | API functions using project's `CAxios` (not custom axios) |
| `src/api/hooks/exam/useExam.ts` | All React Query hooks with `examKeys` factory |
| `src/lib/examStore.ts` | Zustand store with `createJSONStorage(() => sessionStorage)` |
| `src/utils/examErrorHandler.ts` | API error handler + wizard section mapper |
| `src/schemas/examSchemas.ts` | Zod validation schemas + type exports |

#### Pages (19 total)
| File | Screen | Sprint |
|------|--------|--------|
| `src/pages/exam/ExamSettings.tsx` | S01 | 1 |
| `src/pages/exam/BoardPatternSetup.tsx` | S02 | 1 |
| `src/pages/exam/ExamGradeSchemes.tsx` | S03 | 1 |
| `src/pages/exam/SubjectGradeSchemes.tsx` | S04 | 1 |
| `src/pages/exam/RemarkGradeSets.tsx` | S05 | 1 |
| `src/pages/exam/ExamList.tsx` | S06 | 2 |
| `src/pages/exam/CreateExam.tsx` | S07 | 2 |
| `src/pages/exam/ExamDetail.tsx` | S08 | 2 |
| `src/pages/exam/ExamDates.tsx` | S10 | 3 |
| `src/pages/exam/MarkPermissions.tsx` | S11 | 3 |
| `src/pages/exam/MarkEntryGrid.tsx` | S12 | 4 |
| `src/pages/exam/MarkEntrySummary.tsx` | S14 | 4 |
| `src/pages/exam/ResultsPublish.tsx` | S15 | 5 |
| `src/pages/exam/StudentResults.tsx` | S16 | 6 |
| `src/pages/exam/HallTicketEligibility.tsx` | S18 | 7 |
| `src/pages/exam/HallTicketDownload.tsx` | S19 | 7 |
| `src/pages/exam/ExamNotification.tsx` | S21 | Supporting |
| `src/pages/exam/AuditLog.tsx` | S22 | Supporting |
| `src/pages/exam/ExamDashboard.tsx` | S23 | Supporting |

#### Reusable Components (6 total)
| File | Purpose |
|------|---------|
| `src/components/exam/GradeBandEditor.tsx` | Editable grade band table |
| `src/components/exam/ClassSectionSelector.tsx` | Multi-select class/section grid |
| `src/components/exam/SubjectConfigAccordion.tsx` | Per-class subject config editor |
| `src/components/exam/ResultsTable.tsx` | Student results grid |
| `src/components/exam/EligibilityPanel.tsx` | Hall ticket eligibility table |
| `src/components/exam/HallTicketCard.tsx` | Printable hall ticket card |

#### Routes (27 files)
All under `src/routes/_app/exam/`:
- `exam.tsx` — layout
- `exam/index.tsx` — dashboard
- `exam/settings.tsx`, `exam/board-patterns.tsx`
- `exam/grading.tsx` + `grading/exam-schemes.tsx`, `grading/subject-schemes.tsx`, `grading/remarks.tsx`
- `exam/exams.tsx` + `exams/index.tsx`, `exams/create.tsx`, `exams/$id.tsx`
- `exams/$id/dates.tsx`, `exams/$id/permissions.tsx`, `exams/$id/results.tsx`, `exams/$id/audit.tsx`, `exams/$id/notify.tsx`
- `exam/marks.tsx` + nested `marks/$examId/summary.tsx`, `marks/$examId/$classId/$sectionId/$subjectConfigId.tsx`
- `exam/results.tsx` + `results/$id.tsx`
- `exam/hall-tickets.tsx` + `hall-tickets/$examId.tsx`, `hall-tickets/$examId/download.tsx`

#### Sidebar Update
`src/components/ui/sidebar.tsx` — Added icon mappings for all exam menu items (ClipboardList, Award, Ticket, Star, ListChecks, PenLine, BarChart3).

---

### Adaptations from Original Spec

| Original Spec | Actual Implementation | Reason |
|---|---|---|
| `src/services/examService.ts` with custom Axios | `src/api/exam/index.ts` using `CAxios` | Must use project's shared Axios instance for auth headers |
| `src/hooks/useExam.ts` | `src/api/hooks/exam/useExam.ts` | Matches existing hook directory convention |
| `src/stores/examStore.ts` | `src/lib/examStore.ts` | Matches existing store directory convention |
| Zustand custom storage object | `createJSONStorage(() => sessionStorage)` | Resolves TypeScript strict type error |
| `Role === 'admin'` string comparison | `role?.name === 'admin'` | `Role` is an object interface with `.name` field |
| `AcademicYear.name` | `AcademicYear.title` | Actual field name in `src/types/masters/academicyear.ts` |

### Key Type Corrections (vs. Original Spec)

| Type | Field in Spec | Actual Field |
|---|---|---|
| `StudentExamResult` | `aggregate_marks` | `total_marks_obtained` |
| `StudentExamResult` | `percentage` | `overall_percent` |
| `StudentExamResult` | `grade_label` | `overall_grade` |
| `StudentExamResult` | `gpa` | `sgpa` |
| `StudentExamResult` | `rank` | `class_rank` |
| `StudentSubjectResult` | `total_marks_obtained` | `marks_obtained` |
| `StudentSubjectResult` | `grade_label` | `subject_grade` |
| `HallTicketEligibility` | `attendance_eligible` | `attendance_ok` |
| `HallTicketEligibility` | `fee_eligible` | `fee_paid` |
| `HallTicketEligibility` | `ineligibility_reasons[]` | `ineligibility_reason` (single nullable) |

### Hook Signature Notes

Some hooks take `examId` as the hook parameter, NOT as the `mutate()` argument:
```typescript
// ✅ Correct
const computeMutation = useComputeAggregate(examId)
computeMutation.mutate(undefined)

// ❌ Wrong (examId already bound in hook)
const computeMutation = useComputeAggregate()
computeMutation.mutate(examId)
```
This applies to: `useComputeAggregate`, `usePublishResults`, `useComputeHallTickets`, `usePublishHallTickets`, `useOverrideHallTicket`, `useComputeHallTickets`.

`useHallTicketEligibility(examId)` returns `{ eligible: QueryResult, ineligible: QueryResult }` (not direct data arrays):
```typescript
const { eligible: eligibleQuery, ineligible: ineligibleQuery } = useHallTicketEligibility(examId)
const eligible = eligibleQuery.data ?? []
```

---

## 0.2 Runtime Fixes (2026-02-26)

### API URL Corrections — `src/api/exam/index.ts` (full rewrite)

All exam API URLs had a wrong `/exam/` prefix. Backend uses flat paths.

| Wrong (original) | Correct (fixed) |
|---|---|
| `/exam/settings/` | `/exam-settings` |
| `/exam/board-patterns/` | `/board-patterns` |
| `/exam/grading/exam-schemes/` | `/grade-schemes/exam` |
| `/exam/grading/subject-schemes/` | `/grade-schemes/subject` |
| `/exam/grading/remarks/` | `/remark-grades` |
| `/exam/exams/` | `/exams` |
| `/exam/exams/{id}/dates/?exam_id=` | `/exams/{examId}/dates` (examId in path) |
| `/exam/exams/{id}/marks/?exam_id=` | `/exams/{examId}/marks` (examId in path) |
| `/exam/exams/{id}/permissions/` | `/exams/{examId}/mark-permissions` |

**Grade band endpoints removed** — they don't exist on the backend. Bands are embedded in `GradeSchemeCreate.bands[]` at scheme creation time only.

### Hook Fixes — `src/api/hooks/exam/useExam.ts`

- Removed `GradeBandCreate` import and 6 grade-band mutation hooks (`useCreateExamGradeBand`, etc.)
- Fixed date/mark/permission hooks: `examId` is now extracted from the data object and passed as the first API arg (path parameter)
- `useDeleteExamDate` now takes `{ examId, dateId }` instead of a single `id`

### Page Fix — `src/pages/exam/ExamDates.tsx`

Delete call updated to match new hook signature:

```typescript
// Before
deleteMutation.mutate(deleteTarget)
// After
deleteMutation.mutate({ examId: id, dateId: deleteTarget })
```

### Sidebar Menus Seeded

The exam module menus are database-driven (`test_tenant_schema.menus` + `role_menu_permissions`). They were absent. Script `PythonWorkspace/COS360/seed_exam_menus.py` seeded 13 menus with Admin permissions:

- L0: Exam Management (`/exam`)
- L1: Exam Dashboard, Exams, Board Patterns, Grading, Mark Entry, Hall Tickets, Results, Exam Settings, Audit Log
- L2 (under Grading): Exam Grade Schemes, Subject Grade Schemes, Remark Grade Sets

Admin role ID: `2fe97570-0740-44c5-911f-9826e0258a9b` | Schema: `test_tenant_schema`

### CreateExam Dropdown Fix — `src/pages/exam/CreateExam.tsx`

**Academic Year dropdown was empty** because `fetchAndSetAcademicYears()` was never called. Fix — added the standard pattern used by all other pages:

```typescript
const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore()

useEffect(() => {
  if (academicYears.length === 0) fetchAndSetAcademicYears()
}, [academicYears.length, fetchAndSetAcademicYears])
```

**Grade Scheme "None" option was silently dropped** — the custom `Select` component in `src/components/ui/select.tsx` uses `if (itemProps.value && ...)` to extract options, so `value=""` (empty string = falsy) was skipped. Fix — sentinel value `"__none__"` used instead:

```typescript
// value prop
value={form.watch('exam_grade_scheme_id') ?? '__none__'}
onValueChange={(v) => form.setValue('exam_grade_scheme_id', v === '__none__' ? null : v)}

// item
<SelectItem value="__none__">— None —</SelectItem>
```

> **Note for future devs**: If you add a `<SelectItem value="">` anywhere in the app using the custom `Select` component, it will be silently ignored. Always use a non-empty sentinel like `"__none__"` for "clear selection" options.

### ExamDetail Infinite Render Loop — `src/pages/exam/ExamDetail.tsx`

**Root cause of "page not responding" when clicking View or any exam row.**

`setActiveExam(exam.id, exam.exam_name)` was called directly in the component render body (not in a `useEffect`). Calling a Zustand store setter during render triggers a store update → re-render → setter called again → **infinite loop** → browser tab freezes.

**Fix**: `useEffect` placed **before all early returns** with a null guard (Rules of Hooks: hooks must never appear after a conditional return):

```typescript
// Before — setter in render body → infinite loop
setActiveExam(exam.id, exam.exam_name)

// After — before early returns, guarded with if(exam)
useEffect(() => {
  if (exam) setActiveExam(exam.id, exam.exam_name)
}, [exam?.id, exam?.exam_name])

if (isLoading) return <Spinner />   // early returns come AFTER all hooks
if (!exam) return <NotFound />
```

> **Rules of Hooks to remember**:
>
> 1. Never call store setters in the render body — use `useEffect`
> 2. All hooks must appear before any conditional `return` in the component

### ExamList Missing Academic Year Fetch — `src/pages/exam/ExamList.tsx`

Same issue as CreateExam — `fetchAndSetAcademicYears()` never called. Fixed with same pattern (added `useEffect` + destructured `academicYears, fetchAndSetAcademicYears` from store).

### CreateExam Wrong Masters API URLs — `src/pages/exam/CreateExam.tsx`

Class & Sections and Subject Configuration sections showed empty because the direct `CAxios` calls used non-existent endpoints.

| Wrong URL | Correct URL |
| --- | --- |
| `/masters/classes-with-sections/` | `/masters/class_sections/read_all` |
| `/masters/class-subject-mappings/?class_id=${classId}` | `/masters/class-subject-mappings/by-class/${classId}` |

The correct URLs were found by tracing the existing masters API layer (`CLASSES_AND_SECTIONS_API_BASE = '/masters/class_sections/'` and `CLASS_SUBJECT_MAPPINGS_API_BASE = '/masters/class-subject-mappings/'`).

### ExamDashboard Academic Year Fix — `src/pages/exam/ExamDashboard.tsx`

- Added `fetchAndSetAcademicYears` `useEffect` (same pattern as all other pages)
- Dashboard was displaying raw UUID instead of year title — fixed by resolving `selectedAcademicYearId` to the full year object: `academicYears.find(y => String(y.id) === String(selectedAcademicYearId))`

### Cross-Module Integration Map

> **Backend migration applied (2026-02-26)** — `alembic upgrade head` run by backend dev. All working endpoints now resolve (200/401/422). 500s cleared.

| Exam Page | External Module | Status |
| --- | --- | --- |
| ExamList | AcademicYear store | ✅ Fixed (frontend) |
| ExamList | `/grade-schemes/exam` filter | ✅ Resolved (migration done) |
| CreateExam | AcademicYear store | ✅ Fixed (frontend) |
| CreateExam | Masters classes/subjects | ✅ Direct CAxios calls |
| MarkEntryGrid | `/exams/{id}/marks` | ✅ Resolved (migration done) |
| HallTicketEligibility | Attendance + Fee | ❌ 404 — backend endpoints not yet built (expected) |
| ResultsPublish | Compute aggregate | ❌ 404 — backend endpoints not yet built (expected) |

**Remaining 404 endpoints** (frontend pages exist, backend not yet implemented):

- `POST /exams/{id}/compute` → ResultsPublish
- `POST /exams/{id}/publish` → ResultsPublish
- `GET/POST /exams/{id}/hall-tickets/*` → HallTicketEligibility, HallTicketDownload
- `POST /exams/{id}/notify` → ExamNotification
- `POST /exams/{id}/unlock` → ExamDetail

### BoardPatternSetup Nature Dropdown Fix — `src/pages/exam/BoardPatternSetup.tsx`

Custom `Select` renders `position: absolute` — gets **clipped by Dialog overflow**. Nature column appeared stuck on "formative" and wouldn't open inside the Create/Edit dialog.

**Fix**: Replaced with native `<select>` for the nature column:

```tsx
<select
  value={form.watch(`exam_types.${index}.nature`)}
  onChange={(e) => form.setValue(`exam_types.${index}.nature`, e.target.value as any)}
  className="h-7 w-full rounded border border-input bg-background px-2 text-xs capitalize"
>
  {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
</select>
```

> **Pattern**: Custom `Select` inside any `Dialog` → use native `<select>` instead. The custom `Select` is only safe on full pages (no overflow clipping context).

### Backend Endpoint Availability

**Post-migration status (2026-02-26)** — `alembic upgrade head` applied by backend dev.

| Endpoint | Status |
| --- | --- |
| `GET/POST /exam-settings` | ✅ Live |
| `GET/POST/PUT/DELETE /board-patterns` | ✅ Live |
| `GET/POST/PUT/DELETE /grade-schemes/exam` | ✅ Live |
| `GET/POST/PUT/DELETE /grade-schemes/subject` | ✅ Live |
| `GET/POST/PUT/DELETE /remark-grades` | ✅ Live |
| `GET/POST /exams` | ✅ Live |
| `GET/PUT/DELETE /exams/{id}` | ✅ Live |
| `GET/POST/PUT/DELETE /exams/{id}/dates` | ✅ Live |
| `GET/POST /exams/{id}/marks` | ✅ Live |
| `GET/POST/DELETE /exams/{id}/mark-permissions` | ✅ Live |
| `POST /exams/{id}/compute` | ❌ 404 — not yet built |
| `POST /exams/{id}/publish` | ❌ 404 — not yet built |
| `POST /exams/{id}/unlock` | ❌ 404 — not yet built |
| `POST /exams/{id}/notify` | ❌ 404 — not yet built |
| `GET /exams/{id}/results` | ❌ 404 — not yet built |
| `GET/POST /exams/{id}/hall-tickets/*` | ❌ 404 — not yet built |

---

## 0.3 Session Fixes (2026-02-27)

### CreateExam Wizard — Multiple Bugs Fixed

#### 1. Edit Buttons in Section 5 Review Panel
**Problem**: Clicking Edit on any section in the Review panel added the target section to the open-set but the page stayed scrolled to the bottom — the user never saw it.

**Fix** (`CreateExam.tsx`): Added `editSection(num)` helper that replaces the entire set (closing Section 5) and scrolls to the top:
```typescript
const editSection = (num: Section) => {
  setOpenSections(new Set([num]))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
```
All 4 Edit buttons in Section 5 now call `editSection(N)` instead of `setOpenSections(prev => new Set([...prev, N]))`.

#### 2. Duplicate Submit Buttons
**Problem**: Both a "Save Exam" button in the bottom bar and a "Create Exam" button inside Section 5 existed.

**Fix**: Removed "Save Exam" from bottom bar and removed "Create Exam" from inside Section 5. Now only one "Create Exam" button lives in the bottom bar alongside Cancel.

#### 3. 422 Error — Blank Subject Configs Sent to Backend
**Problem**: Opening a subject accordion in Section 3 without filling it in auto-created a blank config (`component_name: ""`, `max_marks: null`). These were included in the submit payload, causing 422 Pydantic validation errors.

**Fixes**:
- `SubjectConfigAccordion.tsx`: Removed auto-create of blank config on toggle — the accordion only toggles open/closed now, no config is created until user adds data.
- `CreateExam.tsx`: Added `isBlankConfig` filter that strips unconfigured subjects before sending:
  ```typescript
  const isBlankConfig = (cfg: SubjectConfigPayload) =>
    cfg.components.length === 1 &&
    !cfg.components[0].component_name?.trim() &&
    cfg.components[0].max_marks == null &&
    cfg.subject_grade_scheme_id == null &&
    cfg.credit_hours == null
  const configsToSend = subjectConfigs.filter(cfg => !isBlankConfig(cfg))
  ```

#### 4. Validation Loop Ran Before Blank-Config Filter
**Problem**: The component validation loop (`"component name required"`, `"max marks required"`) ran on `subjectConfigs` (unfiltered), so blank configs triggered a toast and caused an early return before the filter could execute.

**Fix** (`CreateExam.tsx`): Reordered `handleSubmit` — filter blanks FIRST, then validate the remaining non-blank configs only.

#### 5. Duplicate React Key in SubjectConfigAccordion
**Problem**: `GET /masters/class-subject-mappings/by-class/${classId}` returns one row per section. A class with multiple sections yielded multiple rows with the same `subject_id`, causing React duplicate-key warnings and potential rendering glitches.

**Fix** (`CreateExam.tsx`): Deduplicated using `new Map()` keyed by `subject_id`:
```typescript
[classId]: Array.from(
  new Map((r.data ?? []).map((m: any) => [m.subject_id, { id: m.subject_id, name: m.subject_name }])).values()
)
```

#### 6. Post-Creation Navigation
**Fix**: After successful exam creation, navigation goes to `/exam/exams` (the list) instead of the exam detail page. The user immediately sees the new exam in the refreshed list.

---

### Backend Fixes (`app/api/v1/exam/exam_endpoints.py`)

#### JWT User ID Key Mismatch — 500 TypeError
**Problem**: `exam_endpoints.py` used `current_user.get('id')` but the JWT payload stores the user ID under `"sub"` (per JWT standard, set by `multi_tenant_auth_service.py`). This returned `None` → `uuid.UUID(None)` → `TypeError` → 500.

**Fix**: Changed all 2 occurrences:
```python
# Before
user_id = uuid.UUID(current_user.get('id'))
# After
user_id = uuid.UUID(current_user.get('sub') or current_user.get('id'))
```

> **Note for devs**: The JWT payload uses `"sub"` for user ID. Always use `current_user.get('sub')` in backend endpoints.

#### Unique Constraint — 409 instead of 500
**Problem**: Creating an exam with a name that already exists for the same academic year caused an SQLAlchemy `IntegrityError` (constraint `uq_exam_name_academic_year`) that bubbled up as an unhandled 500.

**Fix**: Added `IntegrityError` catch around `create_full_exam`:
```python
from sqlalchemy.exc import IntegrityError

try:
    result = await create_full_exam(db, payload, created_by=user_id)
    await db.commit()
except IntegrityError as e:
    await db.rollback()
    if 'uq_exam_name_academic_year' in str(e.orig):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An exam named '{payload.exam.exam_name}' already exists for this academic year."
        )
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e.orig))
return result
```

---

### Exam Not Appearing in List After Creation
**Problem**: After successful creation, the exam was not visible in `ExamList` or `ExamDashboard`.

**Root cause**: `useCreateExamFull.onSuccess` invalidated only `examKeys.lists()` = `['exams', 'list']`. This should prefix-match `['exams', 'list', {filters}]` in React Query v5, but combining it with navigation to the detail page meant the list was never refetched while the user was on it.

**Fix** (`useExam.ts`): Changed to `examKeys.all` = `['exams']` — broader invalidation covering both the list and the dashboard in one call:
```typescript
// Before
queryClient.invalidateQueries({ queryKey: examKeys.lists() })
// After
queryClient.invalidateQueries({ queryKey: examKeys.all })
```
Combined with the navigation fix above (navigate to list, not detail), the exam now appears immediately.

---

### Mark Entry Submodule — MarkEntrySummary Rebuilt

**Problem**: `MarkEntrySummary.tsx` was a static placeholder — it showed a message saying "Navigate to a specific mark entry grid from the exam detail page" with no actual navigation UI. The entire Mark Entry submodule showed nothing useful.

**New `MarkEntrySummary.tsx`**: Fetches the exam's class-sections and subject-configs, then renders a grouped table. Each row is a subject for a class-section, clickable to navigate to the mark entry grid.

#### New API Functions Added — `src/api/exam/index.ts`
```typescript
export const getExamClassSections = async (examId: string): Promise<ExamClassSection[]> =>
  (await CAxios.get(`/exams/${examId}/class-sections`)).data

export const getExamSubjectConfigs = async (examId: string): Promise<ExamSubjectConfig[]> =>
  (await CAxios.get(`/exams/${examId}/subject-configs`)).data
```

> **Backend requirement**: These endpoints must exist — `GET /exams/{exam_id}/class-sections` and `GET /exams/{exam_id}/subject-configs`. If they return 404, the mark entry page will show an empty state.

#### New React Query Hooks Added — `src/api/hooks/exam/useExam.ts`
```typescript
export function useExamClassSections(examId: string) { ... }
export function useExamSubjectConfigs(examId: string) { ... }
```

#### MarkEntryGrid Improvements — `src/pages/exam/MarkEntryGrid.tsx`
- Subtitle now shows class/section name + subject name (resolved from the fetched data) instead of raw UUIDs
- Column headers now show component names (resolved from subject config) instead of truncated UUIDs
- `sectionId === 'null'` string is resolved to `''` for the API call (navigation uses `'null'` as the URL segment when there's no section)
- `scheduleAutoSave` signature simplified (removed unused `compId` param)

#### Mark Entry Navigation Path
```
ExamDetail (Marks tab) → "View Summary" → MarkEntrySummary (class/subject list)
  → click row → MarkEntryGrid at /exam/marks/{examId}/{classId}/{sectionId}/{subjectConfigId}
  (sectionId = 'null' string when no section)
```

---

## 0.4 Session Fixes (2026-02-27 — continued)

### ExamList: Missing `exam_type` Column — `src/pages/exam/ExamList.tsx`

**Problem**: The exam list table showed Exam Name, Board, Level, Nature, Status, Deadline. The `exam_type` field (e.g. "Term 1", "FA-1", "SA-1", "Annual Exam") was present in `ExamListItem` and visible on ExamDashboard cards and ExamDetail subtitle — but missing from the ExamList table.

**Fix**: Added a "Type" column between Board and Level:

```tsx
// Header
<th className="px-4 py-3 text-left font-medium">Type</th>

// Cell
<td className="px-4 py-3 text-muted-foreground">{exam.exam_type}</td>
```

---

### ExamDetail: Configured Subjects Panel — `src/pages/exam/ExamDetail.tsx`

**Problem**: The Overview tab showed only metadata cards (Academic Year, Deadline, Hall Ticket, etc.). There was no way to see which subjects were configured for the exam without navigating to Mark Entry.

**Fix**: Added a "Configured Subjects" panel below the metadata cards in the Overview tab. The panel:

- Uses `useExamClassSections(id)` and `useExamSubjectConfigs(id)` (hooks added in §0.3)
- Groups subjects by class-section, showing class/section label as a row header
- Displays subject names as badges (falls back to `subject_id` if name not returned)
- Shows a short muted note if the backend endpoints aren't yet implemented (404)

**New imports added to ExamDetail**:

```typescript
import { useExamClassSections, useExamSubjectConfigs } from '@/api/hooks/exam/useExam'
```

**New hook calls added** (before early returns, after existing hooks):

```typescript
const { data: classSections = [], isError: sectionsError } = useExamClassSections(id)
const { data: subjectConfigs = [], isError: configsError } = useExamSubjectConfigs(id)
```

**Backend requirement**: Same two endpoints as MarkEntrySummary:

- `GET /exams/{exam_id}/class-sections` → returns `ExamClassSection[]` with `class_name`, `section_name`
- `GET /exams/{exam_id}/subject-configs` → returns `ExamSubjectConfig[]` with `subject_name`, nested `components[]`

✅ **Both endpoints are now live on the backend** (confirmed 2026-02-27). The developer note in the UI will not appear once the data is fetched successfully.

---

## 0.5 Session Fixes (2026-02-27 — grading module bugs)

### RemarkGradeSets: Options Not Saved on Update — `src/pages/exam/RemarkGradeSets.tsx`

**Problem**: `onSubmit` only passed `{ name: data.name }` to the update mutation, silently discarding all option changes. The API function and hook type were also restricted to `{ name: string }`.

**Fix** — three files changed:

1. `src/api/exam/index.ts` — `updateRemarkGradeSet` now accepts `{ name: string; options?: RemarkGradeOptionCreate[] }`:

```typescript
export const updateRemarkGradeSet = async (
  id: string,
  data: { name: string; options?: RemarkGradeOptionCreate[] },
): Promise<RemarkGradeSet> => {
  const response = await CAxios.put(`/remark-grades/${id}`, data)
  return response.data
}
```

1. `src/api/hooks/exam/useExam.ts` — `useUpdateRemarkGradeSet` hook type updated to include options.

1. `src/pages/exam/RemarkGradeSets.tsx` — `onSubmit` now sends full data:

```typescript
// Before — options silently dropped
updateMutation.mutate({ id: editTarget.id, data: { name: data.name } }, ...)

// After — options included
updateMutation.mutate({ id: editTarget.id, data: { name: data.name, options: data.options } }, ...)
```

---

### Grade Scheme Edit Not Saving — `SubjectGradeSchemes.tsx` and `ExamGradeSchemes.tsx`

**Problem**: `openEdit` mapped band fields without null guards. If the backend returns `null` for any required numeric field (`gpa`, `sort_order`, `from_percent`, `to_percent`, `grade_label`), Zod validates it as invalid. Zod's per-element array errors (`bands[0].gpa.message`) are NOT displayed in the UI — only the array-level message is shown. So the form silently refuses to submit, appearing to the user as "Save button does nothing".

**Fix** (`openEdit` in both files) — added `?? fallback` for all required numeric and string fields:

```typescript
bands: (scheme.bands ?? []).map(b => ({
  from_percent: b.from_percent ?? 0,
  to_percent:   b.to_percent ?? 100,
  from_marks:   b.from_marks ?? null,
  to_marks:     b.to_marks ?? null,
  grade_label:  b.grade_label ?? '',
  gpa:          b.gpa ?? 0,
  remarks:      b.remarks ?? null,
  is_pass:      b.is_pass ?? true,
  sort_order:   b.sort_order ?? 0,
}))
```

---

### React Fragment Key Warnings — All Three Grading Pages

**Problem**: All three grading list tables used `<>` (keyless Fragment) as the outer element in `.map()`, with `key` on the inner `<tr>` instead. React requires the key on the outermost mapped element.

**Fix** (in `ExamGradeSchemes.tsx`, `SubjectGradeSchemes.tsx`, `RemarkGradeSets.tsx`):

```tsx
// Before
{items.map(item => (
  <>
    <tr key={item.id} ...>

// After
{items.map(item => (
  <Fragment key={item.id}>
    <tr ...>
```

---

## 0.6 Session Fixes (2026-02-27 — routing, subject names, dates tab)

### Critical Routing Bug: `$id/dates` (and other sub-pages) Never Rendered

**Problem**: `src/routes/_app/exam/exams/$id.tsx` rendered `<ExamDetail />` directly. In TanStack Router, this made `$id.tsx` a terminal route with no `<Outlet />`. All child routes (`$id/dates.tsx`, `$id/permissions.tsx`, `$id/results.tsx`, `$id/audit.tsx`, `$id/notify.tsx`) were registered as children in the route tree but their components were never rendered because the parent had no Outlet. Navigating to `/exam/exams/$id/dates` would silently stay on ExamDetail — ExamDates never appeared.

**Fix** — two files changed:

1. `src/routes/_app/exam/exams/$id.tsx` → converted to layout route:

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
export const Route = createFileRoute('/_app/exam/exams/$id')({ component: RouteComponent })
function RouteComponent() { return <Outlet /> }
```

2. **Created** `src/routes/_app/exam/exams/$id/index.tsx` → now the ExamDetail page:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import ExamDetail from '@/pages/exam/ExamDetail'
export const Route = createFileRoute('/_app/exam/exams/$id/')({ component: RouteComponent })
function RouteComponent() { return <ExamDetail /> }
```

This matches the pattern used by `exams.tsx` (layout) + `exams/index.tsx` (list page) elsewhere in the codebase.

---

### ExamDetail: Subject Names Showing as UUIDs — `src/pages/exam/ExamDetail.tsx`

**Problem**: `GET /exams/{id}/subject-configs` returns `ExamSubjectConfig[]` where `subject_name` is null/undefined (backend does not populate it). The UI fell back to `cfg.subject_id` — showing raw UUIDs like `3f2a7c...`.

**Fix**: Added `useSubjectsDropdown` hook (from masters module) to fetch all subjects and build an ID→name map:

```typescript
import { useSubjectsDropdown } from '@/api/hooks/masters/subjects'
// In component:
const { data: subjectsList = [] } = useSubjectsDropdown()
const subjectNameMap = Object.fromEntries(subjectsList.map(s => [s.id, s.name]))
// In JSX:
{cfg.subject_name ?? subjectNameMap[cfg.subject_id] ?? cfg.subject_id}
```

Same fallback chain applied in the inline Dates tab (for `d.subject_id → subjectNameMap → raw id`).

---

### ExamDetail: "Manage Dates" Hidden from Non-Admin Users — `src/pages/exam/ExamDetail.tsx`

**Problem**: The Dates tab only showed a static placeholder text "Click Manage Dates..." with the button wrapped in `{isAdmin && ...}`. Non-admin users saw no button at all. Additionally, the routing bug above meant clicking it did nothing even for admins.

**Fix**: Replaced the placeholder Dates tab with an inline dates summary:

- `useExamDates(id)` is now called at the top of ExamDetail (hooks must all be unconditional)
- Dates are shown in a table inline within the Dates tab (subject name, class, date, time, venue)
- "Manage Dates" / "View All Dates" button is visible to **all users** (not just admins)
- Empty state shows an "Add Dates" button for admins

---

### ExamList & ExamDashboard: Subjects Column Added

**Problem**: `ExamListItem` type had no subject data. The list table and dashboard cards showed no subject information.

**Fix**: Added optional fields to `ExamListItem` in `src/types/exam.ts`:

```typescript
subject_config_count?: number
class_section_count?: number
subjects?: string[]  // if backend populates subject names in list response
```

- `ExamList.tsx` — new "Subjects" column between Type and Level: shows name badges if `exam.subjects` is populated, falls back to count text, shows `—` if neither is present (current backend behavior)
- `ExamDashboard.tsx` — `ExamCard` renders subject name badges or count text when data is available

> **Backend note**: These fields are optional and the current backend list endpoint (`GET /exams`) does not populate them. The UI degrades gracefully to `—` until the backend is updated to include subject data in the list response.

---

## 0.7 Session Fixes (2026-02-27 — UUID display fixes, deadline backend note)

### ExamDetail: Academic Year, Class Names, Subject Names Showing as UUIDs

**Problem**: Three UUID display issues visible in the ExamDetail overview:

1. **Academic Year card** showed raw UUID (`bb30dcea-...`) — `Exam` type only has `academic_year_id`, no title field.
2. **Class section label** in Configured Subjects showed UUID when `class_name` is `null` in the API response — `ExamClassSection.class_name` is optional and the backend does not always populate it.
3. **Subject badge** showed UUID — `useSubjectsDropdown()` with no params may exclude inactive subjects; subject not found in the map.

**Fix** — `src/pages/exam/ExamDetail.tsx`:

```typescript
// Added imports
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections'
import { useAcademicYearStore } from '@/lib/academicYearStore'

// Added store access
const { academicYears } = useAcademicYearStore()

// Added hooks (unconditional, before early returns)
const { data: subjectsList = [] } = useSubjectsDropdown({ active_only: false })  // was: no params
const subjectNameMap = Object.fromEntries(subjectsList.map(s => [s.id, s.name]))
const { data: classesList = [] } = useClassSectionsDropdown()
const classNameMap = Object.fromEntries(classesList.map(c => [c.id, c.name]))
const sectionNameMap = Object.fromEntries(classesList.flatMap(c => c.sections.map(s => [s.id, s.name])))
```

**Academic Year card** (was `{exam.academic_year_id}`):

```tsx
{academicYears.find(y => String(y.id) === String(exam.academic_year_id))?.title ?? exam.academic_year_id}
```

**Class section label** (was `cs.class_name || cs.class_id`):

```typescript
const csLabel = [
  cs.class_name ?? classNameMap[cs.class_id],
  cs.section_name ?? (cs.section_id ? sectionNameMap[cs.section_id] : null),
].filter(Boolean).join(' – ') || cs.class_id
```

**Dates tab class column** similarly updated with `classNameMap` / `sectionNameMap` lookups.

---

### ExamList: Deadline Column Shows `—` for All Exams — Backend Issue

**Problem**: The "Deadline" column in ExamList shows `—` for every exam even when `mark_entry_deadline` is set during exam creation.

**Frontend code** (`ExamList.tsx`) is correct:

```tsx
<td className="px-4 py-3 text-muted-foreground">
  {exam.mark_entry_deadline ?? '—'}
</td>
```

**Root cause**: The backend's `GET /exams` list endpoint does **not** include `mark_entry_deadline` in the list response. The field exists on the `Exam` detail object (`GET /exams/{id}`) but is omitted from the `ExamListItem` summary returned by the list endpoint.

**Required backend fix**: The list endpoint's response schema (`ExamListSchema` / `ExamListOut`) must include `mark_entry_deadline: Optional[date]`. This is a backend-only change — no frontend code needs to change once the backend populates the field.

> **Status**: Backend fix pending. Deadline shows `—` in the list until resolved.

---

## 0.8 Session Fixes (2026-02-27 — exam creation 422 fix, accordion dropdowns)

### CreateExam: 422 — Subject Has `exclude_marks=true` — `src/pages/exam/CreateExam.tsx`

**Problem**: Creating an exam with certain subjects failed with:

```
POST /exams 422 Unprocessable Entity
Subject <UUID> is not mapped to class <UUID> or has exclude_marks=true
```

The `/masters/class-subject-mappings/by-class/{classId}` endpoint returns ALL subject mappings including ones with `exclude_marks=true`. These subjects are for assignments/activities (not exams) and the backend rejects them in the exam subject_configs payload.

**Fix**: Added `.filter((m: any) => !m.exclude_marks)` when building the subjects list:

```typescript
// Before
new Map((r.data ?? []).map((m: any) => [m.subject_id, { id: m.subject_id, name: m.subject_name }]))

// After
new Map(
  (r.data ?? [])
    .filter((m: any) => !m.exclude_marks)
    .map((m: any) => [m.subject_id, { id: m.subject_id, name: m.subject_name }])
)
```

Subjects with `exclude_marks=true` no longer appear in the Subject Configuration accordion and cannot be submitted to the backend.

---

### SubjectConfigAccordion: Dropdowns Not Working in Table — `src/components/exam/SubjectConfigAccordion.tsx`

**Problem**: All three `Select` dropdowns in the Subject Configuration accordion failed silently — clicking opened them but showed no options or showed options that couldn't be clicked:

1. **Entry type** (Marks / Remarks) inside the component table rows
2. **Remark grade set** inside the component table rows
3. **Grade Scheme** at subject level

**Root cause**: Radix UI's `SelectContent` uses a portal (renders to `document.body`) and uses `getBoundingClientRect()` of the trigger to position itself. Inside table `<td>` elements, the layout context causes the portal to be positioned off-screen or behind other elements. This is a known Radix UI limitation — shadcn/ui Select is not safe inside `<table>` cells.

**Fix**: Replaced all three shadcn/ui `Select` components in the accordion with native `<select>` elements. Native selects render inline, never have portal/positioning issues, and work in any context:

```tsx
// Before (broken inside table)
<Select value={comp.entry_type} onValueChange={(v) => updateComponent(...)}>
  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="marks">Marks</SelectItem>
    <SelectItem value="remarks">Remarks</SelectItem>
  </SelectContent>
</Select>

// After (works everywhere)
<select
  value={comp.entry_type}
  onChange={(e) => updateComponent(subject.id, ci, 'entry_type', e.target.value)}
  className="h-7 w-24 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
>
  <option value="marks">Marks</option>
  <option value="remarks">Remarks</option>
</select>
```

Same pattern applied to remark grade set and grade scheme selects. All shadcn/ui Select imports removed from the component.

> **Pattern rule** (extends existing CLAUDE.md guidance): Native `<select>` is required inside `<table>` cells AND inside `Dialog` components. Only use shadcn/ui `Select` on plain page layouts with no overflow or table context.

---

## 0.9 Session Fixes (2026-02-27 — edit exam, submodule index pages)

### ExamList: Edit Exam Functionality — `src/pages/exam/ExamList.tsx`

**Problem**: Exams could be created but never edited after creation. The only in-list action for admins was "View Details", "Clone Exam", and "Delete" (draft-only). There was no way to update exam metadata (name, board, level, type, nature, status, deadline) without going into the full detail page.

**Fix**: Added `EditExamDialog` subcomponent and wired "Edit Exam" into the row's DropdownMenu.

#### EditExamDialog (added before `ExamList` function)

A small self-contained form component that receives `exam: ExamListItem` and `onClose: () => void`:

```tsx
function EditExamDialog({ exam, onClose }: EditExamDialogProps) {
  const updateMutation = useUpdateExam(exam.id)  // hook param = examId
  const [form, setForm] = useState({
    exam_name: exam.exam_name,
    board: exam.board as ExamBoard,
    level: exam.level as ExamLevel,
    exam_type: exam.exam_type,
    nature: exam.nature as ExamNature,
    status: exam.status as ExamStatus,
    mark_entry_deadline: exam.mark_entry_deadline ?? '',
  })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(
      { ...form, mark_entry_deadline: form.mark_entry_deadline || null },
      { onSuccess: () => onClose() }
    )
  }
  // Form with native <select> elements (Dialog context → no shadcn/ui Select)
}
```

> **Important**: All dropdowns in the edit dialog use native `<select>` elements (not shadcn/ui `Select`) because the dialog context causes Radix UI portal positioning to fail (see §0.8 pattern rule).

#### Changes to ExamList

- Added `editTarget: ExamListItem | null` state
- Added `Edit` to lucide-react imports
- Added `ExamBoard, ExamLevel` to types imports
- Added `DropdownMenuSeparator` import
- Added `useUpdateExam` to hook imports
- Dropdown menu now shows "Edit Exam" (for admins, all statuses) above "Clone Exam"
- Delete item now has a `DropdownMenuSeparator` above it for visual separation
- Edit dialog rendered conditionally at bottom of component

---

### Results and Hall Tickets: Missing Index Pages

**Problem**: The sidebar links for "Results" and "Hall Tickets" navigate to `/exam/results` and `/exam/hall-tickets`. These are layout routes (just `<Outlet />`). Without an index route, navigating to them shows a blank page — the Outlet renders nothing because no child route matches.

**Previously**: Only `/exam/results/$id` and `/exam/hall-tickets/$examId` routes existed (specific exam pages). No index page to list available exams.

**Fix**: Created exam-picker index pages for both sections, following the established pattern from `MarkEntryExamList.tsx`.

#### New Files

| File | Purpose |
|------|---------|
| `src/pages/exam/ResultsExamList.tsx` | Exam list filtered to published/finalized/locked status — click to view results |
| `src/pages/exam/HallTicketsExamList.tsx` | Exam list filtered to non-draft exams — click to manage hall tickets |
| `src/routes/_app/exam/results/index.tsx` | Route for `/_app/exam/results/` → `ResultsExamList` |
| `src/routes/_app/exam/hall-tickets/index.tsx` | Route for `/_app/exam/hall-tickets/` → `HallTicketsExamList` |

#### Navigation Flow (Updated)

```
Sidebar: "Results"      → /exam/results        → ResultsExamList (exam picker)
                           click exam row       → /exam/results/$id → StudentResults
Sidebar: "Hall Tickets" → /exam/hall-tickets    → HallTicketsExamList (exam picker)
                           click exam row       → /exam/hall-tickets/$examId → HallTicketEligibility
                           click Download       → /exam/hall-tickets/$examId/download → HallTicketDownload
Sidebar: "Mark Entry"   → /exam/marks          → MarkEntryExamList (exam picker)  [already worked]
                           click exam row       → /exam/marks/$examId/summary → MarkEntrySummary
                           click subject row    → /exam/marks/$examId/$classId/$sectionId/$subjectConfigId → MarkEntryGrid
```

#### Status Filters

- **Results**: shows exams with `status ∈ {published, finalized, locked}`
- **Hall Tickets**: shows exams with `status !== 'draft'` (active, published, locked, finalized)
- **Mark Entry** (existing): shows exams with `status ∈ {active, draft, locked}`

---

## 0.10 Session Fix (2026-02-27 — audit log route)

### Audit Log: "Not Found" When Clicking Sidebar Item

**Problem**: The sidebar "Audit Log" menu item (seeded at path `/exam/audit`) showed "Not Found". No route file existed for this path.

The existing `AuditLog.tsx` page is a **per-exam** page — it uses `useParams({ id })` to read a specific exam's audit trail and back-navigates to `/exam/exams/${id}`. It is already correctly routed at `src/routes/_app/exam/exams/$id/audit.tsx`. But there was no top-level entry point for the sidebar.

**Fix**: Created the same exam-picker pattern used by Mark Entry, Results, and Hall Tickets.

#### New Files

| File | Purpose |
|------|---------|
| `src/pages/exam/AuditLogExamList.tsx` | Exam list — all exams for the academic year — click to view that exam's audit log |
| `src/routes/_app/exam/audit.tsx` | Route for `/_app/exam/audit` → `AuditLogExamList` |

#### Navigation Flow

```
Sidebar: "Audit Log" → /exam/audit → AuditLogExamList (exam picker)
                        click exam row → /exam/exams/$id/audit → AuditLog (per-exam activity history)
```

> Unlike Results (filters published+) and Hall Tickets (filters non-draft), the Audit Log exam picker shows **all exams** — audit history is useful at any stage.

---

## 0.11 Full Module Audit + Deployment Fixes (2026-02-27 — v2.0)

### Architect + Backend Audit Findings

A comprehensive dual-agent audit (frontend + backend) was performed. See `AI_GOVERNANCE/handovers/EXAM_MODULE_BACKEND_REQUIREMENTS.md` for the complete backend requirements document to hand to the backend developer.

### Frontend Fixes Applied

#### 1. ExamDashboard Quick Links — `src/pages/exam/ExamDashboard.tsx`
All 4 quick links pointed to `/exam/exams`. Fixed to correct paths:
- Mark Entry → `/exam/marks`
- Results → `/exam/results`
- Hall Tickets → `/exam/hall-tickets`
- Settings → `/exam/settings` (was already correct)

#### 2. listExams Query Param Bug — `src/api/exam/index.ts`
Frontend was sending `?status=draft` but backend expects `?exam_status=draft`. The status filter in ExamList never worked because of this mismatch. Fixed by remapping `status` → `exam_status` before sending to API.

#### 3. Excel Template Download + Upload — `src/pages/exam/MarkEntryGrid.tsx`
Template and Upload buttons existed but had **no click handlers**. Fully implemented:
- **Template**: calls `GET /exams/{id}/marks/template` with class/section/subject params → downloads `.xlsx`
- **Upload Excel**: opens a dialog with file picker → calls `POST /exams/{id}/marks/upload` with multipart form data → shows "processing in background" toast (async backend processing)
- Imports added: `Dialog`, `getMarkTemplate`, `uploadMarks`
- State added: `uploadDialogOpen`, `uploadFile`, `isUploading`, `isDownloadingTemplate`, `fileInputRef`

#### 4. Absent Checkbox Uncheck — `src/pages/exam/MarkEntryGrid.tsx`
Unchecking absent had **no handler** — once marked absent, marks could never be restored. Fixed:
- Checking absent: saves `is_absent: true, marks_obtained: null` for all components
- Unchecking absent: saves `is_absent: false` for all components + clears local values so inputs reset to empty

#### 5. Hall Ticket Download API Bug — `src/api/exam/index.ts` + `src/pages/exam/HallTicketDownload.tsx`
Two bugs fixed:
- `downloadHallTicket(examId)` was missing `studentId` parameter → wrong ticket downloaded
- Fixed signature: `downloadHallTicket(examId, studentId)` passing `student_id` as query param
- HallTicketDownload.tsx updated to pass `student.student_id` to the function

### Backend Status After Full Audit

#### Fully Working ✅ (no further frontend changes needed)
| Feature | Endpoints |
|---|---|
| Exam CRUD | `GET/POST/PUT/DELETE /exams`, `/exams/{id}` |
| Exam Dates | `GET/POST/PUT/DELETE /exams/{id}/dates` |
| Mark Entry (online) | `GET/POST /exams/{id}/marks` |
| Mark Entry (Excel) | `POST /exams/{id}/marks/upload` (async), `GET /exams/{id}/marks/template` |
| Mark Permissions | `GET/POST/DELETE /exams/{id}/mark-permissions` |
| All Grading | `/grade-schemes/exam`, `/grade-schemes/subject`, `/remark-grades` |
| Board Patterns | `/board-patterns` |
| Exam Settings | `/exam-settings` |
| Class Sections | `GET /exams/{id}/class-sections` |
| Subject Configs | `GET /exams/{id}/subject-configs` |

#### Backend Missing ❌ (frontend pages exist but show errors — backend work needed)
| Feature | Missing Endpoint | Page Affected |
|---|---|---|
| Results compute | `POST /exams/{id}/compute` | ResultsPublish |
| Results publish | `POST /exams/{id}/publish` | ResultsPublish |
| Student results | `GET /exams/{id}/results` | StudentResults |
| Hall ticket compute | `POST /exams/{id}/hall-tickets/compute` | HallTicketEligibility |
| Hall ticket eligible | `GET /exams/{id}/hall-tickets/eligible` | HallTicketEligibility |
| Hall ticket ineligible | `GET /exams/{id}/hall-tickets/ineligible` | HallTicketEligibility |
| Override eligibility | `PUT /exams/{id}/hall-tickets/{student_id}/override` | HallTicketEligibility |
| Publish hall tickets | `POST /exams/{id}/hall-tickets/publish` | HallTicketEligibility |
| Download PDF | `GET /exams/{id}/hall-tickets/download?student_id=` | HallTicketDownload |
| Bulk download PDF | `GET /exams/{id}/hall-tickets/download-all` | HallTicketDownload |
| Exam unlock | `POST /exams/{id}/unlock` | ExamDetail |
| Audit log | `GET /exams/{id}/audit` | AuditLog |
| Notifications | `POST /exams/{id}/notify` | ExamNotification |

### Deployment Readiness

| Module | Frontend | Backend | Deployable |
|---|---|---|---|
| Exam CRUD + Create | ✅ Complete | ✅ Complete | ✅ Yes |
| Exam Dates | ✅ Complete | ✅ Complete | ✅ Yes |
| Mark Entry (online) | ✅ Complete | ✅ Complete | ✅ Yes |
| Mark Entry (Excel) | ✅ Complete | ✅ Complete | ✅ Yes |
| Mark Permissions | ✅ Complete | ✅ Complete | ✅ Yes |
| Grading Setup | ✅ Complete | ✅ Complete | ✅ Yes |
| Board Patterns | ✅ Complete | ✅ Complete | ✅ Yes |
| Exam Settings | ✅ Complete | ✅ Complete | ✅ Yes |
| Results Workflow | ✅ UI Ready | ❌ Backend Missing | ⏳ After backend |
| Hall Tickets | ✅ UI Ready | ✅ Backend Live | ✅ Yes (after backend deploys Fix 4) |
| Audit Log | ✅ UI Ready | ❌ Backend Missing | ⏳ After backend |
| Notifications | ✅ UI Ready | ❌ Backend Missing | ⏳ After backend |

---

## 0.12 Session Fixes (2026-02-27 — mark entry save button, hall ticket fixes)

### Mark Entry Grid: Replaced Auto-Save with Explicit Save Button — `src/pages/exam/MarkEntryGrid.tsx`

**Problem**: Marks were being saved automatically 1 second after each input blur (debounced auto-save). This caused multiple individual API calls per student, was hard to undo, and gave no clear "confirm" moment for teachers.

**Fix**: Replaced the entire auto-save mechanism with an explicit **Save Marks** button.

#### What was removed
- `rowStatus: Record<string, RowStatus>` state
- `saveTimers: useRef<Record<string, ReturnType<typeof setTimeout>>>` ref
- `scheduleAutoSave(studentId)` function
- `saveRow(studentId)` function
- `onBlur` handler on number inputs
- `useUpsertMarks` hook
- Saved / Saving / Error legend at the bottom

#### What was added

**`localAbsent: Record<string, boolean>` state** — Absent checkbox now tracks changes locally (no immediate API call). Saving happens only when the teacher clicks Save Marks.

**`dirtyStudentIds: Set<string>`** (useMemo) — computed from `localValues` + `localAbsent`. A student is "dirty" if they have any unsaved value change or absent state change.

**Unsaved changes banner** — amber banner shown when `dirtyStudentIds.size > 0`:
```
⚠ Unsaved changes for 3 students. Click Save Marks to save.
```

**Row highlight** — blue-tinted row background for students with unsaved changes (orange for absent, blue for dirty marks).

**Save Marks button** — primary button with Save icon + count badge:
```tsx
<Button onClick={handleSaveAll} disabled={batchSaveMutation.isPending || dirtyStudentIds.size === 0}>
  <Save className="mr-1.5 h-4 w-4" />
  Save Marks
  {dirtyStudentIds.size > 0 && <Badge ...>{dirtyStudentIds.size}</Badge>}
</Button>
```

**`handleSaveAll`** — collects all dirty marks + absent states into a single batch payload and calls `batchSaveMutation.mutate(marks)`. On success, clears `localValues` and `localAbsent`.

#### New API function — `src/api/exam/index.ts`

```typescript
export const batchSaveMarks = async (
  examId: string,
  subjectConfigId: string,
  marks: Array<{
    student_id: string
    component_id: string
    marks_obtained: number | null
    is_absent: boolean
    remark_grade?: string | null
  }>,
): Promise<unknown> => {
  const response = await CAxios.post(`/exams/${examId}/marks`, {
    exam_id: examId,
    subject_config_id: subjectConfigId,
    marks,
    attempt_number: 1,
  })
  return response.data
}
```

#### New React Query hook — `src/api/hooks/exam/useExam.ts`

```typescript
export function useBatchSaveMarks(examId: string, subjectConfigId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (marks: Array<...>) => examApi.batchSaveMarks(examId, subjectConfigId, marks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks', examId] })
      toast.success('Marks saved successfully')
    },
    onError: () => { toast.error('Failed to save marks') },
  })
}
```

#### Layout improvements
- Max marks shown in column header: `Oral Test /20`
- Input `max` attribute set to `componentMap[compId]?.maxMarks`
- Input width reduced to `w-20` (was `w-24`) — more compact for multi-component exams
- Subtitle falls back to `—` (not raw UUID) when class/subject config data hasn't loaded

---

### Mark Entry: upsertMarks Payload Format Fix — `src/api/exam/index.ts`

**Problem**: `upsertMarks` was sending a flat object `{student_id, component_id, marks_obtained, is_absent}` directly as the POST body. The backend expects the nested format `{exam_id, subject_config_id, marks: [...], attempt_number}`.

**Fix**: The function now wraps the flat fields into the correct nested structure:
```typescript
export const upsertMarks = async (examId: string, data: Omit<MarkEntryCreate, 'exam_id'>): Promise<unknown> => {
  const { subject_config_id, student_id, component_id, marks_obtained, is_absent, remark_grade } = data
  const response = await CAxios.post(`/exams/${examId}/marks`, {
    exam_id: examId,
    subject_config_id,
    marks: [{ student_id, component_id, marks_obtained: marks_obtained ?? null, is_absent: is_absent ?? false, remark_grade: remark_grade ?? null }],
    attempt_number: 1,
  })
  return response.data
}
```

> `upsertMarks` is still used by the absent checkbox in the original auto-save path. With the Save button rewrite, it is no longer called directly — all saves go through `batchSaveMarks`.

---

### Hall Ticket: Attendance Check Fails When Dates Not Configured — Backend Fix

**File:** `app/service/exam/hall_ticket_service.py`

**Problem**: `compute_eligibility` calls `_get_attendance_percent(db, student_id, exam.attendance_from_date, exam.attendance_to_date)`. When either date is `NULL`, the function immediately returns `None`. The check `attendance_ok = (att_pct is not None and att_pct >= min_attendance)` then evaluates to `False` — marking **all students ineligible** with reason `LOW_ATTENDANCE` even though no attendance date range was configured.

**Fix** applied in `compute_eligibility`:
```python
# If no date range configured → skip attendance check
if not exam.attendance_from_date or not exam.attendance_to_date:
    att_pct = None
    attendance_ok = True
else:
    att_pct = await _get_attendance_percent(
        db, student_id,
        exam.attendance_from_date,
        exam.attendance_to_date,
    )
    attendance_ok = (att_pct is not None and att_pct >= min_attendance)
```

**Action required**: After deploying this fix, click **Recompute** on the Hall Tickets page to re-evaluate all students' eligibility with the corrected logic.

---

### Hall Ticket: Student Name and Admission Number Missing in Table

**Problem**: `GET /exams/{id}/hall-tickets/eligible` and `/ineligible` responses did not include `student_name` or `admission_number`. The `EligibilityPanel` table showed blank Student and Adm# columns.

**Backend fix applied** (`app/service/exam/hall_ticket_service.py`):
- Added `_get_eligibility_with_students` helper using raw SQL with `LEFT JOIN students` + correlated subquery for `admission_number`
- `get_eligible_students` and `get_ineligible_students` now call this helper and return `list[dict]` with `student_name` and `admission_number`

**Schema fix applied** (`app/schemas/exam/hall_ticket_schema.py`):
- Added `student_name: Optional[str] = None`
- Added `admission_number: Optional[str] = None`

No frontend changes needed — `EligibilityPanel.tsx` already reads `item.student_name` and `item.admission_number`.

---

### Mark Entry: MarkEntryItem Validator Removed — Backend Fix

**File:** `app/schemas/exam/mark_entry_schema.py`

**Problem**: A `@model_validator` on `MarkEntryItem` required either `marks_obtained` or `remark_grade` to be set when `is_absent = False`. This blocked:
1. The "not yet entered" state (empty cell = null marks, not absent)
2. The absent toggle UX (un-checking absent sent `is_absent=False, marks_obtained=None` → rejected)

**Fix**: The validator was removed entirely. Null marks with `is_absent=False` is a valid "not yet entered" state.

---

### Mark Entry: Staff Role Permissions

**Problem**: Staff role had no `exam_marks` permissions. Only Admin could enter/save marks.

**Fix**: Added `create, read, update, list` permissions for the `exam_marks` resource to the Staff role via the permissions API.

**Action required**: Ensure these permissions are included in the DB seed/migration so they persist across resets.

---

### Updated Backend Status After Session

#### Fully Working ✅
| Feature | Endpoints |
|---|---|
| Exam CRUD | `GET/POST/PUT/DELETE /exams`, `/exams/{id}` |
| Exam Dates | `GET/POST/PUT/DELETE /exams/{id}/dates` |
| Mark Entry (online) | `GET/POST /exams/{id}/marks` |
| Mark Entry (Excel) | `POST /exams/{id}/marks/upload`, `GET /exams/{id}/marks/template` |
| Mark Permissions | `GET/POST/DELETE /exams/{id}/mark-permissions` |
| All Grading | `/grade-schemes/exam`, `/grade-schemes/subject`, `/remark-grades` |
| Board Patterns | `/board-patterns` |
| Exam Settings | `/exam-settings` |
| Class Sections | `GET /exams/{id}/class-sections` |
| Subject Configs | `GET /exams/{id}/subject-configs` |
| Hall Ticket Compute | `POST /exams/{id}/hall-tickets/compute` |
| Hall Ticket Eligible | `GET /exams/{id}/hall-tickets/eligible` |
| Hall Ticket Ineligible | `GET /exams/{id}/hall-tickets/ineligible` |
| Override Eligibility | `PUT /exams/{id}/hall-tickets/{student_id}/override` |
| Publish Hall Tickets | `POST /exams/{id}/hall-tickets/publish` |
| Hall Ticket PDF | `GET /exams/{id}/hall-tickets/download` |
| Hall Ticket Bulk PDF | `GET /exams/{id}/hall-tickets/download-all` |

#### Backend Missing ❌
| Feature | Missing Endpoint | Page Affected |
|---|---|---|
| Results compute | `POST /exams/{id}/compute` | ResultsPublish |
| Results publish | `POST /exams/{id}/publish` | ResultsPublish |
| Student results | `GET /exams/{id}/results` | StudentResults |
| Exam unlock | `POST /exams/{id}/unlock` | ExamDetail |
| Audit log | `GET /exams/{id}/audit` | AuditLog |
| Notifications | `POST /exams/{id}/notify` | ExamNotification |

---

## 0.13 Session Fixes (2026-02-27 — results end-to-end, hall ticket ZIP fix)

### Overview

This session fixed the complete results display pipeline. After marks were entered, the Results sub-module showed either a blank list or a table full of `—` dashes. Six files were changed (3 backend, 3 frontend + 1 frontend route filter fix + 1 UX addition).

---

### Backend Fix 1: Result Schema Missing Fields — `app/schemas/exam/result_schema.py`

**Problem**: `StudentExamResultRead` and `SubjectResultRead` schemas did not include `student_name`, `admission_number`, or `subject_name`. FastAPI was returning `null` for all three fields even though the service could provide them.

**Fix**: Added optional fields to both schemas:

```python
class SubjectResultRead(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    subject_config_id: UUID
    subject_name: Optional[str] = None        # ADDED
    marks_obtained: Optional[Decimal] = None
    # ... rest unchanged

class StudentExamResultRead(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    exam_id: UUID
    student_id: UUID
    student_name: Optional[str] = None        # ADDED
    admission_number: Optional[str] = None    # ADDED
    # ... rest unchanged
```

---

### Backend Fix 2: Results Service — Complete Rewrite — `app/service/exam/result_service.py`

**Problem**: `get_exam_results` used a plain ORM `select(StudentExamResult)` with no JOINs. This returned ORM objects with no student name, no admission number, and no subject names in the nested `subject_results`. The frontend saw `student_name: null`, `admission_number: null`, and blank subject columns.

**Fix**: Complete rewrite of `get_exam_results` using raw SQL with LEFT JOINs:

```python
async def get_exam_results(db, exam_id, student_id=None, class_id=None, section_id=None) -> list[dict]:
    conditions = ["ser.exam_id = :exam_id"]
    params: dict = {"exam_id": str(exam_id)}
    if student_id:
        conditions.append("ser.student_id = :student_id")
        params["student_id"] = str(student_id)
    where_clause = " AND ".join(conditions)

    sql = text(f"""
        SELECT ser.id, ser.exam_id, ser.student_id,
            TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')) AS student_name,
            (SELECT sa2.admission_number FROM student_admissions sa2
             WHERE sa2.student_id = ser.student_id LIMIT 1) AS admission_number,
            ser.total_marks_obtained, ser.total_max_marks,
            ser.percentage, ser.grade_label, ser.gpa, ser.rank,
            ser.is_passed, ser.computed_at
        FROM student_exam_results ser
        LEFT JOIN students s ON s.id = ser.student_id
        WHERE {where_clause}
        ORDER BY ser.rank NULLS LAST, student_name
    """)
    rows = (await db.execute(sql, params)).mappings().all()
    if not rows:
        return []

    sub_sql = text("""
        SELECT ssr.id, ssr.student_id, ssr.subject_config_id,
            sub.name AS subject_name,
            ssr.marks_obtained, ssr.max_marks, ssr.percentage,
            ssr.grade_label, ssr.gpa, ssr.remark_grade,
            ssr.is_absent, ssr.is_passed
        FROM student_subject_results ssr
        LEFT JOIN exam_subject_config esc ON esc.id = ssr.subject_config_id
        LEFT JOIN subjects sub ON sub.id = esc.subject_id
        WHERE ssr.exam_id = :exam_id
        ORDER BY COALESCE(esc.sort_order, 999)
    """)
    sub_rows = (await db.execute(sub_sql, {"exam_id": str(exam_id)})).mappings().all()

    student_ids_in_page = {str(r["student_id"]) for r in rows}
    sub_by_student: dict = {}
    for sr in sub_rows:
        sid = str(sr["student_id"])
        if sid in student_ids_in_page:
            sub_by_student.setdefault(sid, []).append(dict(sr))

    results = []
    for row in rows:
        r = dict(row)
        r["subject_results"] = sub_by_student.get(str(r["student_id"]), [])
        results.append(r)
    return results
```

> **How FastAPI validates this**: When the endpoint has `response_model=List[StudentExamResultRead]`, FastAPI calls `model_validate(dict)` on each item in the returned `list[dict]`. No ORM objects needed.

---

### Backend Fix 3: Hall Ticket ZIP — Dict Access Error — `app/tasks/exam/hall_ticket_pdf.py`

**Problem**: `generate_all_hall_tickets_zip` called `get_eligible_students()` which returns `list[dict]`. The code then accessed `row.student_id` (attribute access on a dict → `AttributeError`). The error was silently swallowed by a bare `except Exception: pass`, resulting in an empty ZIP download with no error shown.

**Secondary bug**: Student name SQL used `s.first_name || ' ' || COALESCE(s.last_name, '')` — if `first_name` is NULL, the entire concatenation returns NULL.

**Fixes**:

```python
# BEFORE (broken):
for row in eligible:
    pdf_bytes = await generate_hall_ticket_pdf(db, exam_id, row.student_id)
    filename = f"hall-ticket-{row.hall_ticket_number or row.student_id}.pdf"

# AFTER (fixed):
for row in eligible:
    sid = row['student_id']
    ht_num = row.get('hall_ticket_number') or sid
    pdf_bytes = await generate_hall_ticket_pdf(db, exam_id, sid)
    filename = f"hall-ticket-{ht_num}.pdf"

# Student name SQL fix:
# BEFORE:  s.first_name || ' ' || COALESCE(s.last_name, '') AS student_name
# AFTER:   COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '') AS student_name
```

---

### Frontend Fix 1: Type Field Name Corrections — `src/types/exam.ts`

**Problem**: Frontend type interfaces used field names from the original spec that did not match the actual backend response field names. Every field showed `—` because TypeScript read `undefined` for all result values.

**Full mapping of corrected fields**:

| Interface | Wrong (was) | Correct (now) |
|---|---|---|
| `StudentExamResult` | `overall_percent` | `percentage` |
| `StudentExamResult` | `overall_grade` | `grade_label` |
| `StudentExamResult` | `sgpa` | `gpa` |
| `StudentExamResult` | `class_rank` | `rank` |
| `StudentExamResult` | `is_pass` | `is_passed` |
| `StudentSubjectResult` | `subject_percent` | `percentage` |
| `StudentSubjectResult` | `subject_grade` | `grade_label` |
| `StudentSubjectResult` | `subject_gpa` | `gpa` |
| `StudentSubjectResult` | `subject_remarks` | `remark_grade` |
| `StudentSubjectResult` | `is_pass` | `is_passed` |

**Removed non-existent fields**: `exam_result_id`, `subject_id`, `overall_gpa`, `overall_remarks`, `is_absent` (at result level), `formative_aggregate_percent`, `teacher_remarks`, `internal_marks`, `external_marks`.

**Added missing fields**: `student_name?: string`, `admission_number?: string`, `total_max_marks`, `computed_at`.

---

### Frontend Fix 2: ResultsTable Field References + Decimal Safety — `src/components/exam/ResultsTable.tsx`

**Problem**: All JSX field references used the old (wrong) type field names. Additionally, the backend returns `Decimal` values serialized as strings in some edge cases — calling `.toFixed()` directly on a string throws a TypeError.

**Fix**: Updated all field references to use corrected names. Wrapped all numeric fields with `Number()` before calling `.toFixed()`:

```tsx
// Subject marks cell
<span className="font-medium">
  {sr.marks_obtained != null ? Number(sr.marks_obtained) : '—'}
</span>
{sr.grade_label && <span className="text-xs text-muted-foreground">{sr.grade_label}</span>}
{sr.is_absent && <Badge variant="secondary" className="text-xs">ABS</Badge>}

// Row totals
{row.total_marks_obtained != null ? Number(row.total_marks_obtained).toFixed(1) : '—'}
{row.percentage != null ? `${Number(row.percentage).toFixed(1)}%` : '—'}
{row.grade_label ? <Badge variant="outline">{row.grade_label}</Badge> : '—'}
{row.gpa != null ? Number(row.gpa).toFixed(2) : '—'}
{row.rank ?? '—'}
{row.is_passed != null
  ? <Badge variant={row.is_passed ? 'default' : 'destructive'}>{row.is_passed ? 'Pass' : 'Fail'}</Badge>
  : '—'}
```

---

### Frontend Fix 3: computeAggregate force=true — `src/api/exam/index.ts`

**Problem**: After computing results once, clicking "Compute Results" again returned HTTP 409 — backend raises a conflict error if results already exist without `force=true`.

**Fix**: Added `?force=true` query parameter:

```typescript
// Before
export const computeAggregate = async (examId: string): Promise<void> => {
  await CAxios.post(`/exams/${examId}/compute`)
}

// After
export const computeAggregate = async (examId: string): Promise<void> => {
  await CAxios.post(`/exams/${examId}/compute`, null, { params: { force: true } })
}
```

---

### Frontend Fix 4: ResultsExamList Shows Active Exams — `src/pages/exam/ResultsExamList.tsx`

**Problem**: The Results section showed "No results available" even after marks were entered and results computed. The exam was in `active` status (all exams start as `active`). The exam picker filtered to only `['published', 'finalized', 'locked']` — `active` was excluded.

**Fix**: Added `'active'` to the status filter:

```typescript
// Before — active exams hidden:
const resultExams = exams.filter(e => ['published', 'finalized', 'locked'].includes(e.status))

// After — active exams shown:
const resultExams = exams.filter(e => ['active', 'locked', 'published', 'finalized'].includes(e.status))
```

> **Status context**: Exams are created with `status = 'active'` (hardcoded in `create_full_exam`). They only move to `locked`/`published`/`finalized` after explicit admin actions. If active exams are excluded from the Results picker, results are never accessible right after computation.

---

### Frontend Fix 5: Compute Button on Results Page — `src/pages/exam/StudentResults.tsx`

**Problem**: The "Compute Results" trigger only existed on `ResultsPublish.tsx` (the admin-facing exam detail tab at `/exam/exams/$id/results`). A user who enters marks and then navigates to the sidebar "Results" section at `/exam/results/$id` had no way to trigger computation — they saw empty results with no action button.

**Fix**: Added a "Compute Results" button directly to the `StudentResults` page:

```tsx
import { useExamDetail, useStudentResults, useComputeAggregate } from '@/api/hooks/exam/useExam'
// ...
const computeMutation = useComputeAggregate(id)
const canCompute = exam?.status === 'active' || exam?.status === 'locked'

// In JSX toolbar:
{canCompute && (
  <Button
    variant="outline"
    size="sm"
    className="gap-1"
    onClick={() => computeMutation.mutate()}
    disabled={computeMutation.isPending}
  >
    {computeMutation.isPending
      ? <><Loader2 className="h-4 w-4 animate-spin" /> Computing...</>
      : <><RefreshCw className="h-4 w-4" /> Compute Results</>
    }
  </Button>
)}

// ResultsTable shows spinner during compute:
<ResultsTable results={filtered} isLoading={isLoading || computeMutation.isPending} />
```

---

### Complete Results Flow (End-to-End)

```
Teacher enters marks  →  POST /exams/{id}/marks  (stores MarkEntry rows)
                                ↓
Admin clicks "Compute Results"  →  POST /exams/{id}/compute?force=true
                                       aggregate_service.py:
                                         - Groups marks by student × subject
                                         - Computes sub_obtained, sub_max per subject
                                         - Applies grade scheme → grade_label, gpa
                                         - Sums totals, percentage, rank
                                         - Writes StudentSubjectResult + StudentExamResult rows
                                ↓
Frontend calls GET /exams/{id}/results
                result_service.py:
                  - Raw SQL JOIN students → student_name, admission_number
                  - Raw SQL JOIN subjects → subject_name
                  - Returns list[dict]  (FastAPI validates against response_model)
                                ↓
React Query updates ResultsTable  →  grid shows student names, marks, grades, rank, pass/fail
```

---

### Remaining Backend Issues (Not Fixed — Noted for Developer)

These issues exist in the backend but were not addressed in this session. The frontend will work correctly once they are fixed:

| Issue | Location | Impact |
|---|---|---|
| `class_id`/`section_id` filter parameters on `GET /exams/{id}/results` are accepted but silently ignored in `get_exam_results` | `result_service.py` | Per-class filtering never works; all students always returned |
| Ranking uses `configs[0].class_id` for all students in `aggregate_service.py` | `aggregate_service.py` | Wrong rank for multi-class exams (only first class's students get correct rank) |
| `sub_max` accumulates only for entries that have marks entered; skips unrecorded subjects | `aggregate_service.py` | Inflated percentage when only some components are entered (e.g. 10/10 when max should be 20) |

---

### Cumulative Backend Status After §0.13

#### All Working Endpoints ✅ (as of §0.13)

| Feature | Endpoints |
|---|---|
| Exam CRUD | `GET/POST/PUT/DELETE /exams`, `/exams/{id}` |
| Exam Dates | `GET/POST/PUT/DELETE /exams/{id}/dates` |
| Mark Entry (online) | `GET/POST /exams/{id}/marks` |
| Mark Entry (Excel) | `POST /exams/{id}/marks/upload`, `GET /exams/{id}/marks/template` |
| Mark Permissions | `GET/POST/DELETE /exams/{id}/mark-permissions` |
| All Grading | `/grade-schemes/exam`, `/grade-schemes/subject`, `/remark-grades` |
| Board Patterns | `/board-patterns` |
| Exam Settings | `/exam-settings` |
| Class Sections | `GET /exams/{id}/class-sections` |
| Subject Configs | `GET /exams/{id}/subject-configs` |
| Hall Ticket Compute | `POST /exams/{id}/hall-tickets/compute` |
| Hall Ticket Eligible | `GET /exams/{id}/hall-tickets/eligible` |
| Hall Ticket Ineligible | `GET /exams/{id}/hall-tickets/ineligible` |
| Override Eligibility | `PUT /exams/{id}/hall-tickets/{student_id}/override` |
| Publish Hall Tickets | `POST /exams/{id}/hall-tickets/publish` |
| Hall Ticket PDF | `GET /exams/{id}/hall-tickets/download` |
| Hall Ticket Bulk PDF | `GET /exams/{id}/hall-tickets/download-all` *(ZIP fix applied this session)* |
| Results Compute | `POST /exams/{id}/compute` *(fixed this session)* |
| Student Results | `GET /exams/{id}/results` *(fixed this session)* |

#### Still Missing ❌ (as of §0.13)

| Feature | Missing Endpoint | Page Affected |
|---|---|---|
| Results publish | `POST /exams/{id}/publish` | ResultsPublish |
| Exam unlock | `POST /exams/{id}/unlock` | ExamDetail |
| Audit log | `GET /exams/{id}/audit` | AuditLog |
| Notifications | `POST /exams/{id}/notify` | ExamNotification |

---

## Table of Contents

1. [Overview](#1-overview)
   - 1.1 [Workflow Summary (9 Steps)](#11-workflow-summary-9-steps)
   - 1.2 [Role Matrix](#12-role-matrix)
   - 1.3 [Sprint Delivery Schedule](#13-sprint-delivery-schedule)
2. [API Service Layer](#2-api-service-layer)
3. [TypeScript Types](#3-typescript-types)
4. [Zod Schemas](#4-zod-schemas)
5. [React Query Hooks](#5-react-query-hooks)
6. [Screen Specifications (23 Screens)](#6-screen-specifications-23-screens)
   - Sprint 1: [S01–S05 Grading Setup](#sprint-1--grading-setup-pre-exam-configuration)
   - Sprint 2: [S06–S09 Exam Creation](#sprint-2--exam-creation)
   - Sprint 3: [S10–S11 Dates and Permissions](#sprint-3--dates--permissions)
   - Sprint 4: [S12–S14 Mark Entry](#sprint-4--mark-entry)
   - Sprint 5-6: [S15–S17 Results](#sprint-56--results)
   - Sprint 7: [S18–S20 Hall Tickets](#sprint-7--hall-tickets)
   - Supporting: [S21–S23](#supporting-screens)
7. [Key Components (8 Reusable)](#7-key-components-8-reusable)
8. [State Management](#8-state-management)
9. [Role-Based UI Rules](#9-role-based-ui-rules)
10. [Error Handling Patterns](#10-error-handling-patterns)
11. [Confirmation Dialogs](#11-confirmation-dialogs)
12. [Navigation / Routing](#12-navigation--routing)
13. [UX Patterns / Design Guidelines](#13-ux-patterns--design-guidelines)

---

## 1. Overview

### 1.1 Workflow Summary (9 Steps)

The exam module follows a strict sequential workflow. Steps 1 and 2 are one-time setup per school year. Steps 3–7 repeat for each exam. Steps 3a–3d are a single screen with a single Save button.

```
STEP 1  Configure Grading System            (one-time / per level)
         1a. Exam Grade Scheme  — grand total: % + marks -> Grade, GPA, Remarks
         1b. Subject Grade Scheme — per subject: % + marks -> Grade, GPA, Remarks

STEP 2  Configure Board Exam Pattern        (one-time / per board)
         Formative / Summative / Cumulative types, weightages

STEP 3  CREATE EXAM — ONE SCREEN, ONE OPERATION
        ┌─────────────────────────────────────────────────────┐
        │  3a. Exam Details       (name, board, level, type…) │
        │  3b. Class Sections     (multi-select class+section) │
        │  3c. Subject Config     (marks, components, passing) │
        │  3d. Exam Dates         (date/time per subject)      │
        │                                                       │
        │  [ Save ]  one button — one POST — one transaction   │
        └─────────────────────────────────────────────────────┘

STEP 4  Generate Hall Tickets               (per exam)
         Attendance % check + fee payment check

STEP 5  Mark Entry                          (Admin / Teacher / Clerk)

STEP 6  Publish Results                     (Admin)

STEP 7  Student / Parent views results + downloads report card

STEP 8  (Optional) Reconduct / Supplementary exam lifecycle

STEP 9  Year-end finalization and CGPA computation
```

> **Grading must exist before any exam can be created.** Block the Create Exam button and show a prompt if no grading scheme is configured.

> **Steps 3a–3d are one screen.** All data is collected locally in a Zustand wizard store. A single POST is made to `/api/v1/exam/exams/create-full/`. There are no partial saves, no drawers per step, no separate pages per step.

---

### 1.2 Role Matrix

| Role | Also Called | Exam List | Create Exam | Mark Entry | Results | Hall Ticket |
|---|---|---|---|---|---|---|
| Admin | Exam Coordinator | All statuses | Yes | All subjects, all classes | All students | Manage + download all |
| Teacher | Subject Teacher | Active/Published | No | Own subject + own class only | Own class | Hidden |
| Clerk / CA | Auth Staff | Active/Published | No | Permitted exams only (admin-delegated) | View only | View list |
| Student | Learner | Published only | No | No | Own result only | Own if eligible |
| Parent | Guardian | Published only | No | No | Child's result | Child's if eligible |

---

### 1.3 Sprint Delivery Schedule

| Sprint | Focus | Screens | Backend Phase |
|---|---|---|---|
| Sprint 1 | Grading Setup | S01, S02, S03, S04, S05 | Phase 1A |
| Sprint 2 | Exam Creation | S06, S07, S08, S09 | Phase 1B, 1G |
| Sprint 3 | Dates + Permissions | S10, S11 | Phase 1C, 1D |
| Sprint 4 | Mark Entry | S12, S13, S14 | Phase 1D, 1E |
| Sprint 5 | Results Compute + Publish | S15 | Phase 2A |
| Sprint 6 | Results View + Report Card | S16, S17 | Phase 2H |
| Sprint 7 | Hall Tickets | S18, S19, S20 | Phase 2D |
| Ongoing | Supporting screens | S21, S22, S23 | Phase 2G, 2I |

---

## 2. API Service Layer

File: `src/services/examService.ts`

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

// ---------------------------------------------------------------------------
// Base instance — JWT Bearer token from localStorage
// ---------------------------------------------------------------------------
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ---------------------------------------------------------------------------
// Exam Settings
// ---------------------------------------------------------------------------
export const getExamSettings = () =>
  api.get<ExamSettings>('/exam/settings/')

export const updateExamSettings = (data: Partial<ExamSettings>) =>
  api.put<ExamSettings>('/exam/settings/', data)

// ---------------------------------------------------------------------------
// Board Patterns
// ---------------------------------------------------------------------------
export const createBoardPattern = (data: BoardPatternCreate) =>
  api.post<BoardExamPattern>('/exam/board-patterns/', data)

export const listBoardPatterns = (params?: { board?: string; level?: string }) =>
  api.get<BoardExamPattern[]>('/exam/board-patterns/', { params })

export const getBoardPattern = (id: string) =>
  api.get<BoardExamPattern>(`/exam/board-patterns/${id}/`)

export const updateBoardPattern = (id: string, data: Partial<BoardPatternCreate>) =>
  api.put<BoardExamPattern>(`/exam/board-patterns/${id}/`, data)

export const deleteBoardPattern = (id: string) =>
  api.delete(`/exam/board-patterns/${id}/`)

export const getBoardPatternDefaults = () =>
  api.get<BoardExamPattern[]>('/exam/board-patterns/defaults/')

// ---------------------------------------------------------------------------
// Exam Grade Schemes
// ---------------------------------------------------------------------------
export const createExamGradeScheme = (data: GradeSchemeCreate) =>
  api.post<ExamGradeScheme>('/exam/grading/exam-schemes/', data)

export const listExamGradeSchemes = () =>
  api.get<ExamGradeScheme[]>('/exam/grading/exam-schemes/')

export const getExamGradeScheme = (id: string) =>
  api.get<ExamGradeScheme>(`/exam/grading/exam-schemes/${id}/`)

export const updateExamGradeScheme = (id: string, data: Partial<GradeSchemeCreate>) =>
  api.put<ExamGradeScheme>(`/exam/grading/exam-schemes/${id}/`, data)

export const deleteExamGradeScheme = (id: string) =>
  api.delete(`/exam/grading/exam-schemes/${id}/`)

export const createExamGradeBand = (schemeId: string, data: GradeBandCreate) =>
  api.post<ExamGradeBand>(`/exam/grading/exam-schemes/${schemeId}/bands/`, data)

export const updateExamGradeBand = (schemeId: string, bandId: string, data: GradeBandCreate) =>
  api.put<ExamGradeBand>(`/exam/grading/exam-schemes/${schemeId}/bands/${bandId}/`, data)

export const deleteExamGradeBand = (schemeId: string, bandId: string) =>
  api.delete(`/exam/grading/exam-schemes/${schemeId}/bands/${bandId}/`)

// ---------------------------------------------------------------------------
// Subject Grade Schemes
// ---------------------------------------------------------------------------
export const createSubjectGradeScheme = (data: GradeSchemeCreate) =>
  api.post<SubjectGradeScheme>('/exam/grading/subject-schemes/', data)

export const listSubjectGradeSchemes = () =>
  api.get<SubjectGradeScheme[]>('/exam/grading/subject-schemes/')

export const getSubjectGradeScheme = (id: string) =>
  api.get<SubjectGradeScheme>(`/exam/grading/subject-schemes/${id}/`)

export const updateSubjectGradeScheme = (id: string, data: Partial<GradeSchemeCreate>) =>
  api.put<SubjectGradeScheme>(`/exam/grading/subject-schemes/${id}/`, data)

export const deleteSubjectGradeScheme = (id: string) =>
  api.delete(`/exam/grading/subject-schemes/${id}/`)

export const createSubjectGradeBand = (schemeId: string, data: GradeBandCreate) =>
  api.post<SubjectGradeBand>(`/exam/grading/subject-schemes/${schemeId}/bands/`, data)

export const updateSubjectGradeBand = (schemeId: string, bandId: string, data: GradeBandCreate) =>
  api.put<SubjectGradeBand>(`/exam/grading/subject-schemes/${schemeId}/bands/${bandId}/`, data)

export const deleteSubjectGradeBand = (schemeId: string, bandId: string) =>
  api.delete(`/exam/grading/subject-schemes/${schemeId}/bands/${bandId}/`)

// ---------------------------------------------------------------------------
// Remark Grade Sets
// ---------------------------------------------------------------------------
export const createRemarkGradeSet = (data: { name: string; options: RemarkGradeOptionCreate[] }) =>
  api.post<RemarkGradeSet>('/exam/remark-grade-sets/', data)

export const listRemarkGradeSets = () =>
  api.get<RemarkGradeSet[]>('/exam/remark-grade-sets/')

export const getRemarkGradeSet = (id: string) =>
  api.get<RemarkGradeSet>(`/exam/remark-grade-sets/${id}/`)

export const updateRemarkGradeSet = (id: string, data: Partial<{ name: string }>) =>
  api.put<RemarkGradeSet>(`/exam/remark-grade-sets/${id}/`, data)

export const deleteRemarkGradeSet = (id: string) =>
  api.delete(`/exam/remark-grade-sets/${id}/`)

// ---------------------------------------------------------------------------
// Exams — Core CRUD
// ---------------------------------------------------------------------------
export const createExamFull = (data: ExamCreateFull) =>
  api.post<ExamCreateFullResponse>('/exam/exams/create-full/', data)

export const listExams = (params?: { academic_year_id?: string; status?: ExamStatus; nature?: ExamNature }) =>
  api.get<ExamListItem[]>('/exam/exams/', { params })

export const getExam = (id: string) =>
  api.get<Exam>(`/exam/exams/${id}/`)

export const updateExam = (id: string, data: Partial<ExamDetailsPayload>) =>
  api.put<Exam>(`/exam/exams/${id}/`, data)

export const deleteExam = (id: string) =>
  api.delete(`/exam/exams/${id}/`)

export const cloneExam = (id: string, data?: { new_name?: string; academic_year_id?: string }) =>
  api.post<ExamCreateFullResponse>(`/exam/exams/${id}/clone/`, data ?? {})

export const computeAggregate = (examId: string) =>
  api.post(`/exam/exams/${examId}/compute/`)

export const publishResults = (examId: string) =>
  api.post(`/exam/exams/${examId}/publish/`)

export const unlockExam = (examId: string, reason: string) =>
  api.post(`/exam/exams/${examId}/unlock/`, { reason })

// ---------------------------------------------------------------------------
// Exam Dates
// ---------------------------------------------------------------------------
export const createExamDate = (data: ExamDatePayload) =>
  api.post<ExamDate>('/exam/dates/', data)

export const bulkCreateExamDates = (dates: ExamDatePayload[]) =>
  api.post<ExamDate[]>('/exam/dates/bulk/', { dates })

export const getExamDates = (params: { exam_id: string; class_id?: string; section_id?: string }) =>
  api.get<ExamDate[]>('/exam/dates/', { params })

export const updateExamDate = (id: string, data: Partial<ExamDatePayload>) =>
  api.put<ExamDate>(`/exam/dates/${id}/`, data)

export const deleteExamDate = (id: string) =>
  api.delete(`/exam/dates/${id}/`)

// ---------------------------------------------------------------------------
// Mark Entry
// ---------------------------------------------------------------------------
export const getMarks = (params: {
  exam_id: string
  class_id: string
  section_id: string
  subject_config_id: string
  page?: number
  page_size?: number
}) => api.get<MarkEntryItem[]>('/exam/marks/', { params })

export const upsertMarks = (data: MarkEntryCreate) =>
  api.post<StudentMark>('/exam/marks/', data)

export const bulkUpsertMarks = (marks: MarkEntryCreate[]) =>
  api.post<StudentMark[]>('/exam/marks/bulk/', { marks })

export const getMarkTemplate = (params: {
  exam_id: string
  class_id: string
  section_id: string
  subject_config_id: string
}) =>
  api.get('/exam/marks/template/', {
    params,
    responseType: 'blob',
  })

export const uploadMarks = (formData: FormData) =>
  api.post('/exam/marks/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// ---------------------------------------------------------------------------
// Mark Entry Permissions
// ---------------------------------------------------------------------------
export const listMarkPermissions = (examId: string) =>
  api.get<MarkPermission[]>(`/exam/exams/${examId}/permissions/`)

export const grantMarkPermission = (examId: string, userId: string) =>
  api.post<MarkPermission>(`/exam/exams/${examId}/permissions/`, { user_id: userId })

export const revokeMarkPermission = (examId: string, permId: string) =>
  api.delete(`/exam/exams/${examId}/permissions/${permId}/`)

// ---------------------------------------------------------------------------
// Hall Tickets
// ---------------------------------------------------------------------------
export const computeHallTicketEligibility = (examId: string) =>
  api.post(`/exam/exams/${examId}/hall-tickets/generate/`)

export const publishHallTickets = (examId: string) =>
  api.post(`/exam/exams/${examId}/hall-tickets/publish/`)

export const getEligibleStudents = (examId: string) =>
  api.get<HallTicketEligibility[]>(`/exam/exams/${examId}/hall-tickets/eligible/`)

export const getIneligibleStudents = (examId: string) =>
  api.get<HallTicketEligibility[]>(`/exam/exams/${examId}/hall-tickets/ineligible/`)

export const overrideHallTicketEligibility = (examId: string, studentId: string, overrides: {
  attendance_override?: boolean
  fee_override?: boolean
}) => api.put(`/exam/exams/${examId}/hall-tickets/${studentId}/override/`, overrides)

export const downloadHallTicket = (examId: string) =>
  api.get(`/exam/exams/${examId}/hall-tickets/download/`, { responseType: 'blob' })

export const downloadAllHallTickets = (examId: string) =>
  api.get(`/exam/exams/${examId}/hall-tickets/download-all/`, { responseType: 'blob' })

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------
export const getStudentResults = (examId: string, params?: { student_id?: string; class_id?: string; section_id?: string }) =>
  api.get<StudentExamResult[]>(`/exam/exams/${examId}/results/`, { params })

export const getStudentResult = (examId: string, studentId: string) =>
  api.get<StudentExamResult>(`/exam/exams/${examId}/results/${studentId}/`)

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export const sendExamNotification = (examId: string, data: {
  message: string
  channels: ('sms' | 'whatsapp' | 'push')[]
  target: 'all' | 'failed' | 'eligible' | 'ineligible'
}) => api.post(`/exam/exams/${examId}/notify/`, data)

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
export const getAuditLog = (examId: string, params?: { page?: number; page_size?: number }) =>
  api.get(`/exam/audit/`, { params: { exam_id: examId, ...params } })
```

---

## 3. TypeScript Types

File: `src/types/exam.ts`

```typescript
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type ExamStatus = 'draft' | 'active' | 'published' | 'locked' | 'finalized'

export type ExamNature = 'formative' | 'summative' | 'cumulative' | 'custom'

export type ExamLevel =
  | 'pre_primary'
  | 'primary'
  | 'upper_primary'
  | 'secondary'
  | 'inter'
  | 'diploma'
  | 'btech'
  | 'mtech'
  | 'iit'
  | 'others'

export type ExamBoard = 'CBSE' | 'ICSE' | 'State' | 'BTech' | 'Custom'

export type EntryType = 'marks' | 'remarks'

export type IneligibilityReason = 'FEE_PENDING' | 'LOW_ATTENDANCE' | 'BOTH'

// ---------------------------------------------------------------------------
// Exam Settings
// ---------------------------------------------------------------------------
export interface ExamSettings {
  id: string
  default_board: ExamBoard | null
  custom_board_name: string | null
  hall_ticket_min_attendance: number | null   // e.g. 75.00
  exam_fee_type_id: string | null
  grace_max_per_subject: number | null
  grace_max_subjects: number | null
  grace_auto_apply: boolean
  reconduct_max_failed_subjects: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Board Exam Pattern
// ---------------------------------------------------------------------------
export interface BoardPatternExamType {
  id: string
  pattern_id: string
  exam_type_name: string
  nature: ExamNature
  weightage_percent: number | null
  count_per_year: number | null
  sort_order: number
}

export interface BoardExamPattern {
  id: string
  board: ExamBoard
  custom_board_name: string | null
  level: ExamLevel
  is_active: boolean
  created_at: string
  updated_at: string
  exam_types: BoardPatternExamType[]
}

export interface BoardPatternCreate {
  board: ExamBoard
  custom_board_name?: string
  level: ExamLevel
  exam_types: Omit<BoardPatternExamType, 'id' | 'pattern_id'>[]
}

// ---------------------------------------------------------------------------
// Grading Schemes
// ---------------------------------------------------------------------------
export interface GradeSchemeCreate {
  name: string
  description?: string
  is_default?: boolean
  bands: GradeBandCreate[]
}

export interface GradeBandCreate {
  from_percent: number
  to_percent: number
  from_marks?: number | null
  to_marks?: number | null
  grade_label: string
  gpa: number
  remarks?: string | null
  is_pass: boolean
  sort_order: number
}

export interface ExamGradeBand extends GradeBandCreate {
  id: string
  scheme_id: string
}

export interface ExamGradeScheme {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  bands: ExamGradeBand[]
}

export interface SubjectGradeBand extends GradeBandCreate {
  id: string
  scheme_id: string
}

export interface SubjectGradeScheme {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  bands: SubjectGradeBand[]
}

// ---------------------------------------------------------------------------
// Remark Grade Sets
// ---------------------------------------------------------------------------
export interface RemarkGradeOptionCreate {
  grade_letter: string    // e.g. "A", "B", "C"
  label: string           // e.g. "Excellent", "Good"
  sort_order: number
}

export interface RemarkGradeOption extends RemarkGradeOptionCreate {
  id: string
  set_id: string
}

export interface RemarkGradeSet {
  id: string
  name: string
  created_at: string
  options: RemarkGradeOption[]
}

// ---------------------------------------------------------------------------
// Exam Core
// ---------------------------------------------------------------------------
export interface ExamDetailsPayload {
  exam_name: string
  board: ExamBoard
  custom_board_name?: string | null
  level: ExamLevel
  exam_type: string
  nature: ExamNature
  is_internal: boolean
  weightage_percent?: number | null
  academic_year_id: string
  exam_grade_scheme_id?: string | null
  status?: ExamStatus
  mark_entry_deadline?: string | null       // yyyy-MM-dd
  publish_rank?: boolean
  hall_ticket_min_attendance?: number | null
  attendance_from_date?: string | null      // yyyy-MM-dd
  attendance_to_date?: string | null        // yyyy-MM-dd
  attendance_mode?: string | null
  term?: string | null
}

export interface ClassSectionPayload {
  class_id: string
  section_id: string | null
}

export interface ComponentPayload {
  component_name: string
  entry_type: EntryType
  max_marks: number | null
  min_pass_marks?: number | null
  include_in_total: boolean
  is_internal?: boolean
  remark_grade_set_id?: string | null
  sort_order?: number
}

export interface SubjectConfigPayload {
  class_id: string
  section_id: string | null
  subject_id: string
  subject_grade_scheme_id?: string | null
  credit_hours?: number | null
  has_internal_external_split?: boolean
  internal_max_marks?: number | null
  internal_min_pass?: number | null
  external_max_marks?: number | null
  external_min_pass?: number | null
  components: ComponentPayload[]
}

export interface ExamDatePayload {
  exam_id?: string            // Not required during create-full
  class_id: string
  section_id: string | null
  subject_id: string
  exam_date: string           // yyyy-MM-dd
  start_time?: string | null  // HH:mm
  end_time?: string | null    // HH:mm
  venue?: string | null
  notes?: string | null
}

export interface ExamCreateFull {
  exam: ExamDetailsPayload
  class_sections: ClassSectionPayload[]
  subject_configs: SubjectConfigPayload[]
  exam_dates: ExamDatePayload[]
}

export interface ExamCreateFullResponse {
  id: string
  exam_name: string
  status: ExamStatus
  created_at: string
  class_section_count: number
  subject_config_count: number
  exam_date_count: number
}

export interface ExamListItem {
  id: string
  exam_name: string
  board: ExamBoard
  level: ExamLevel
  exam_type: string
  nature: ExamNature
  status: ExamStatus
  academic_year_id: string
  academic_year_title: string
  mark_entry_deadline: string | null
  created_at: string
}

export interface Exam extends ExamDetailsPayload {
  id: string
  hall_ticket_published: boolean
  hall_ticket_published_at: string | null
  cloned_from_exam_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Exam Class Sections
// ---------------------------------------------------------------------------
export interface ExamClassSection {
  id: string
  exam_id: string
  class_id: string
  section_id: string | null
  stream_id: string | null
  created_at: string
  class_name?: string       // Populated by API join
  section_name?: string
}

// ---------------------------------------------------------------------------
// Exam Subject Config and Components
// ---------------------------------------------------------------------------
export interface ExamSubjectComponent {
  id: string
  subject_config_id: string
  component_name: string
  entry_type: EntryType
  max_marks: number | null
  min_pass_marks: number | null
  include_in_total: boolean
  is_internal: boolean
  remark_grade_set_id: string | null
  sort_order: number
}

export interface ExamSubjectConfig {
  id: string
  exam_id: string
  class_id: string
  section_id: string | null
  subject_id: string
  subject_grade_scheme_id: string | null
  credit_hours: number | null
  has_internal_external_split: boolean
  internal_max_marks: number | null
  internal_min_pass: number | null
  external_max_marks: number | null
  external_min_pass: number | null
  sort_order: number | null
  created_at: string
  updated_at: string
  components: ExamSubjectComponent[]
  subject_name?: string       // Populated by API join
}

// ---------------------------------------------------------------------------
// Exam Dates
// ---------------------------------------------------------------------------
export interface ExamDate {
  id: string
  exam_id: string
  class_id: string
  section_id: string | null
  subject_id: string
  exam_date: string           // yyyy-MM-dd
  start_time: string | null   // HH:mm
  end_time: string | null
  venue: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  subject_name?: string
}

// ---------------------------------------------------------------------------
// Mark Entry
// ---------------------------------------------------------------------------
export interface StudentMark {
  id: string
  exam_id: string
  student_id: string
  subject_config_id: string
  component_id: string
  marks_obtained: number | null
  remark_grade: string | null
  is_absent: boolean
  grace_marks_added: number | null
  attempt_number: number
  entry_source: 'manual' | 'bulk_upload'
  entered_by: string
  entered_at: string
  updated_by: string | null
  updated_at: string | null
}

export interface MarkEntryCreate {
  exam_id: string
  student_id: string
  subject_config_id: string
  component_id: string
  marks_obtained?: number | null
  remark_grade?: string | null
  is_absent?: boolean
}

export interface MarkEntryItem {
  student_id: string
  student_name: string
  admission_number: string
  marks: Record<string, {          // key = component_id
    mark_id: string | null
    marks_obtained: number | null
    remark_grade: string | null
    is_absent: boolean
    updated_at: string | null
  }>
}

// ---------------------------------------------------------------------------
// Mark Permissions
// ---------------------------------------------------------------------------
export interface MarkPermission {
  id: string
  exam_id: string
  user_id: string
  granted_by: string
  granted_at: string
  is_active: boolean
  user_display_name?: string    // Populated by API join
}

// ---------------------------------------------------------------------------
// Hall Ticket Eligibility
// ---------------------------------------------------------------------------
export interface HallTicketEligibility {
  id: string
  exam_id: string
  student_id: string
  attendance_percent: number | null
  attendance_ok: boolean | null
  fee_paid: boolean | null
  is_eligible: boolean
  attendance_override: boolean
  fee_override: boolean
  ineligibility_reason: IneligibilityReason | null
  generated_at: string | null
  overridden_by: string | null
  student_name?: string
  admission_number?: string
  class_name?: string
  section_name?: string
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------
export interface StudentSubjectResult {
  id: string
  exam_result_id: string
  subject_config_id: string
  subject_id: string
  subject_name?: string
  marks_obtained: number | null
  max_marks: number | null
  subject_percent: number | null
  subject_grade: string | null
  subject_gpa: number | null
  subject_remarks: string | null
  is_pass: boolean | null
  is_absent: boolean
  internal_marks: number | null
  external_marks: number | null
  internal_pass: boolean | null
  external_pass: boolean | null
  subject_rank: number | null
}

export interface StudentExamResult {
  id: string
  exam_id: string
  student_id: string
  student_name?: string
  admission_number?: string
  total_marks_obtained: number | null
  total_max_marks: number | null
  overall_percent: number | null
  overall_grade: string | null
  overall_gpa: number | null
  overall_remarks: string | null
  is_pass: boolean | null
  is_absent: boolean
  formative_aggregate_percent: number | null
  class_rank: number | null
  teacher_remarks: string | null
  sgpa: number | null
  computed_at: string | null
  subject_results: StudentSubjectResult[]
}
```

---

## 4. Zod Schemas

File: `src/schemas/examSchemas.ts`

```typescript
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Step 1: Exam Details
// ---------------------------------------------------------------------------
export const examDetailsSchema = z.object({
  exam_name: z.string().min(2, 'Exam name must be at least 2 characters').max(150),
  board: z.enum(['CBSE', 'ICSE', 'State', 'BTech', 'Custom']),
  custom_board_name: z.string().max(100).optional().nullable(),
  level: z.enum([
    'pre_primary', 'primary', 'upper_primary', 'secondary',
    'inter', 'diploma', 'btech', 'mtech', 'iit', 'others',
  ]),
  exam_type: z.string().min(1, 'Exam type is required').max(50),
  nature: z.enum(['formative', 'summative', 'cumulative', 'custom']),
  is_internal: z.boolean().default(true),
  weightage_percent: z.number().min(0).max(100).optional().nullable(),
  academic_year_id: z.string().uuid('Invalid academic year'),
  exam_grade_scheme_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'active', 'published', 'locked', 'finalized']).default('draft'),
  mark_entry_deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be yyyy-MM-dd')
    .optional()
    .nullable(),
  publish_rank: z.boolean().default(false),
  hall_ticket_min_attendance: z.number().min(0).max(100).optional().nullable(),
  attendance_from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  attendance_to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  term: z.string().max(20).optional().nullable(),
}).refine(
  (data) => data.board !== 'Custom' || !!data.custom_board_name,
  { message: 'Custom board name is required when board is Custom', path: ['custom_board_name'] }
)

// ---------------------------------------------------------------------------
// Step 2: Class Sections
// ---------------------------------------------------------------------------
export const classSectionItemSchema = z.object({
  class_id: z.string().uuid('Invalid class ID'),
  section_id: z.string().uuid().nullable(),
})

export const classSectionSchema = z.object({
  class_sections: z
    .array(classSectionItemSchema)
    .min(1, 'Select at least one class-section'),
})

// ---------------------------------------------------------------------------
// Step 3: Subject Config
// ---------------------------------------------------------------------------
export const componentSchema = z.object({
  component_name: z.string().min(1, 'Component name required').max(100),
  entry_type: z.enum(['marks', 'remarks']),
  max_marks: z.number().min(0).max(9999.99).optional().nullable(),
  min_pass_marks: z.number().min(0).optional().nullable(),
  include_in_total: z.boolean().default(true),
  is_internal: z.boolean().default(true),
  remark_grade_set_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
}).refine(
  (data) => data.entry_type !== 'marks' || data.max_marks != null,
  { message: 'Max marks required for marks-type components', path: ['max_marks'] }
).refine(
  (data) => data.entry_type !== 'remarks' || !!data.remark_grade_set_id,
  { message: 'Remark grade set required for remarks-type components', path: ['remark_grade_set_id'] }
)

export const subjectConfigItemSchema = z.object({
  class_id: z.string().uuid(),
  section_id: z.string().uuid().nullable(),
  subject_id: z.string().uuid(),
  subject_grade_scheme_id: z.string().uuid().optional().nullable(),
  credit_hours: z.number().int().min(0).optional().nullable(),
  has_internal_external_split: z.boolean().default(false),
  internal_max_marks: z.number().min(0).optional().nullable(),
  internal_min_pass: z.number().min(0).optional().nullable(),
  external_max_marks: z.number().min(0).optional().nullable(),
  external_min_pass: z.number().min(0).optional().nullable(),
  components: z.array(componentSchema).min(1, 'At least one component required'),
})

export const subjectConfigSchema = z.object({
  subject_configs: z
    .array(subjectConfigItemSchema)
    .min(1, 'At least one subject configuration required'),
})

// ---------------------------------------------------------------------------
// Step 4: Exam Dates
// ---------------------------------------------------------------------------
export const examDateItemSchema = z.object({
  class_id: z.string().uuid(),
  section_id: z.string().uuid().nullable(),
  subject_id: z.string().uuid(),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be yyyy-MM-dd'),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm')
    .optional()
    .nullable(),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm')
    .optional()
    .nullable(),
  venue: z.string().max(100).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
})

export const examDateSchema = z.object({
  exam_dates: z.array(examDateItemSchema),
})

// ---------------------------------------------------------------------------
// Combined wizard schema (all 4 steps)
// ---------------------------------------------------------------------------
export const examCreateFullSchema = examDetailsSchema
  .and(classSectionSchema)
  .and(subjectConfigSchema)
  .and(examDateSchema)

// ---------------------------------------------------------------------------
// Mark Entry
// ---------------------------------------------------------------------------
export const markEntrySchema = z.object({
  exam_id: z.string().uuid(),
  student_id: z.string().uuid(),
  subject_config_id: z.string().uuid(),
  component_id: z.string().uuid(),
  marks_obtained: z.number().min(0).optional().nullable(),
  remark_grade: z.string().max(5).optional().nullable(),
  is_absent: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// Grade Band
// ---------------------------------------------------------------------------
export const gradeBandSchema = z.object({
  from_percent: z.number().min(0).max(100),
  to_percent: z.number().min(0).max(100),
  from_marks: z.number().min(0).optional().nullable(),
  to_marks: z.number().min(0).optional().nullable(),
  grade_label: z.string().min(1).max(10),
  gpa: z.number().min(0).max(10).default(0),
  remarks: z.string().max(100).optional().nullable(),
  is_pass: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
}).refine(
  (data) => data.from_percent <= data.to_percent,
  { message: 'From percent must be <= to percent', path: ['from_percent'] }
)

export type ExamDetailsFormData = z.infer<typeof examDetailsSchema>
export type ClassSectionFormData = z.infer<typeof classSectionSchema>
export type SubjectConfigFormData = z.infer<typeof subjectConfigSchema>
export type ExamDateFormData = z.infer<typeof examDateSchema>
export type ExamCreateFullFormData = z.infer<typeof examCreateFullSchema>
export type MarkEntryFormData = z.infer<typeof markEntrySchema>
export type GradeBandFormData = z.infer<typeof gradeBandSchema>
```

---

## 5. React Query Hooks

File: `src/hooks/useExam.ts`

```typescript
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query'
import * as examService from '../services/examService'
import type {
  ExamStatus,
  ExamNature,
  ExamCreateFull,
  ExamDetailsPayload,
  ExamDatePayload,
  MarkEntryCreate,
  BoardPatternCreate,
} from '../types/exam'

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------
export const examKeys = {
  all: ['exams'] as const,
  lists: () => [...examKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...examKeys.lists(), filters] as const,
  details: () => [...examKeys.all, 'detail'] as const,
  detail: (id: string) => [...examKeys.details(), id] as const,

  settings: ['examSettings'] as const,

  boardPatterns: ['boardPatterns'] as const,
  boardPattern: (id: string) => [...examKeys.boardPatterns, id] as const,

  examSchemes: ['examGradeSchemes'] as const,
  subjectSchemes: ['subjectGradeSchemes'] as const,
  remarkSets: ['remarkGradeSets'] as const,

  dates: (examId: string) => ['examDates', examId] as const,

  marks: (examId: string, classId: string, sectionId: string, subjectConfigId: string) =>
    ['marks', examId, classId, sectionId, subjectConfigId] as const,

  permissions: (examId: string) => ['markPermissions', examId] as const,

  eligibility: (examId: string) => ['hallTicketEligibility', examId] as const,

  results: (examId: string, studentId?: string) =>
    studentId
      ? ['results', examId, studentId]
      : ['results', examId],
}

// ---------------------------------------------------------------------------
// Exam List
// ---------------------------------------------------------------------------
export function useExamList(filters?: { academic_year_id?: string; status?: ExamStatus; nature?: ExamNature }) {
  return useQuery({
    queryKey: examKeys.list(filters ?? {}),
    queryFn: () => examService.listExams(filters).then((r) => r.data),
    staleTime: 1000 * 60 * 2,   // 2 minutes — exam list does not change often
  })
}

// ---------------------------------------------------------------------------
// Exam Detail
// ---------------------------------------------------------------------------
export function useExamDetail(examId: string, options?: Partial<UseQueryOptions>) {
  return useQuery({
    queryKey: examKeys.detail(examId),
    queryFn: () => examService.getExam(examId).then((r) => r.data),
    enabled: !!examId,
    staleTime: 1000 * 60 * 1,
    ...options,
  })
}

// ---------------------------------------------------------------------------
// Create Exam (full wizard)
// ---------------------------------------------------------------------------
export function useCreateExamFull() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ExamCreateFull) => examService.createExamFull(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() })
    },
  })
}

// ---------------------------------------------------------------------------
// Update Exam
// ---------------------------------------------------------------------------
export function useUpdateExam(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ExamDetailsPayload>) =>
      examService.updateExam(examId, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) })
      queryClient.invalidateQueries({ queryKey: examKeys.lists() })
    },
  })
}

// ---------------------------------------------------------------------------
// Delete Exam
// ---------------------------------------------------------------------------
export function useDeleteExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (examId: string) => examService.deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() })
    },
  })
}

// ---------------------------------------------------------------------------
// Clone Exam
// ---------------------------------------------------------------------------
export function useCloneExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ examId, data }: { examId: string; data?: { new_name?: string; academic_year_id?: string } }) =>
      examService.cloneExam(examId, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() })
    },
  })
}

// ---------------------------------------------------------------------------
// Grading Schemes — for dropdowns in wizard
// ---------------------------------------------------------------------------
export function useGradingSchemes() {
  const examSchemes = useQuery({
    queryKey: examKeys.examSchemes,
    queryFn: () => examService.listExamGradeSchemes().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
  const subjectSchemes = useQuery({
    queryKey: examKeys.subjectSchemes,
    queryFn: () => examService.listSubjectGradeSchemes().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
  return { examSchemes, subjectSchemes }
}

// ---------------------------------------------------------------------------
// Board Patterns — for wizard dropdowns
// ---------------------------------------------------------------------------
export function useBoardPatterns(params?: { board?: string; level?: string }) {
  return useQuery({
    queryKey: [...examKeys.boardPatterns, params ?? {}],
    queryFn: () => examService.listBoardPatterns(params).then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  })
}

// ---------------------------------------------------------------------------
// Remark Grade Sets — for mark entry cell dropdowns
// ---------------------------------------------------------------------------
export function useRemarkGradeSets() {
  return useQuery({
    queryKey: examKeys.remarkSets,
    queryFn: () => examService.listRemarkGradeSets().then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  })
}

// ---------------------------------------------------------------------------
// Mark Entry — GET marks grid
// ---------------------------------------------------------------------------
export function useMarkEntry(
  examId: string,
  classId: string,
  sectionId: string,
  subjectConfigId: string,
  page = 1,
) {
  return useQuery({
    queryKey: [...examKeys.marks(examId, classId, sectionId, subjectConfigId), page],
    queryFn: () =>
      examService
        .getMarks({ exam_id: examId, class_id: classId, section_id: sectionId, subject_config_id: subjectConfigId, page, page_size: 50 })
        .then((r) => r.data),
    enabled: !!examId && !!classId && !!sectionId && !!subjectConfigId,
    staleTime: 30_000,    // 30 seconds — marks change frequently
  })
}

// ---------------------------------------------------------------------------
// Upsert Marks (single row — auto-save on blur)
// ---------------------------------------------------------------------------
export function useUpsertMarks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MarkEntryCreate) => examService.upsertMarks(data).then((r) => r.data),
    // Optimistic update: update the cache immediately, revert on error
    onMutate: async (newMark) => {
      const key = examKeys.marks(
        newMark.exam_id,
        '', // classId not part of individual mark — invalidate broader
        '',
        newMark.subject_config_id,
      )
      await queryClient.cancelQueries({ queryKey: ['marks', newMark.exam_id] })
      const snapshot = queryClient.getQueriesData({ queryKey: ['marks', newMark.exam_id] })
      return { snapshot }
    },
    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        context.snapshot.forEach(([key, data]) => {
          queryClient.setQueryData(key, data)
        })
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marks', variables.exam_id] })
    },
  })
}

// ---------------------------------------------------------------------------
// Bulk Upsert Marks (Excel upload result)
// ---------------------------------------------------------------------------
export function useBulkUpsertMarks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (marks: MarkEntryCreate[]) =>
      examService.bulkUpsertMarks(marks).then((r) => r.data),
    onSuccess: (_data, variables) => {
      const examId = variables[0]?.exam_id
      if (examId) {
        queryClient.invalidateQueries({ queryKey: ['marks', examId] })
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Hall Ticket Eligibility
// ---------------------------------------------------------------------------
export function useHallTicketEligibility(examId: string) {
  const eligible = useQuery({
    queryKey: [...examKeys.eligibility(examId), 'eligible'],
    queryFn: () => examService.getEligibleStudents(examId).then((r) => r.data),
    enabled: !!examId,
    staleTime: 60_000,
  })
  const ineligible = useQuery({
    queryKey: [...examKeys.eligibility(examId), 'ineligible'],
    queryFn: () => examService.getIneligibleStudents(examId).then((r) => r.data),
    enabled: !!examId,
    staleTime: 60_000,
  })
  return { eligible, ineligible }
}

// ---------------------------------------------------------------------------
// Publish Results — with confirmation guard (caller must confirm before calling)
// ---------------------------------------------------------------------------
export function usePublishResults(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => examService.publishResults(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) })
      queryClient.invalidateQueries({ queryKey: examKeys.results(examId) })
      queryClient.invalidateQueries({ queryKey: examKeys.lists() })
    },
  })
}

// ---------------------------------------------------------------------------
// Student Results
// ---------------------------------------------------------------------------
export function useStudentResults(examId: string, studentId?: string) {
  return useQuery({
    queryKey: examKeys.results(examId, studentId),
    queryFn: () =>
      studentId
        ? examService.getStudentResult(examId, studentId).then((r) => r.data)
        : examService.getStudentResults(examId).then((r) => r.data),
    enabled: !!examId,
    staleTime: 1000 * 60 * 2,
  })
}

// ---------------------------------------------------------------------------
// Exam Settings
// ---------------------------------------------------------------------------
export function useExamSettings() {
  return useQuery({
    queryKey: examKeys.settings,
    queryFn: () => examService.getExamSettings().then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  })
}

export function useUpdateExamSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof examService.updateExamSettings>[0]) =>
      examService.updateExamSettings(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.settings })
    },
  })
}

// ---------------------------------------------------------------------------
// Mark Permissions
// ---------------------------------------------------------------------------
export function useMarkPermissions(examId: string) {
  return useQuery({
    queryKey: examKeys.permissions(examId),
    queryFn: () => examService.listMarkPermissions(examId).then((r) => r.data),
    enabled: !!examId,
    staleTime: 60_000,
  })
}

export function useGrantMarkPermission(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => examService.grantMarkPermission(examId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.permissions(examId) })
    },
  })
}

export function useRevokeMarkPermission(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (permId: string) => examService.revokeMarkPermission(examId, permId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.permissions(examId) })
    },
  })
}
```

---

## 6. Screen Specifications (23 Screens)

### Sprint 1 — Grading Setup (Pre-Exam Configuration)

---

#### S01: Exam Settings

| Property | Value |
|---|---|
| Route | `/exam/settings` |
| Component | `ExamSettings` |
| Role Access | Admin only |
| API Calls | `GET /exam/settings/`, `PUT /exam/settings/` |
| Phase | Sprint 1 |

**Purpose:** Configure school-wide exam defaults — default board, hall ticket attendance threshold, grace marks policy, exam fee type linkage.

**Key State:**
- `useExamSettings()` query
- `useUpdateExamSettings()` mutation
- React Hook Form with `examDetailsSchema` partial

**Component Layout:**
```
┌─────────────────────────────────────────────┐
│  Exam Settings                              │
│─────────────────────────────────────────────│
│  Default Board      [ CBSE ▼ ]              │
│  Custom Board Name  [ _____________ ]       │
│  Min Attendance %   [ 75.00       ]         │
│  Exam Fee Type      [ Select fee ▼ ]        │
│  Grace (per subj)   [ 2  ]                  │
│  Grace (max subj)   [ 3  ]                  │
│  Auto-apply grace   [x]                     │
│  Reconduct max fail [ 2  ]                  │
│                                             │
│  [ Save Settings ]                          │
└─────────────────────────────────────────────┘
```

**Error States:**
- 422: Map field errors to form inputs via `handleExamApiError`
- 400: Show toast with backend message

---

#### S02: Board Pattern Setup

| Property | Value |
|---|---|
| Route | `/exam/board-patterns` |
| Component | `BoardPatternSetup` |
| Role Access | Admin only |
| API Calls | `GET /exam/board-patterns/`, `POST /exam/board-patterns/`, `PUT ./{id}/`, `DELETE ./{id}/` |
| Phase | Sprint 1 |

**Purpose:** Define exam type patterns per board + education level (e.g., CBSE-Primary has FA1, FA2, SA1, SA2 with weightages).

**Key State:**
- `useBoardPatterns()` query
- Selected pattern for editing
- Inline exam-types table (add/edit/delete rows)

**Component Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  Board Patterns            [ + New Pattern ]             │
│──────────────────────────────────────────────────────────│
│  Board     Level       Types     Status   Actions        │
│  CBSE      Primary     4         Active   [Edit][Delete] │
│  CBSE      Secondary   2         Active   [Edit][Delete] │
│──────────────────────────────────────────────────────────│
│  [Edit Panel — slides in as drawer]                      │
│  Board: [ CBSE ▼ ]   Level: [ Primary ▼ ]               │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Type Name  Nature    Weightage%  Count/yr  Order   │  │
│  │ FA1        formative  10         2         1   [x] │  │
│  │ SA1        summative  40         1         3   [x] │  │
│  │ [ + Add Type ]                                     │  │
│  └────────────────────────────────────────────────────┘  │
│  [ Save Pattern ]                                        │
└──────────────────────────────────────────────────────────┘
```

**Error States:**
- 409: Duplicate board+level combination — show inline error on the board/level selectors
- 422: Field-level errors

---

#### S03: Exam Grade Scheme List + Create

| Property | Value |
|---|---|
| Route | `/exam/grading/exam-schemes` |
| Component | `ExamGradeSchemes` |
| Role Access | Admin only |
| API Calls | `GET /exam/grading/exam-schemes/`, `POST`, `PUT ./{id}/`, `DELETE ./{id}/`, bands sub-endpoints |
| Phase | Sprint 1 |

**Purpose:** Create and manage grade schemes that map grand total percentage ranges to letter grades (A+, A, B, ...) with GPA and pass/fail designation.

**Key State:**
- `useQuery` on exam schemes
- Drawer or expanded row for `GradeBandEditor` component
- Inline add/edit/delete bands

**Component Layout:**
```
┌────────────────────────────────────────────────────────┐
│  Exam Grade Schemes           [ + New Scheme ]         │
│────────────────────────────────────────────────────────│
│  Name              Default   Bands   Actions           │
│  CBSE Standard     [*]       9       [Edit][Delete]    │
│  Diploma Scheme    [ ]       6       [Edit][Delete]    │
│────────────────────────────────────────────────────────│
│  [Expanded row — GradeBandEditor component]            │
│  From%  To%  Grade  GPA  Remarks  Pass?  Order  Del   │
│  91     100  A+     10   Excellent  [x]   1      [x]  │
│  81      90  A       9   Very Good  [x]   2      [x]  │
│  [ + Add Band ]                             [ Save ]   │
└────────────────────────────────────────────────────────┘
```

**Error States:**
- Delete blocked if scheme is in use by an exam — show toast "This scheme is used by [n] exams."
- Overlapping band ranges — validate client-side before submit

---

#### S04: Subject Grade Scheme List + Create

| Property | Value |
|---|---|
| Route | `/exam/grading/subject-schemes` |
| Component | `SubjectGradeSchemes` |
| Role Access | Admin only |
| API Calls | `GET /exam/grading/subject-schemes/`, `POST`, bands sub-endpoints |
| Phase | Sprint 1 |

**Purpose:** Same as S03 but for per-subject grade calculation. Often identical structure but may differ in pass thresholds per subject.

**Note:** Identical UI pattern to S03 — can share `GradeBandEditor` component. Only the title and API calls differ.

---

#### S05: Remark Grade Sets

| Property | Value |
|---|---|
| Route | `/exam/grading/remarks` |
| Component | `RemarkGradeSets` |
| Role Access | Admin only |
| API Calls | `GET /exam/remark-grade-sets/`, `POST`, `PUT ./{id}/`, `DELETE ./{id}/` |
| Phase | Sprint 1 |

**Purpose:** Define named sets of remark grades (e.g., "Primary Remarks Set": A=Excellent, B=Good, C=Satisfactory, D=Needs Improvement). Used by remarks-type mark components.

**Component Layout:**
```
┌─────────────────────────────────────────────────┐
│  Remark Grade Sets           [ + New Set ]      │
│─────────────────────────────────────────────────│
│  Set Name              Options   Actions        │
│  Primary Remarks Set   4         [Edit][Delete] │
│  Activity Grades       5         [Edit][Delete] │
│─────────────────────────────────────────────────│
│  [Expanded Row]                                 │
│  Letter  Label         Order   Del              │
│  A       Excellent     1       [x]              │
│  B       Good          2       [x]              │
│  [ + Add Option ]              [ Save ]         │
└─────────────────────────────────────────────────┘
```

---

### Sprint 2 — Exam Creation

---

#### S06: Exam List

| Property | Value |
|---|---|
| Route | `/exam/exams` |
| Component | `ExamList` |
| Role Access | Admin (all), Teacher/Clerk (active+published), Student/Parent (published) |
| API Calls | `GET /exam/exams/?academic_year_id=&status=` |
| Phase | Sprint 2 |

**Purpose:** Browse all exams for the active academic year. Navigate to detail, create new, or clone existing.

**Key State:**
- `useExamList(academicYearId)` query
- Filter bar: academic year selector, status filter, nature filter
- Optimistic delete (admin, draft-only)

**Component Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Exams                               [ + Create Exam ]           │
│  AY: [ 2024-25 ▼ ]   Status: [ All ▼ ]   Nature: [ All ▼ ]      │
│──────────────────────────────────────────────────────────────────│
│  Exam Name    Board  Level     Nature     Status    Actions       │
│  FA1 2024-25  CBSE   Primary   Formative  [active]  [View][...] │
│  SA1 2024-25  CBSE   Primary   Summative  [draft]   [View][...] │
│──────────────────────────────────────────────────────────────────│
│  Loading state: skeleton rows (3 rows)                           │
│  Empty state: "No exams found. Create your first exam."          │
└──────────────────────────────────────────────────────────────────┘
```

**Status Badge Colors:**
- `draft` → gray
- `active` → blue
- `published` → green
- `locked` → amber
- `finalized` → purple

**Error States:**
- Network error: show retry button
- 403: redirect to `/error/403`

---

#### S07: Create Exam (4-Step Wizard — One Screen)

| Property | Value |
|---|---|
| Route | `/exam/exams/create` |
| Component | `CreateExam` using `ExamWizard` |
| Role Access | Admin only |
| API Calls | `POST /exam/exams/create-full/` (single call on Save) |
| Phase | Sprint 2 |

**CRITICAL DESIGN NOTE:** All four steps are on ONE screen. No pagination, no separate routes per step. Data is collected locally in the `ExamWizard` component's local state (and backed by Zustand store for persistence across navigation). There is ONE Save button at the bottom. ONE POST request is made. If it fails, nothing is saved and the error is shown inline at the appropriate accordion section.

```
┌────────────────────────────────────────────────────────────────────┐
│  Create Exam                                                        │
│────────────────────────────────────────────────────────────────────│
│  [1] Exam Details                                          [✓ / ▼] │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Exam Name: [ FA1 2024-25         ]                           │  │
│  │ Board:     [ CBSE ▼ ]   Level: [ Primary ▼ ]                │  │
│  │ Exam Type: [ FA1 ▼ ]   Nature: [ Formative ▼ ]              │  │
│  │ Acad Year: [ 2024-25 ▼ ]  Grade Scheme: [ CBSE Std ▼ ]      │  │
│  │ Mark Deadline: [ 2024-10-15 ]   Min Attend%: [ 75 ]         │  │
│  │ Attend From: [ 2024-06-01 ] To: [ 2024-09-30 ]              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [2] Class & Sections                                      [✓ / ▼] │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ClassSectionSelector component                              │  │
│  │  [x] Class 1 - A    [x] Class 1 - B    [ ] Class 2 - A      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [3] Subject Config                                        [✓ / ▼] │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SubjectConfigAccordion per class-section                    │  │
│  │  Class 1 - A  >                                              │  │
│  │    Maths: Written [80] Oral [20] Passing [35]                │  │
│  │    English: Written [100] Passing [35]                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [4] Exam Dates                                            [✓ / ▼] │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Subject   Class  Date        Start  End    Venue            │  │
│  │  Maths     1-A    2024-10-10  09:00  12:00  Hall A           │  │
│  │  [ Apply dates to all sections ]                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [ Cancel ]                              [ Save Exam ]             │
│  (full-page overlay spinner while POST is in flight)               │
└────────────────────────────────────────────────────────────────────┘
```

**Key State:**
- `useExamStore()` Zustand store — wizard data persists if user navigates away
- `useCreateExamFull()` mutation
- Loading: full-page overlay spinner (not inline — creation is atomic)
- Completed accordion steps show a green checkmark in the header

**422 Error Handling:**
- Parse `detail[].loc` to identify which wizard step contains the error
  - `loc[1] == 'exam'` → scroll to accordion 1, highlight field
  - `loc[1] == 'class_sections'` → scroll to accordion 2
  - `loc[1] == 'subject_configs'` → scroll to accordion 3 with subject+class context
  - `loc[1] == 'exam_dates'` → scroll to accordion 4
- Show which subject + class combination failed (e.g., "Maths, Class 1-A: max_marks required")

---

#### S08: Exam Detail / Edit

| Property | Value |
|---|---|
| Route | `/exam/exams/:id` |
| Component | `ExamDetail` |
| Role Access | Admin (edit), Teacher/Student/Parent (read after published) |
| API Calls | `GET /exam/exams/:id/`, `PUT /exam/exams/:id/` |
| Phase | Sprint 2 |

**Purpose:** View exam details, edit exam-level fields (name, deadline, status), navigate to related screens (Dates, Marks, Results, Permissions).

**Component Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  < Back to Exams                                        │
│  FA1 2024-25                        [active]            │
│─────────────────────────────────────────────────────────│
│  Board: CBSE | Level: Primary | Type: FA1 | Formative   │
│  Academic Year: 2024-25                                  │
│  Mark Entry Deadline: 15 Oct 2024                        │
│─────────────────────────────────────────────────────────│
│  Tabs: [Overview] [Dates] [Marks] [Permissions] [Audit] │
│─────────────────────────────────────────────────────────│
│  Quick Actions:                                         │
│  [Edit Details]  [Clone Exam]  [Delete Exam]*           │
│  *Delete only visible if status = draft                 │
└─────────────────────────────────────────────────────────┘
```

---

#### S09: Clone Exam

| Property | Value |
|---|---|
| Route | Modal on S08 (`/exam/exams/:id`) |
| Component | `CloneExamModal` |
| Role Access | Admin only |
| API Calls | `POST /exam/exams/:id/clone/` |
| Phase | Sprint 2 |

**Purpose:** Create a new exam from an existing one — copies structure (class-sections, subject configs, components) but NOT marks. Useful for repeating exam patterns each term.

**Modal Fields:**
- New exam name (pre-filled with original + " (Copy)")
- Target academic year (default: same year)
- Checkbox: "Copy exam dates" (optional)

**After Success:** Navigate to the newly created exam's detail page.

---

### Sprint 3 — Dates & Permissions

---

#### S10: Exam Date Management

| Property | Value |
|---|---|
| Route | `/exam/exams/:id/dates` |
| Component | `ExamDates` |
| Role Access | Admin (full), Class Teacher (own class-section only) |
| API Calls | `GET /exam/dates/?exam_id=`, `POST /exam/dates/`, `POST /exam/dates/bulk/`, `PUT ./{id}/`, `DELETE ./{id}/` |
| Phase | Sprint 3 |

**Purpose:** Add, edit, or delete exam date entries after the exam has been created. Also provides "Apply to all sections" bulk copy.

**Key State:**
- `useExamDates(examId)` query
- Inline editing rows
- "Apply to all sections" button triggers `bulkCreateExamDates`

**Component Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  Exam Dates — FA1 2024-25       [ + Add Date ] [ Bulk ]    │
│  Filter: Class [ All ▼ ] Section [ All ▼ ]                 │
│────────────────────────────────────────────────────────────│
│  Subject   Class  Section  Date        Start  End   Action │
│  Maths     1      A        10 Oct 24   09:00  12:00  [✏][x]│
│  English   1      A        11 Oct 24   09:00  12:00  [✏][x]│
│  Maths     1      B        10 Oct 24   —       —     [✏][x]│
│────────────────────────────────────────────────────────────│
│  [Copy Maths dates to all sections of Class 1]             │
└────────────────────────────────────────────────────────────┘
```

---

#### S11: Mark Entry Permissions

| Property | Value |
|---|---|
| Route | `/exam/exams/:id/permissions` |
| Component | `MarkPermissions` |
| Role Access | Admin only |
| API Calls | `GET /exam/exams/:id/permissions/`, `POST`, `DELETE ./{perm_id}/` |
| Phase | Sprint 3 |

**Purpose:** Admin delegates mark-entry access for a specific exam to Clerk/CA/Data Entry staff. This is per-exam and revocable at any time.

**Key State:**
- `useMarkPermissions(examId)` query
- Staff search autocomplete (searches users with role=clerk or role=ca)
- Confirmation dialog on revoke

**Component Layout:**
```
┌───────────────────────────────────────────────────────┐
│  Mark Entry Permissions — FA1 2024-25                 │
│  Who can enter marks for this exam?                   │
│───────────────────────────────────────────────────────│
│  Permitted Users:                                     │
│  Name           Role    Granted By   Granted At   Del │
│  Priya Sharma   Clerk   Admin        25 Feb 2026  [x] │
│  Ravi Kumar     CA      Admin        25 Feb 2026  [x] │
│───────────────────────────────────────────────────────│
│  Add User: [ Search staff... ▼ ]  [ Grant Access ]    │
│───────────────────────────────────────────────────────│
│  Note: Teachers can always enter marks for their      │
│  assigned subjects. This panel is for Clerk/CA only.  │
└───────────────────────────────────────────────────────┘
```

**Error States:**
- Grant: 400 if user is already granted — show toast "User already has access."
- Revoke: confirmation required — "This will prevent [user name] from entering marks for this exam."

---

### Sprint 4 — Mark Entry

---

#### S12: Mark Entry Grid

| Property | Value |
|---|---|
| Route | `/exam/marks/:examId/:classId/:sectionId/:subjectConfigId` |
| Component | `MarkEntryGrid` |
| Role Access | Admin, Teacher (own subject), Clerk/CA (permitted exams) |
| API Calls | `GET /exam/marks/`, `POST /exam/marks/` (per row on blur) |
| Phase | Sprint 4 |

**Purpose:** Primary mark entry interface. A grid of students (rows) × components (columns). Auto-saves on blur. Absent toggle replaces numeric input with "ABS" label. Remarks-type components show a dropdown of grade options.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Mark Entry: FA1 2024-25 | Maths | Class 1 - A                           │
│  [ < Back ]  Page 1 / 3 (50 students per page)   [ Upload Excel ] [↓ Tpl]│
│──────────────────────────────────────────────────────────────────────────│
│  Student                Adm#   Written(80)  Oral(20)   Remarks(A-D)  Save │
│  Aarav Singh            A001   [  72 ]      [ 18 ]     [ A    ▼ ]   ✓    │
│  Ananya Reddy           A002   [ ABS ]      [ ABS ]    [ ABS  ▼ ]   ✓    │
│  Rohan Mehta            A003   [  65 ]      [ 15 ]     [ B    ▼ ]   ✓    │
│  Priya Joshi            A004   [      ]     [    ]     [      ▼ ]        │
│──────────────────────────────────────────────────────────────────────────│
│  Row-level indicators:                                                    │
│  ✓ = saved  | ○ = saving... | ! = error (hover for detail)               │
│  ⚠ = stale (server updated_at > loaded_at — concurrent edit warning)     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key State:**
- `useMarkEntry(...)` query for initial data
- `useUpsertMarks()` mutation — called on cell blur (per row)
- `loadedAt: Date` timestamp — compare with `updated_at` from GET response to detect concurrent edits
- Absent toggle: sets `is_absent = true` for all components in row; replaces cells with "ABS"
- Pagination: max 50 students per page — `page` param in query
- Teacher role: only sees columns for components they are authorized on (backend enforces scope)

**Validation:**
- `marks_obtained <= max_marks` — red border + tooltip if violated
- Float values: accepted (e.g., 72.5)
- Empty cell ≠ absent — only `is_absent` toggle sets absent

**Concurrent Edit Warning:**
- On blur, if API returns a `StudentMark` with `updated_at > loadedAt`, show a yellow warning row: "This row was updated by another user. Reload to see latest."

---

#### S13: Excel Upload

| Property | Value |
|---|---|
| Route | Modal on S12 |
| Component | `ExcelUploadModal` |
| Role Access | Admin, Teacher, Clerk/CA |
| API Calls | `GET /exam/marks/template/` (download), `POST /exam/marks/upload/` |
| Phase | Sprint 4 |

**Purpose:** Download pre-populated Excel template (student names, component columns), fill offline, upload for bulk mark entry.

**Modal Flow:**
1. Download template button → triggers `getMarkTemplate()` → save as `FA1_Maths_Class1A.xlsx`
2. "Upload filled template" → file input → `uploadMarks(formData)`
3. Show upload result: success count, error rows with row number + reason
4. Confirm to apply → `useBulkUpsertMarks()`
5. On success: invalidate marks query → grid refreshes

---

#### S14: Mark Entry Summary

| Property | Value |
|---|---|
| Route | `/exam/marks/:examId/summary` |
| Component | `MarkEntrySummary` |
| Role Access | Admin, Clerk/CA |
| API Calls | `GET /exam/exams/:id/` (for exam details), `GET /exam/marks/` (aggregated per class) |
| Phase | Sprint 4 |

**Purpose:** Overview of mark entry completion status across all classes and subjects for an exam. Shows which class-section-subject combinations have 0%, partial, or 100% entries.

**Component Layout:**
```
┌────────────────────────────────────────────────────────┐
│  Mark Entry Summary — FA1 2024-25                      │
│────────────────────────────────────────────────────────│
│  Class    Section  Subject   Entered  Total  Complete  │
│  Class 1  A        Maths     48       50     96%   ▓▓▓░│
│  Class 1  A        English   50       50     100%  ▓▓▓▓│
│  Class 1  B        Maths     0        48     0%    ░░░░│
│────────────────────────────────────────────────────────│
│  Click row to navigate to that Mark Entry Grid         │
└────────────────────────────────────────────────────────┘
```

---

### Sprint 5-6 — Results

---

#### S15: Aggregate Compute / Publish Results

| Property | Value |
|---|---|
| Route | `/exam/exams/:id/results` |
| Component | `ResultsPublish` |
| Role Access | Admin only |
| API Calls | `POST /exam/exams/:id/compute/`, `GET /exam/exams/:id/results/`, `POST /exam/exams/:id/publish/` |
| Phase | Sprint 5-6 |

**Purpose:** Trigger aggregate computation for the exam, review computed results, and publish to students.

**Key State:**
- Compute button triggers long-running job (show spinner + polling or WebSocket if available)
- Results table shows computed aggregates
- Publish button requires confirmation dialog (irreversible)

**Component Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  Publish Results — FA1 2024-25                               │
│──────────────────────────────────────────────────────────────│
│  Status: [active]   Last computed: 25 Feb 2026, 14:30        │
│                                                              │
│  [ Compute Aggregates ]  (re-computes from current marks)    │
│──────────────────────────────────────────────────────────────│
│  Class 1 - A Results                    Filter: [Class ▼]    │
│  Student         Total  %      Grade  Pass?  Rank            │
│  Aarav Singh     90/100 90.00  A+     Yes    1               │
│  Ananya Reddy    72/100 72.00  B      Yes    5               │
│  Rohan Mehta     45/100 45.00  D      No     42              │
│──────────────────────────────────────────────────────────────│
│  [ Publish Results ]  ← confirmation dialog required        │
│  Once published, students can view results. Irreversible     │
│  without admin unlock.                                       │
└──────────────────────────────────────────────────────────────┘
```

**Confirmation Dialog:** "Once published, students can view results. This cannot be undone without admin unlock."

---

#### S16: Student Results View

| Property | Value |
|---|---|
| Route | `/exam/results/:examId` |
| Component | `StudentResults` |
| Role Access | Student (own only), Admin (all + filter), Parent (child only) |
| API Calls | `GET /exam/exams/:id/results/` |
| Phase | Sprint 6 |

**Purpose:** View published exam results. Role-scoped: student sees only their own result. Admin can filter by class/section.

**Key State:**
- `useStudentResults(examId, studentId?)` — studentId populated from auth context for student/parent
- Admin: shows `ResultsTable` with class/section filter
- Student/Parent: shows single `StudentResultCard`

**Component Layout (Admin View):**
```
┌─────────────────────────────────────────────────────────────┐
│  FA1 2024-25 Results       Class [1▼] Section [A▼] [Export] │
│─────────────────────────────────────────────────────────────│
│  Student       Total   %     Grade  Pass?  Rank  Actions    │
│  Aarav Singh   90/100  90%   A+     Yes    1     [View]     │
│  Ananya Reddy  72/100  72%   B      Yes    5     [View]     │
│─────────────────────────────────────────────────────────────│
│  Pass: 46  Fail: 4  Absent: 0                               │
└─────────────────────────────────────────────────────────────┘
```

---

#### S17: Report Card Download

| Property | Value |
|---|---|
| Route | On S16 (download button per student) |
| Role Access | Admin (all), Student (own), Parent (child) |
| API Calls | `GET /exam/exams/:id/results/:studentId/` (PDF blob) |
| Phase | Sprint 6 |

**Purpose:** Download PDF report card for a student. Triggers server-side PDF generation (WeasyPrint).

**UX:** Show a "Generating report card..." spinner while the PDF blob is being fetched. Then trigger browser download via `URL.createObjectURL`.

---

### Sprint 7 — Hall Tickets

---

#### S18: Hall Ticket Eligibility

| Property | Value |
|---|---|
| Route | `/exam/hall-tickets/:examId` |
| Component | `HallTicketEligibility` using `EligibilityPanel` |
| Role Access | Admin only |
| API Calls | `POST /exam/exams/:id/hall-tickets/generate/`, `GET .../eligible/`, `GET .../ineligible/`, `PUT .../{studentId}/override/`, `POST .../publish/` |
| Phase | Sprint 7 |

**Purpose:** Review and manage student eligibility for hall tickets. Two panels: Eligible | Ineligible. Admin can override individual students. Publish makes hall tickets visible to eligible students.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Hall Ticket Eligibility — FA1 2024-25                              │
│  [ Compute Eligibility ]   Last run: 25 Feb 2026, 10:00             │
│─────────────────────────────────────────────────────────────────────│
│  ELIGIBLE (44)                   │  INELIGIBLE (6)                  │
│  ───────────────────────────── ─ │ ─ ────────────────────────────── │
│  Aarav Singh       A001  [Elig.] │  [Low Attendance (3)]            │
│  Ananya Reddy      A002  [Elig.] │    Ravi Kumar  A011  [Override]  │
│  Rohan Mehta       A003  [Elig.] │    Sita Devi   A015  [Override]  │
│                                  │  [Fee Pending (2)]               │
│                                  │    Arun Patel  A022  [Override]  │
│                                  │  [Both (1)]                      │
│                                  │    Meena Joshi A031  [Override]  │
│─────────────────────────────────────────────────────────────────────│
│  [ Publish Hall Tickets ]   ← confirmation dialog required          │
└─────────────────────────────────────────────────────────────────────┘
```

**Override Flow:**
- Admin clicks [Override] on an ineligible student
- Dialog shows: "Override attendance requirement for Ravi Kumar?"
- Toggles `attendance_override = true` → student moves to Eligible panel
- Changes are persisted immediately (PUT request)

**Confirmation Dialog (Publish):** "Hall tickets will be visible to eligible students immediately after publishing."

---

#### S19: Hall Ticket Download (Student View)

| Property | Value |
|---|---|
| Route | `/exam/hall-tickets/:examId/download` |
| Component | `HallTicketDownload` |
| Role Access | Student (own only), Parent (child only) |
| API Calls | `GET /exam/exams/:id/hall-tickets/eligible/` (check own eligibility), `GET .../download/` (PDF blob) |
| Phase | Sprint 7 |

**Purpose:** Student-facing hall ticket download page. If eligible: show download button. If ineligible: show reason and action required.

**Eligible State:**
```
┌───────────────────────────────────────────┐
│  Hall Ticket — FA1 2024-25               │
│  Welcome, Aarav Singh (A001)             │
│                                           │
│  Your hall ticket is ready.              │
│                                           │
│  [ Download Hall Ticket (PDF) ]           │
└───────────────────────────────────────────┘
```

**Ineligible — Fee Pending:**
```
┌───────────────────────────────────────────┐
│  Hall Ticket — FA1 2024-25               │
│  Welcome, Ravi Kumar (A011)              │
│                                           │
│  [!] You are not eligible for a hall     │
│  ticket for this exam.                   │
│                                           │
│  Reason: Exam fee payment is pending.    │
│  Please clear your exam fees. Only then  │
│  you are eligible.                        │
└───────────────────────────────────────────┘
```

**Ineligible — Low Attendance:**
- "Your attendance is below the required 75%. Please contact your class teacher."

**Ineligible — Both:**
- Show both messages stacked.

---

#### S20: Hall Ticket Preview (Admin)

| Property | Value |
|---|---|
| Route | Modal on S18 |
| Component | `HallTicketCard` |
| Role Access | Admin only |
| API Calls | `GET /exam/exams/:id/hall-tickets/download/` (for a specific student) |
| Phase | Sprint 7 |

**Purpose:** Admin can preview a single student's hall ticket before publishing. Uses `HallTicketCard` component.

---

### Supporting Screens

---

#### S21: Exam Notification Compose

| Property | Value |
|---|---|
| Route | `/exam/exams/:id/notify` |
| Component | `ExamNotification` |
| Role Access | Admin only |
| API Calls | `POST /exam/exams/:id/notify/` |
| Phase | Sprint 7+ |

**Purpose:** Compose and send exam-related notifications to students/parents via SMS, WhatsApp, or push notification. Target: all, failed only, eligible, or ineligible students.

**Fields:** Message text, channels (multi-select), target group, preview count before send.

---

#### S22: Exam Audit Log

| Property | Value |
|---|---|
| Route | `/exam/exams/:id/audit` |
| Component | `AuditLog` |
| Role Access | Admin only |
| API Calls | `GET /exam/audit/?exam_id=` |
| Phase | Sprint 7+ |

**Purpose:** Immutable audit trail of all exam-related actions (mark entry, corrections, publish, unlock, grace marks, etc.).

**Component Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  Audit Log — FA1 2024-25          Filter: [Action ▼] [User ▼]│
│──────────────────────────────────────────────────────────────│
│  Time               User         Action           Old  New   │
│  25 Feb 2026 14:30  Admin        exam_published   —    —     │
│  25 Feb 2026 12:15  Priya Sharma mark_entered     —    72    │
│  25 Feb 2026 12:10  Priya Sharma mark_updated     65   72    │
│──────────────────────────────────────────────────────────────│
│  Pagination: 50 rows/page                                    │
└──────────────────────────────────────────────────────────────┘
```

---

#### S23: Exam Dashboard (Summary Widget)

| Property | Value |
|---|---|
| Route | `/exam` (embedded on main dashboard) |
| Component | `ExamDashboard` |
| Role Access | All roles (scoped by role) |
| API Calls | `GET /exam/exams/?status=active`, `GET /exam/exams/?status=published` |
| Phase | Ongoing |

**Purpose:** Quick overview widget showing upcoming exams, mark entry deadlines, and recent results.

**Component Layout (Admin):**
```
┌────────────────────────────────────────────┐
│  Exams                          [View All] │
│  Active Exams: 2                           │
│  Upcoming Deadlines:                       │
│    FA1: Mark entry due in 3 days           │
│  Recently Published: SA1 2024-25           │
└────────────────────────────────────────────┘
```

---

## 7. Key Components (8 Reusable)

---

### 7.1 `ExamWizard`

File: `src/components/exam/ExamWizard.tsx`

**Purpose:** 4-section accordion form for exam creation. All sections on one screen. Collects data locally. Single submit.

```typescript
interface ExamWizardProps {
  onSubmit: (data: ExamCreateFull) => void
  isSubmitting: boolean
  serverErrors?: Record<string, string>   // loc-mapped errors from 422 response
  defaultValues?: Partial<ExamCreateFull>
}
```

**State:**
- `activeAccordion: 1 | 2 | 3 | 4` — which section is expanded (all can be open simultaneously)
- `completedSteps: Set<number>` — green checkmark on completed section headers
- React Hook Form with `examCreateFullSchema`
- Dynamic fields for subject configs (driven by selected class-sections)

**Behavior:**
- Accordion 1 (Exam Details): standalone fields, validates on blur
- Accordion 2 (Class Sections): uses `ClassSectionSelector` — auto-triggers subject loading
- Accordion 3 (Subject Config): uses `SubjectConfigAccordion` — one accordion per class-section, subjects auto-loaded from class-subject mappings
- Accordion 4 (Exam Dates): inline date rows, "Apply to all sections" button
- Save button at page bottom: triggers full schema validation → if valid, calls `onSubmit`
- If `serverErrors` is non-empty after submit: scroll to the first errored section

---

### 7.2 `MarkEntryGrid`

File: `src/components/exam/MarkEntryGrid.tsx`

**Purpose:** Students × Components grid with auto-save per row.

```typescript
interface MarkEntryGridProps {
  examId: string
  classId: string
  sectionId: string
  subjectConfigId: string
  components: ExamSubjectComponent[]
  remarkSets: Record<string, RemarkGradeOption[]>  // keyed by remark_grade_set_id
  onRowSave: (data: MarkEntryCreate[]) => void
  isReadOnly?: boolean
}
```

**State:**
- `rows: MarkEntryItem[]` — from `useMarkEntry` query
- `dirtyRows: Set<string>` — student IDs with unsaved changes
- `savingRows: Set<string>` — in-flight save requests
- `errorRows: Map<string, string>` — save errors per student
- `staleRows: Set<string>` — concurrent edit warnings
- `page: number` — current pagination page

**Behavior:**
- Cell blur triggers `onRowSave` for the entire student row
- Absent toggle: calls `onRowSave` with `is_absent = true` for all components
- Remarks cells: render `<select>` with options from `remarkSets[component.remark_grade_set_id]`
- Validation: `marks_obtained > component.max_marks` → red border
- Row save status icons: ✓ = saved, spinner = saving, ! = error

---

### 7.3 `GradeBandEditor`

File: `src/components/exam/GradeBandEditor.tsx`

**Purpose:** Editable table for defining grade bands (from%, to%, label, GPA, remarks, pass/fail).

```typescript
interface GradeBandEditorProps {
  bands: GradeBandCreate[]
  onChange: (bands: GradeBandCreate[]) => void
  readOnly?: boolean
}
```

**State:**
- Local copy of `bands` array
- Inline add row, edit, delete
- Validates: no gaps between bands, from% <= to%, no overlaps

**Behavior:**
- Drag-and-drop reorder (updates `sort_order`)
- Color preview cell: green = is_pass, red = !is_pass
- "Add Band" row at bottom
- Changes propagate up via `onChange` (not saved until parent submits)

---

### 7.4 `EligibilityPanel`

File: `src/components/exam/EligibilityPanel.tsx`

**Purpose:** Two-column panel showing eligible and ineligible students for hall tickets.

```typescript
interface EligibilityPanelProps {
  eligible: HallTicketEligibility[]
  ineligible: HallTicketEligibility[]
  onOverride: (studentId: string, overrides: { attendance_override?: boolean; fee_override?: boolean }) => void
  isLoading?: boolean
}
```

**State:**
- Ineligible students grouped by `ineligibility_reason`: `LOW_ATTENDANCE`, `FEE_PENDING`, `BOTH`
- Optimistic override: move student to eligible panel immediately, revert if API fails

**Behavior:**
- Left panel: eligible student list with search
- Right panel: ineligible grouped by reason, each with [Override] button
- Override confirmation dialog per student

---

### 7.5 `HallTicketCard`

File: `src/components/exam/HallTicketCard.tsx`

**Purpose:** Student hall ticket display — shows student info and exam schedule (dates, venues).

```typescript
interface HallTicketCardProps {
  student: {
    name: string
    admission_number: string
    class_name: string
    section_name: string
    photo_url?: string
  }
  exam: Exam
  examDates: ExamDate[]
  school: {
    name: string
    logo_url?: string
    address: string
  }
}
```

**Layout:** Print-ready card with school logo, student details, signature box, and a subject schedule table (subject | date | start-end time | venue).

---

### 7.6 `ClassSectionSelector`

File: `src/components/exam/ClassSectionSelector.tsx`

**Purpose:** Multi-select grid for class + section combinations.

```typescript
interface ClassSectionSelectorProps {
  value: ClassSectionPayload[]
  onChange: (selected: ClassSectionPayload[]) => void
  availableClasses: { id: string; name: string; sections: { id: string; name: string }[] }[]
  disabled?: boolean
}
```

**Behavior:**
- Renders as a grid of checkboxes: columns = sections (A, B, C...), rows = classes
- "Select All" per class row
- Selecting a class-section triggers subject auto-load in parent (via `onChange`)

---

### 7.7 `SubjectConfigAccordion`

File: `src/components/exam/SubjectConfigAccordion.tsx`

**Purpose:** Per-class-section, per-subject component weight editor.

```typescript
interface SubjectConfigAccordionProps {
  classSection: ClassSectionPayload
  subjects: { id: string; name: string }[]
  value: SubjectConfigPayload[]
  onChange: (configs: SubjectConfigPayload[]) => void
  remarkSets: RemarkGradeSet[]
  subjectSchemes: SubjectGradeScheme[]
}
```

**Behavior:**
- One accordion per class-section
- Inside each: a table of subjects with inline component editor
- Each subject row expands to show components: [component_name] [type: marks/remarks] [max_marks] [min_pass] [include_in_total] [x]
- "Add Component" button per subject
- "Apply to all sections" copies a class's config to all sections of the same class

---

### 7.8 `ResultsTable`

File: `src/components/exam/ResultsTable.tsx`

**Purpose:** Sortable, filterable table showing student exam results.

```typescript
interface ResultsTableProps {
  results: StudentExamResult[]
  examName: string
  onStudentClick?: (studentId: string) => void
  showActions?: boolean
  isLoading?: boolean
}
```

**Behavior:**
- Sortable columns: name (alpha), total marks, percent, grade, rank
- Filterable: pass/fail toggle, class, section
- Grade badge colored by is_pass
- Export button: triggers PDF or Excel download
- Row click: navigate to student detail result (admin) or open expanded view

---

## 8. State Management

File: `src/stores/examStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExamCreateFull } from '../types/exam'

interface ExamStore {
  // -------------------------------------------------------------------------
  // Wizard state — persisted in sessionStorage during creation flow
  // -------------------------------------------------------------------------
  wizardStep: number
  wizardData: Partial<ExamCreateFull>
  setWizardStep: (step: number) => void
  updateWizardData: (section: keyof ExamCreateFull, data: ExamCreateFull[keyof ExamCreateFull]) => void
  resetWizard: () => void

  // -------------------------------------------------------------------------
  // Mark entry filter — persisted in sessionStorage
  // -------------------------------------------------------------------------
  markEntryFilter: {
    examId?: string
    classId?: string
    sectionId?: string
    subjectConfigId?: string
  }
  setMarkEntryFilter: (filter: Partial<ExamStore['markEntryFilter']>) => void

  // -------------------------------------------------------------------------
  // Active exam context — used by breadcrumbs and sub-screens
  // -------------------------------------------------------------------------
  activeExamId: string | null
  activeExamName: string | null
  setActiveExam: (examId: string | null, examName?: string | null) => void
}

const WIZARD_INITIAL: Partial<ExamCreateFull> = {
  exam: undefined,
  class_sections: [],
  subject_configs: [],
  exam_dates: [],
}

export const useExamStore = create<ExamStore>()(
  persist(
    (set) => ({
      // Wizard
      wizardStep: 1,
      wizardData: WIZARD_INITIAL,
      setWizardStep: (step) => set({ wizardStep: step }),
      updateWizardData: (section, data) =>
        set((state) => ({
          wizardData: { ...state.wizardData, [section]: data },
        })),
      resetWizard: () => set({ wizardStep: 1, wizardData: WIZARD_INITIAL }),

      // Mark Entry Filter
      markEntryFilter: {},
      setMarkEntryFilter: (filter) =>
        set((state) => ({
          markEntryFilter: { ...state.markEntryFilter, ...filter },
        })),

      // Active Exam
      activeExamId: null,
      activeExamName: null,
      setActiveExam: (examId, examName = null) =>
        set({ activeExamId: examId, activeExamName: examName }),
    }),
    {
      name: 'exam-store',
      storage: {
        getItem: (name) => sessionStorage.getItem(name),
        setItem: (name, value) => sessionStorage.setItem(name, value),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      partialize: (state) => ({
        wizardData: state.wizardData,
        wizardStep: state.wizardStep,
        markEntryFilter: state.markEntryFilter,
      }),
    }
  )
)
```

**Notes:**
- `wizardData` is persisted in `sessionStorage` — cleared when browser tab closes. This prevents data loss if user accidentally navigates away during exam creation.
- `activeExamId` is NOT persisted — derived from route params on each page load.
- The wizard store is `resetWizard()`-ed on successful exam creation.

---

## 9. Role-Based UI Rules

Apply role checks using a `useCurrentUser()` hook that reads from the JWT auth context.

```typescript
// src/hooks/useCurrentUser.ts
export const useCurrentUser = () => {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  const payload = JSON.parse(atob(token.split('.')[1]))
  return {
    userId: payload.user_id as string,
    role: payload.role as string,
    permissions: payload.permissions as Record<string, string[]>,
  }
}
```

| UI Element | Admin | Teacher | Clerk/CA | Student | Parent |
|---|---|---|---|---|---|
| Create exam button | Visible | Hidden | Hidden | Hidden | Hidden |
| Mark entry | All subjects | Own subject + class only | Permitted exams only | Hidden | Hidden |
| Exam list | All statuses | Active + published | Active + published | Published only | Published only |
| Results view | All students, all classes | Own class | View only | Own result | Child's result |
| Hall ticket download | All students | Hidden | View list | Own if `is_eligible = true` | Child's if `is_eligible = true` |
| Delete exam button | Draft status only | Hidden | Hidden | Hidden | Hidden |
| Publish results button | Visible | Hidden | Hidden | Hidden | Hidden |
| Mark entry permissions tab | Visible | Hidden | Hidden | Hidden | Hidden |
| Exam settings / board patterns | Visible | Hidden | Hidden | Hidden | Hidden |
| Audit log tab | Visible | Hidden | Hidden | Hidden | Hidden |

**Implementation pattern:**

```tsx
// Role guard component
const { role } = useCurrentUser() ?? { role: null }
const isAdmin = role === 'admin'
const isTeacher = role === 'teacher'

{isAdmin && (
  <Button onClick={handleCreate}>+ Create Exam</Button>
)}
```

**Backend enforces all scope rules.** Frontend guards are for UX only — they reduce clutter but do not constitute a security boundary.

---

## 10. Error Handling Patterns

File: `src/utils/examErrorHandler.ts`

```typescript
import type { AxiosError } from 'axios'
import type { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'

interface ValidationError {
  loc: string[]
  msg: string
  type: string
}

export const handleExamApiError = (
  error: AxiosError<{ detail: string | ValidationError[] }>,
  form?: UseFormReturn<any>
) => {
  if (!error.response) {
    toast.error('Network error. Please check your connection.')
    return
  }

  const { status, data } = error.response

  if (status === 422) {
    // Map field-level validation errors back to React Hook Form fields
    const detail = data?.detail
    if (Array.isArray(detail)) {
      detail.forEach((err) => {
        // Skip the first element (typically 'body')
        const fieldPath = err.loc?.slice(1).join('.')
        if (fieldPath && form) {
          form.setError(fieldPath as any, { message: err.msg })
        } else {
          toast.error(`Validation error: ${err.msg}`)
        }
      })
    } else {
      toast.error('Validation failed. Please check your inputs.')
    }
    return
  }

  if (status === 400) {
    const message = typeof data?.detail === 'string'
      ? data.detail
      : 'Request failed.'
    toast.error(message)
    return
  }

  if (status === 403) {
    window.location.href = '/error/403'
    return
  }

  if (status === 404) {
    toast.error('The requested record was not found.')
    return
  }

  if (status === 409) {
    const message = typeof data?.detail === 'string'
      ? data.detail
      : 'Conflict: This record already exists.'
    toast.error(message)
    return
  }

  toast.error('An unexpected error occurred. Please try again.')
}
```

**Exam Creation (`create_full/`) Special Handling:**

```typescript
// Map 422 errors from create-full to wizard accordion sections
export const mapCreateFullErrorsToWizardSections = (
  detail: ValidationError[]
): { section: 1 | 2 | 3 | 4; field: string; message: string }[] => {
  return detail.map((err) => {
    const root = err.loc[1]
    let section: 1 | 2 | 3 | 4 = 1

    if (root === 'exam') section = 1
    else if (root === 'class_sections') section = 2
    else if (root === 'subject_configs') section = 3
    else if (root === 'exam_dates') section = 4

    // Build human-readable field path (e.g., "subject_configs[0].components[1].max_marks")
    const field = err.loc.slice(1).join('.')
    return { section, field, message: err.msg }
  })
}
```

The wizard component uses this to:
1. Expand the accordion for the errored section
2. Display `setError` on the relevant form field
3. Show a summary toast: "Validation errors in Step 3 (Subject Config). Please review."

---

## 11. Confirmation Dialogs

All destructive and irreversible actions require a confirmation dialog. Use a shared `ConfirmDialog` component.

```tsx
// src/components/shared/ConfirmDialog.tsx
interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'destructive' | 'default'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}
```

**Required Confirmation Dialogs:**

| Action | Title | Description | Button |
|---|---|---|---|
| Delete exam | "Delete Exam?" | "This will permanently delete [exam name] and all its dates. This cannot be undone." | Destructive |
| Publish results | "Publish Results?" | "Once published, students can view results. This cannot be undone without admin unlock." | Default |
| Unlock exam | "Unlock Exam?" | "Unlocking allows mark corrections. Students will be notified of result changes." | Destructive |
| Publish hall tickets | "Publish Hall Tickets?" | "Hall tickets will be visible to eligible students immediately after publishing." | Default |
| Revoke mark permission | "Revoke Access?" | "This will prevent [user name] from entering marks for this exam." | Destructive |
| Clone exam | "Clone Exam?" | "A copy of [exam name] will be created without marks. Continue?" | Default |

**Implementation:**

```tsx
const [confirmDelete, setConfirmDelete] = useState(false)
const deleteExam = useDeleteExam()

<ConfirmDialog
  open={confirmDelete}
  title="Delete Exam?"
  description={`This will permanently delete "${exam.exam_name}" and all its dates. This cannot be undone.`}
  confirmLabel="Delete"
  confirmVariant="destructive"
  onConfirm={() => {
    deleteExam.mutate(exam.id, {
      onSuccess: () => navigate('/exam/exams'),
    })
  }}
  onCancel={() => setConfirmDelete(false)}
  isLoading={deleteExam.isPending}
/>
```

---

## 12. Navigation / Routing

File: `src/router/examRoutes.tsx`

```tsx
import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const ExamDashboard        = lazy(() => import('../pages/exam/ExamDashboard'))
const ExamSettings         = lazy(() => import('../pages/exam/ExamSettings'))
const BoardPatternSetup    = lazy(() => import('../pages/exam/BoardPatternSetup'))
const ExamGradeSchemes     = lazy(() => import('../pages/exam/ExamGradeSchemes'))
const SubjectGradeSchemes  = lazy(() => import('../pages/exam/SubjectGradeSchemes'))
const RemarkGradeSets      = lazy(() => import('../pages/exam/RemarkGradeSets'))
const ExamList             = lazy(() => import('../pages/exam/ExamList'))
const CreateExam           = lazy(() => import('../pages/exam/CreateExam'))
const ExamDetail           = lazy(() => import('../pages/exam/ExamDetail'))
const ExamDates            = lazy(() => import('../pages/exam/ExamDates'))
const MarkPermissions      = lazy(() => import('../pages/exam/MarkPermissions'))
const MarkEntryGrid        = lazy(() => import('../pages/exam/MarkEntryGrid'))
const MarkEntrySummary     = lazy(() => import('../pages/exam/MarkEntrySummary'))
const ResultsPublish       = lazy(() => import('../pages/exam/ResultsPublish'))
const StudentResults       = lazy(() => import('../pages/exam/StudentResults'))
const HallTicketEligibility = lazy(() => import('../pages/exam/HallTicketEligibility'))
const HallTicketDownload   = lazy(() => import('../pages/exam/HallTicketDownload'))
const ExamNotification     = lazy(() => import('../pages/exam/ExamNotification'))
const AuditLog             = lazy(() => import('../pages/exam/AuditLog'))

export const examRoutes: RouteObject[] = [
  { path: '/exam',                                                   element: <ExamDashboard /> },
  { path: '/exam/settings',                                          element: <ExamSettings /> },
  { path: '/exam/board-patterns',                                    element: <BoardPatternSetup /> },
  { path: '/exam/grading/exam-schemes',                              element: <ExamGradeSchemes /> },
  { path: '/exam/grading/subject-schemes',                           element: <SubjectGradeSchemes /> },
  { path: '/exam/grading/remarks',                                   element: <RemarkGradeSets /> },
  { path: '/exam/exams',                                             element: <ExamList /> },
  { path: '/exam/exams/create',                                      element: <CreateExam /> },
  { path: '/exam/exams/:id',                                         element: <ExamDetail /> },
  { path: '/exam/exams/:id/dates',                                   element: <ExamDates /> },
  { path: '/exam/exams/:id/permissions',                             element: <MarkPermissions /> },
  { path: '/exam/exams/:id/results',                                 element: <ResultsPublish /> },
  { path: '/exam/exams/:id/notify',                                  element: <ExamNotification /> },
  { path: '/exam/exams/:id/audit',                                   element: <AuditLog /> },
  { path: '/exam/marks/:examId/summary',                             element: <MarkEntrySummary /> },
  { path: '/exam/marks/:examId/:classId/:sectionId/:subjectConfigId', element: <MarkEntryGrid /> },
  { path: '/exam/results/:examId',                                   element: <StudentResults /> },
  { path: '/exam/hall-tickets/:examId',                              element: <HallTicketEligibility /> },
  { path: '/exam/hall-tickets/:examId/download',                     element: <HallTicketDownload /> },
]
```

**Route Guards:**

```tsx
// Wrap exam routes with role guard
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { role } = useCurrentUser() ?? {}
  if (role !== 'admin') return <Navigate to="/error/403" replace />
  return <>{children}</>
}
```

Routes that require Admin: all `/exam/settings`, `/exam/board-patterns`, `/exam/grading/*`, `/exam/exams/create`, `/exam/exams/:id/permissions`, `/exam/exams/:id/results` (publish view), `/exam/hall-tickets/:examId` (eligibility management).

---

## 13. UX Patterns / Design Guidelines

### Date and Number Formatting

- All date inputs and API payloads: **ISO 8601** format `yyyy-MM-dd`
- All time inputs: `HH:mm` (24-hour)
- All marks and percentages: **2 decimal places** (`toFixed(2)`)
- Marks display: `72.00` not `72` — consistency matters for audit

### Loading States

- **Table loads:** Use skeleton rows (Tailwind `animate-pulse` with placeholder divs), never spinners inside tables
- **Exam creation submit:** Full-page overlay spinner (the operation is atomic — user cannot interact)
- **Auto-save (mark entry):** Per-row save icon (spinner → checkmark → error icon), never full-page
- **Stale data:** Subtle "Refreshing..." badge in the table header while `isFetching && !isLoading`

### Wizard Accordion

- Completed steps show a green checkmark (`✓`) in the accordion header
- Active (open) step has a blue left border accent
- Pending (not yet visited) steps have a gray header
- All four sections can be open simultaneously — not a traditional stepper

### Exam Status Badge Colors (Tailwind classes)

```typescript
const statusBadgeClass: Record<ExamStatus, string> = {
  draft:     'bg-gray-100 text-gray-700',
  active:    'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  locked:    'bg-amber-100 text-amber-700',
  finalized: 'bg-purple-100 text-purple-700',
}
```

### Optimistic Updates

- Mark entry (S12): show the new value immediately in the cell. If save fails, revert and highlight the cell with a red border + error tooltip.
- Hall ticket override (S18): move student to eligible panel immediately. If API fails, revert and show toast.
- Never apply optimistic updates to destructive or irreversible actions (delete exam, publish results, publish hall tickets).

### Responsive Design

- Mark entry grid (S12): horizontal scroll on small screens — do not wrap the grid
- Wizard (S07): single-column stacked layout on mobile, two-column grid on desktop for form fields
- Hall ticket card (S20): optimized for print (`@media print` CSS) — hide navigation, show full-bleed card

### Toast Notifications (using `sonner`)

- Success: green toast, auto-dismiss 3s
- Error: red toast, auto-dismiss 6s, no dismiss on 403/network errors (persistent)
- Warning (concurrent edit): amber toast, auto-dismiss 8s with "Reload" action button

### Empty States

| Screen | Empty State Message |
|---|---|
| Exam List | "No exams found for this academic year. Create your first exam." |
| Mark Entry Grid | "No students found for this class-section." |
| Eligible Students | "No students are eligible yet. Run eligibility computation first." |
| Ineligible Students | "All students are eligible for this exam." |
| Audit Log | "No audit events found for this exam." |
| Results Table | "Results have not been computed yet. Click 'Compute Aggregates'." |

---

*End of document — COS360 Exam Module Frontend Developer Guide v1.0 (2026-02-25)*
