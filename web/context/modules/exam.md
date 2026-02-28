# Module Context – Exam

Version: 1.4
Generated On: 2026-02-28
Source: EXAM_MODULE_FRONTEND_DEV.md v3.0
Confidence Level: High

---

## Responsibility

The Exam module manages the full lifecycle of examinations:

1. **Exam Settings**: Global exam configuration
2. **Board Pattern Setup**: Exam board and pattern management
3. **Grade Schemes**: Exam-level and subject-level grading
4. **Remark Grade Sets**: Remark-based grade definitions
5. **Exams**: Create and manage exam instances
6. **Exam Dates**: Subject-wise exam date scheduling
7. **Mark Permissions**: Control which staff can enter marks
8. **Mark Entry**: Subject-wise marks grid for students
9. **Results**: Compute, publish, and view student results
10. **Hall Tickets**: Eligibility check and hall ticket generation/download
11. **Notifications**: Exam notification management
12. **Audit Log**: Exam activity audit trail

---

## Implementation Status

**All sprints complete — ready for integration testing (as of 2026-02-27)**

The module was implemented in 7 sprints. All TypeScript errors resolved.

---

## Key Files

### Foundation Layer

| File | Purpose |
|------|---------|
| `src/types/exam.ts` | All TypeScript interfaces and types |
| `src/api/exam/index.ts` | API functions using project's `CAxios` |
| `src/api/hooks/exam/useExam.ts` | All React Query hooks with `examKeys` factory |
| `src/lib/examStore.ts` | Zustand store with `createJSONStorage(() => sessionStorage)` |
| `src/utils/examErrorHandler.ts` | API error handler + wizard section mapper |
| `src/schemas/examSchemas.ts` | Zod validation schemas + type exports |

### Pages (19 total)

| File | Screen |
|------|--------|
| `src/pages/exam/ExamSettings.tsx` | Global exam settings |
| `src/pages/exam/BoardPatternSetup.tsx` | Board patterns |
| `src/pages/exam/ExamGradeSchemes.tsx` | Exam-level grade schemes |
| `src/pages/exam/SubjectGradeSchemes.tsx` | Subject-level grade schemes |
| `src/pages/exam/RemarkGradeSets.tsx` | Remark grade sets |
| `src/pages/exam/ExamList.tsx` | List of exams |
| `src/pages/exam/CreateExam.tsx` | Create new exam |
| `src/pages/exam/ExamDetail.tsx` | Exam detail view |
| `src/pages/exam/ExamDates.tsx` | Subject exam dates |
| `src/pages/exam/MarkPermissions.tsx` | Mark entry permissions |
| `src/pages/exam/MarkEntryGrid.tsx` | Marks entry grid |
| `src/pages/exam/MarkEntrySummary.tsx` | Marks entry summary |
| `src/pages/exam/ResultsPublish.tsx` | Publish results |
| `src/pages/exam/StudentResults.tsx` | Student result view |
| `src/pages/exam/HallTicketEligibility.tsx` | Eligibility check |
| `src/pages/exam/HallTicketDownload.tsx` | Download hall tickets |
| `src/pages/exam/ExamNotification.tsx` | Exam notifications |
| `src/pages/exam/AuditLog.tsx` | Audit log |
| `src/pages/exam/ExamDashboard.tsx` | Exam dashboard |

### Reusable Components (6 total)

| File | Purpose |
|------|---------|
| `src/components/exam/GradeBandEditor.tsx` | Editable grade band table |
| `src/components/exam/ClassSectionSelector.tsx` | Multi-select class/section grid |
| `src/components/exam/SubjectConfigAccordion.tsx` | Per-class subject config editor |
| `src/components/exam/ResultsTable.tsx` | Student results grid |
| `src/components/exam/EligibilityPanel.tsx` | Hall ticket eligibility table |
| `src/components/exam/HallTicketCard.tsx` | Printable hall ticket card |

### Routes

All under `src/routes/_app/exam/`:

