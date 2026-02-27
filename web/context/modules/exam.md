# Module Context – Exam

Version: 1.0
Generated On: 2026-02-27
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

**Note**: Grade band endpoints do NOT exist on the backend. Bands are embedded in `GradeSchemeCreate.bands[]` at scheme creation time only.

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
| `Role === 'admin'` string comparison | `role?.name === 'admin'` | `Role` is an object interface with `.name` field |
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
