# Feature: Class-Subject Mapping Multi-Select Enhancement

## Feature Implementation Analysis

### Feature Summary

Update the Class-Subject Mapping page to allow users to select a class, section, and **multiple subjects** at once, with individual settings (order, exclude_marks, is_active) per subject. Currently, users can only add one subject at a time.

### Target Module

**Masters Module** - `src/pages/masters/classsubjectmappings.tsx`

### Reference Implementation

**Current Implementation Files:**

| Layer | File                                               |
| ----- | -------------------------------------------------- |
| Route | `src/routes/_app/masters/classsubjectmappings.tsx` |
| Page  | `src/pages/masters/classsubjectmappings.tsx`       |
| Hooks | `src/api/hooks/masters/classsubjectmappings.ts`    |
| API   | `src/api/masters/classsubjectmappings.ts`          |
| Types | `src/types/masters/subject.ts`                     |

---

## Verification: Current State

[EVIDENCE-BASED]

**Single subject selection confirmed** at `src/pages/masters/classsubjectmappings.tsx:319-335`:

```typescript
if (field.name === "subject_id") {
  return (
    <Select
      options={subjectOptions}
      value={subjectOptions.find((opt) => opt.value === value) || null}
      onChange={(option: SingleValue<SelectOption>) =>
        onChange(option?.value || "")
      }
      placeholder="Select Subject"
      // ... single select only
    />
  );
}
```

**No section selection exists** - current form only has `class_id`, `subject_id` fields (line 241-247).

---

## Architecture Pattern

[EVIDENCE-BASED]

### API Layer - Bulk Create Already Exists

**Hook:** `src/api/hooks/masters/classsubjectmappings.ts:77-89`

```typescript
export function useCreateBulkClassSubjectMappings() {
  const queryClient = useQueryClient();
  return useMutation<
    ClassSubjectMappingBulkResponse,
    Error,
    ClassSubjectMappingBulkCreate
  >({
    mutationFn: createBulkClassSubjectMappings,
    onSuccess: (data) => {
      toast.success(data.message || "Bulk mappings created successfully!");
      queryClient.invalidateQueries({ queryKey: ["class-subject-mappings"] });
    },
    onError: (error) => {
      toast.error(`Failed to create bulk mappings: ${error.message}`);
    },
  });
}
```

**API Helper:** `src/api/masters/classsubjectmappings.ts:71-74`

```typescript
export const createBulkClassSubjectMappings = async (
  request: ClassSubjectMappingBulkCreate
): Promise<ClassSubjectMappingBulkResponse> => {
  const { data } = await CAxios.post(
    `${CLASS_SUBJECT_MAPPINGS_API_BASE}bulk`,
    request
  );
  return data;
};
```

**Endpoint:** `POST /masters/class-subject-mappings/bulk`

### Types Layer - Bulk Types Already Exist

`src/types/masters/subject.ts:86-104`

```typescript
export interface SubjectMappingItem {
  subject_id: string;
  exclude_marks?: boolean;
  order?: number;
  is_active?: boolean;
}

export interface ClassSubjectMappingBulkCreate {
  class_id: string;
  academic_year_id: string;
  subjects: SubjectMappingItem[];
}

export interface ClassSubjectMappingBulkResponse {
  success: boolean;
  message: string;
  created_count: number;
  mappings: ClassSubjectMapping[];
}
```

### Component Layer - Dropdowns Available

| Component               | File                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| SectionsByClassDropdown | `src/components/dropdown-system/components/SectionsByClassDropdown.tsx` |
| SubjectsDropdown        | `src/components/dropdown-system/components/SubjectsDropdown.tsx`        |
| Section hook            | `useSectionsByClassId` at `src/hooks/masters/useClassesAndSections.ts`  |

---

## Project Standards Compliance