```
exam.tsx                              — exam layout
exam/index.tsx                        — dashboard
exam/settings.tsx
exam/board-patterns.tsx
exam/grading.tsx
  grading/exam-schemes.tsx
  grading/subject-schemes.tsx
  grading/remarks.tsx
exam/exams.tsx
  exams/index.tsx
  exams/create.tsx
  exams/$id.tsx
    exams/$id/dates.tsx
    exams/$id/permissions.tsx
    exams/$id/results.tsx
    exams/$id/audit.tsx
    exams/$id/notify.tsx
exam/marks.tsx
  marks/$examId/summary.tsx
  marks/$examId/$classId/$sectionId/$subjectConfigId.tsx
exam/results.tsx
  results/$id.tsx
exam/hall-tickets.tsx
  hall-tickets/$examId.tsx
  hall-tickets/$examId/download.tsx
```

### Sidebar

`src/components/ui/sidebar.tsx` — Exam menu icons added: `ClipboardList`, `Award`, `Ticket`, `Star`, `ListChecks`, `PenLine`, `BarChart3`.

---

## API Endpoints

The backend uses **flat paths** (no `/exam/` prefix on most endpoints):

```
/exam-settings
/board-patterns
/grade-schemes/exam
/grade-schemes/subject
/remark-grades
/exams
/exams/{examId}/dates         (examId in path, not query param)
/exams/{examId}/marks
/exams/{examId}/mark-permissions
/exams/{examId}/results/compute
/exams/{examId}/results/publish
/hall-tickets/{examId}/compute
/hall-tickets/{examId}/publish
/hall-tickets/{examId}/eligibility
/hall-tickets/{examId}/download
```

**Note**: Grade band endpoints do NOT exist as separate CRUD routes. Bands are embedded in the scheme payload on both create and update. The `PUT /grade-schemes/exam/{id}` and `PUT /grade-schemes/subject/{id}` endpoints now accept a `bands[]` array and perform a full replace (delete all + re-insert). Similarly, `PUT /remark-grades/{id}` accepts an `options[]` array and fully replaces options.

---

## Key Type Corrections

These field names differ from the original spec — use the actual names:

| Type | Spec Field | Actual Field |
|------|-----------|-------------|
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

---

## Hook Signature Notes

Several hooks take `examId` as the **hook parameter**, NOT as the `mutate()` argument:

```typescript
// Correct
const computeMutation = useComputeAggregate(examId)
computeMutation.mutate(undefined)

// Wrong (examId already bound in hook)
const computeMutation = useComputeAggregate()
computeMutation.mutate(examId)
```

Applies to: `useComputeAggregate`, `usePublishResults`, `useComputeHallTickets`, `usePublishHallTickets`, `useOverrideHallTicket`.

`useHallTicketEligibility(examId)` returns `{ eligible: QueryResult, ineligible: QueryResult }`, not direct arrays:

```typescript
const { eligible: eligibleQuery, ineligible: ineligibleQuery } = useHallTicketEligibility(examId)
const eligible = eligibleQuery.data ?? []
```

---

## Known Issues and Fixes

### CreateExam — Academic Year Dropdown Empty

The `CreateExam` page requires `fetchAndSetAcademicYears()` to be called. It is NOT automatic. Add this pattern:

```typescript
const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore()

useEffect(() => {
  if (academicYears.length === 0) fetchAndSetAcademicYears()
}, [academicYears.length, fetchAndSetAcademicYears])
```

### Select Component — Empty Value Silently Dropped

The custom `src/components/ui/select.tsx` skips `<SelectItem value="">` (falsy value). Use a sentinel:

```typescript
// Grade scheme "None" option
<SelectItem value="__none__">— None —</SelectItem>
value={form.watch('exam_grade_scheme_id') ?? '__none__'}
onValueChange={(v) => form.setValue('exam_grade_scheme_id', v === '__none__' ? null : v)}
```

> This applies everywhere in the app, not just exam. Any `<SelectItem value="">` will be silently ignored.

### API URL Fixes (Applied in v2.0)

All original exam API URLs had a wrong `/exam/` prefix. They were corrected — see endpoint list above.

### ExamDates Delete Mutation

The `useDeleteExamDate` hook takes `{ examId, dateId }` — not a single `id`:

```typescript
deleteMutation.mutate({ examId: id, dateId: deleteTarget })
```

### Decimal Fields Serialized as Strings (Pydantic v2)

The backend returns `Numeric`/`Decimal` columns (`from_percent`, `to_percent`, `gpa`, `from_marks`, `to_marks`) as **strings** in JSON (e.g., `"45.00"`, `"4.50"`) because Pydantic v2 serializes `Decimal` as string in JSON mode. This affects two places:

1. **Rendering** — `band.gpa.toFixed(1)` crashes on a string. Always use `Number(band.gpa).toFixed(1)`.
2. **Form editing** — Zod's `z.number()` rejects strings silently. In `openEdit`, always coerce with `Number(b.from_percent)`, `Number(b.gpa)` etc. before calling `form.reset()`.

Applies to: `GradeBandEditor.tsx`, `ExamGradeSchemes.tsx` `openEdit`, `SubjectGradeSchemes.tsx` `openEdit`.

### Grade Schemes / Remark Grade Sets — Update Did Not Save Bands/Options

**Root cause (backend):** The original `ExamGradeSchemeUpdate`, `SubjectGradeSchemeUpdate`, and `RemarkGradeSetUpdate` Pydantic schemas did not include `bands`/`options` fields. The service functions only updated scalar fields (name, description). Bands and options were silently ignored on every PUT request.

**Fix applied (2026-02-28):**

- `ExamGradeSchemeUpdate` now includes `bands: List[GradeBandCreate]`
- `SubjectGradeSchemeUpdate` now includes `bands: List[GradeBandCreate]`
- `RemarkGradeSetUpdate` now includes `options: Optional[List[RemarkGradeOptionCreate]]`
- Both grading service update functions now delete all existing bands then insert new ones
- Remark grade service update function now deletes all existing options then inserts new ones when `options` is provided

### BoardPatternUpdate — Exam Types Not Saved on Edit (Fixed in v1.4)

**Root cause (backend):** `BoardPatternUpdate` Pydantic schema had no `exam_types` field. The service explicitly said `"Update scalar fields only. exam_types are managed via separate endpoints."` — those separate endpoints never existed in the frontend. Every edit to exam types was silently discarded; only board/level/is_active scalar changes were saved.

**Fix applied (2026-02-28):**

- `BoardPatternUpdate` schema now includes `exam_types: Optional[List[BoardPatternExamTypeCreate]] = None`
- `update_board_pattern` service: when `exam_types` is provided, deletes all existing exam types then re-inserts the new ones (same delete-all + re-insert pattern used for grade scheme bands)

**Files changed (backend):**

- `app/schemas/exam/board_pattern_schema.py` — added `exam_types` field to `BoardPatternUpdate`
- `app/service/exam/board_pattern_service.py` — added exam_types replace logic in `update_board_pattern`

### Remark Grade Options — Sort Order Reordering

The remark grade set edit form now supports **drag-and-drop reordering** of options (GripVertical handle, same UX as `GradeBandEditor`). The `sort_order` field of each option is updated automatically on drag end. The frontend sends the updated `sort_order` values in the `options[]` array on save.

### CreateExam — Custom Board Name Required

When `board === 'Custom'` the Zod schema's `.refine()` requires `custom_board_name` to be filled. Without the fix, submission silently failed (no toast) because the form had no input for that field. Fix: A `Custom Board Name` input now renders conditionally in Section 1 when Board = Custom.

### CreateExam — Stale Wizard Data Causes Backend 422

**Root cause:** `examStore` persists `subject_configs` to sessionStorage. When the user changes class-sections between wizard attempts, subject configs from the previous attempt remain in state. These stale configs reference old class_ids/section_ids and are sent to the backend, which rejects them with 422.

**Fix applied (2026-02-28):**

- `configsToSend` in `handleSubmit` is now filtered by both `isBlankConfig` AND whether the config's `(class_id, section_id)` matches the currently selected `classSections`.
- `grandTotal`, `activeConfigs`, and the Section 3 badge in the Review section only count configs for the current class-sections.
- `missingItems` uses `activeConfigs.length` (not raw `subjectConfigs.length`) to determine if subjects are configured.
- Added toast when `form.trigger()` fails so users see which field is invalid (previously silent).