| Standard            | Requirement                                           | Reference                          |
| ------------------- | ----------------------------------------------------- | ---------------------------------- |
| React Query         | Use existing `useCreateBulkClassSubjectMappings` hook | `classsubjectmappings.ts:77`       |
| Toast notifications | Already configured in bulk hook                       | `classsubjectmappings.ts:81-82`    |
| Multi-select        | Use react-select with `isMulti={true}` prop           | Already imported at line 27        |
| Loading states      | Use `Loader2` spinner                                 | `MasterPage.tsx:29`                |
| Dropdown styling    | Use existing `getCustomSelectStyles()`                | `classsubjectmappings.tsx:34-105`  |
| Permission checks   | Use `PermissionGuard`                                 | `classsubjectmappings.tsx:342-356` |

---

## Dependencies

**Existing components to use:**

- `react-select` - Already imported, supports `isMulti` prop
- `useSectionsByClassId` - Already imported at line 21
- `useCreateBulkClassSubjectMappings` - Exists but not currently used
- `SectionsByClassDropdown` or custom section Select using `sectionOptions` (already computed at line 164-170)

---

## UI Considerations

### New Form Structure

1. **Class dropdown** (existing) - triggers section load
2. **Section dropdown** (NEW) - cascading from class selection
3. **Multi-select subjects** with per-subject fields:
   - Subject (from multi-select)
   - Order (number input)
   - Exclude Marks (checkbox)
   - Active (checkbox)

### Recommended UI Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  Add Class-Subject Mappings                                  │
├─────────────────────────────────────────────────────────────┤
│  Class:    [Select Class ▼]                                 │
│  Section:  [Select Section ▼]  (cascading from class)       │
│  Subjects: [Select multiple subjects... ▼]                  │
├─────────────────────────────────────────────────────────────┤
│  Selected Subjects:                                          │
│  ┌─────────────┬───────┬───────────────┬────────┐          │
│  │ Subject     │ Order │ Exclude Marks │ Active │          │
│  ├─────────────┼───────┼───────────────┼────────┤          │
│  │ Mathematics │ [1]   │ [ ]           │ [✓]    │          │
│  │ Science     │ [2]   │ [ ]           │ [✓]    │          │
│  │ English     │ [3]   │ [✓]           │ [✓]    │          │
│  └─────────────┴───────┴───────────────┴────────┘          │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Add Mappings]        │
└─────────────────────────────────────────────────────────────┘
```

---

## Known Patterns to Follow

[EVIDENCE-BASED]

### 1. Multi-select with react-select

```typescript
import Select, { type MultiValue } from "react-select";

<Select
  isMulti
  options={subjectOptions}
  value={selectedSubjects}
  onChange={(options: MultiValue<SelectOption>) => handleSubjectsChange(options)}
  placeholder="Select Subjects"
  styles={getCustomSelectStyles()}
/>
```

### 2. Cascading dropdowns

Already implemented for class → section (line 155-156):

```typescript
const { data: sectionsData, isLoading: sectionsLoading } = useSectionsByClassId(
  selectedClass?.value || ""
);
```

### 3. Bulk submission pattern

```typescript
const bulkCreate = useCreateBulkClassSubjectMappings();

const handleSubmit = () => {
  bulkCreate.mutate({
    class_id: selectedClass.value,
    academic_year_id: selectedAcademicYearId,
    subjects: selectedSubjects.map((s, index) => ({
      subject_id: s.value,
      order: s.order ?? index + 1,
      exclude_marks: s.exclude_marks ?? false,
      is_active: s.is_active ?? true,
    })),
  });
};
```

---

## Known Anti-Patterns to Avoid

[EVIDENCE-BASED]

- Do NOT call API directly in components (use React Query hooks)
- Do NOT create duplicate state for server data
- Do NOT use MasterPage's default form dialog for this - need custom modal with multi-select capability
- Do NOT forget to invalidate `['class-subject-mappings']` query key (already handled in hook)

---

## Type Updates Required

[INFERENCE]

**Section support may need backend update.** Current types don't include `section_id`:

```typescript
// Current - no section_id
export interface ClassSubjectMappingBulkCreate {
  class_id: string;
  academic_year_id: string;
  subjects: SubjectMappingItem[];
}