### ExamDetail — Edit Exam (Added in v1.2)

An **Edit** button is now shown in the `ExamDetail` header for admin users when the exam is in `draft` or `active` status. It opens a dialog that allows editing the fields permitted by `ExamUpdate`:

- Exam Name, Mark Entry Deadline, Min Attendance %, Attendance From/To, Term, Publish Rank

Fields that cannot be changed after creation (board, level, nature, academic_year_id, exam_type) are not shown in the edit dialog.

The `useUpdateExam(examId)` hook sends `PUT /exams/{examId}` with only the changed fields.

### ExamList — Edit Option in Dropdown (Added in v1.2)

The `...` action dropdown in `ExamList` also has an **Edit Exam** option for admin users. Unlike the ExamDetail edit button (which is restricted to `draft`/`active`), the ExamList dropdown shows Edit for **any exam status**. Both open the same `EditExamDialog` with the same backend-allowed fields.

### isAdmin Role Case Mismatch (Fixed in v1.3)

**Root cause:** The `isAdmin` check was `role?.name === 'admin'` (lowercase), but the DB stores the role as `'Admin'` (capital A). This caused `isAdmin` to always be `false` for all Admin users — hiding the Edit button, Edit Exam dropdown option, and the Permissions/Audit tabs.

**Fix applied:**

```typescript
const isAdmin = useAuthStore(s => {
  const roleName = s.user?.role?.name?.toLowerCase() ?? ''
  return roleName === 'admin' || roleName === 'superadmin' || roleName === 'principal'
})
```

This is applied in both `ExamList.tsx` and `ExamDetail.tsx`. The `.toLowerCase()` ensures the check works regardless of how the role name is cased in the DB (`Admin`, `admin`, `ADMIN`).

**Debugging tip:** To verify the role name stored for the logged-in user, run in browser Console:

```js
JSON.parse(localStorage.getItem('auth-storage') || sessionStorage.getItem('auth-storage') || '{}').state?.user?.role
```

---

## Sidebar Menus

Exam menus are **database-driven** (`menus` + `role_menu_permissions` tables). They must be seeded per tenant. The seed script is `PythonWorkspace/COS360/seed_exam_menus.py`.

Seeded menus (13 total):
- L0: Exam Management (`/exam`)
- L1: Exam Dashboard, Exams, Board Patterns, Grading, Mark Entry, Hall Tickets, Results, Exam Settings, Audit Log
- L2 (under Grading): Exam Grade Schemes, Subject Grade Schemes, Remark Grade Sets

---

## Implementation Adaptations from Spec

| Original Spec | Actual Implementation | Reason |
|---|---|---|
| `src/services/examService.ts` with custom Axios | `src/api/exam/index.ts` using `CAxios` | Must use shared Axios instance for auth headers |
| `src/hooks/useExam.ts` | `src/api/hooks/exam/useExam.ts` | Matches existing hook directory convention |
| `src/stores/examStore.ts` | `src/lib/examStore.ts` | Matches existing store directory convention |
| Zustand custom storage object | `createJSONStorage(() => sessionStorage)` | Resolves TypeScript strict type error |
| `Role === 'admin'` string comparison | `role?.name?.toLowerCase() === 'admin'` | `Role` is an object with `.name`; DB stores `'Admin'` (capital A) so case-insensitive check is required |
| `AcademicYear.name` | `AcademicYear.title` | Actual field in `src/types/masters/academicyear.ts` |

---

## Dependencies

### Internal Dependencies

- **Masters Module**: Academic years, classes, sections for exam configuration
- **Students Module**: Student data for mark entry and results
- **Authentication Module**: Permission checking for mark entry permissions

### External Dependencies

- **@tanstack/react-query**: Data fetching and caching
- **zustand**: `examStore` in sessionStorage
- **zod**: Form validation via `src/schemas/examSchemas.ts`
- **react-hook-form**: Form management

---

## Backend Requirements

For a comprehensive list of backend API contracts, see `docs/EXAM_MODULE_BACKEND_REQUIREMENTS.md`.