// May need to add
export interface ClassSubjectMappingBulkCreate {
  class_id: string;
  section_id?: string; // NEW
  academic_year_id: string;
  subjects: SubjectMappingItem[];
}
```

---

## Implementation Checklist

- [ ] Add section dropdown to form (cascading from class)
- [ ] Change subject Select to `isMulti={true}`
- [ ] Create state for selected subjects with per-subject settings
- [ ] Build selected subjects table UI with order/exclude_marks/is_active fields
- [ ] Replace `useCreateClassSubjectMapping` with `useCreateBulkClassSubjectMappings`
- [ ] Update types if backend supports section_id
- [ ] Test with multiple subjects
- [ ] Verify permission guards work correctly

---

## Assumptions

1. Backend `/masters/class-subject-mappings/bulk` endpoint already supports or will be updated to support `section_id`
2. The bulk create will create individual mappings for each subject selected
3. The existing table view will continue to show individual mappings (not grouped)

---

## Open Questions

1. **Section ID in backend**: Does the current backend API support `section_id` in class-subject mappings? Type definitions don't show it.
2. **Unique constraint**: Can the same subject be mapped to a class+section multiple times, or should duplicates be prevented?
3. **Edit behavior**: When editing existing mappings, should it be individual or also support bulk edit?

---

## Recommended Next Step

Hand off to **Developer Agent** with this analysis

## Confidence Level

**High** - All reference implementations exist. Main uncertainty is backend section_id support.

---

# AI Agent Handover Document

## Metadata

- **Agent Name:** Feature Implementation Analyst
- **Issue / Feature ID:** Class-Subject Mapping Multi-Select Enhancement
- **Date:** 2025-12-27

---

## 1. Inputs Received

| Input Type             | Source                                          |
| ---------------------- | ----------------------------------------------- |
| Architecture           | `context/PROJECT_CONTEXT.md`                    |
| Module context         | `context/modules/masters.md`                    |
| Current implementation | `src/pages/masters/classsubjectmappings.tsx`    |
| React Query hooks      | `src/api/hooks/masters/classsubjectmappings.ts` |
| API helpers            | `src/api/masters/classsubjectmappings.ts`       |
| Type definitions       | `src/types/masters/subject.ts`                  |
| Generic CRUD pattern   | `src/pages/masters/common/MasterPage.tsx`       |

---

## 2. Outputs Produced

**Findings:**

- Current implementation confirmed as single-subject only (line 319-335)
- Bulk create hook and API already exist and are functional
- Types for bulk operations already defined
- Section dropdown infrastructure exists but not used
- Missing: `section_id` in current mapping types

**Decisions:**

- Use `isMulti` prop on react-select for multi-subject selection
- Build custom form instead of MasterPage default dialog
- Leverage existing `useCreateBulkClassSubjectMappings` hook

---

## 3. Evidence References

| Finding                 | File                                                | Line    |
| ----------------------- | --------------------------------------------------- | ------- |
| Single subject select   | `src/pages/masters/classsubjectmappings.tsx`        | 319-335 |
| Bulk create hook exists | `src/api/hooks/masters/classsubjectmappings.ts`     | 77-89   |
| Bulk API helper exists  | `src/api/masters/classsubjectmappings.ts`           | 71-74   |
| Bulk types defined      | `src/types/masters/subject.ts`                      | 86-104  |
| Section hook available  | `src/pages/masters/classsubjectmappings.tsx`        | 155-156 |
| API endpoint constant   | `src/constants/api/masters/classsubjectmappings.ts` | 1       |

---

## 4. Assumptions

1. Backend bulk endpoint supports or will support `section_id`
2. Multi-select creates individual mapping records per subject
3. User requirement for section is new (not in current types)

---

## 5. Open Questions

1. Does backend support `section_id` in class-subject mappings?
2. Should duplicate subject mappings be prevented?
3. Is bulk edit also required or just bulk create?

---

## 6. Confidence Level

**High**

---

## Declaration

> This output complies with **AI_HALLUCINATION_SOP.md**.
