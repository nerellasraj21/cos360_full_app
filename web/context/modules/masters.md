# Module Context – Masters

Version: 1.4
Generated On: 2025-12-27
Last Updated: 2025-12-28
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Masters module manages foundational/reference data entities:

1. **Academic Years**: School year management and selection
2. **Classes & Sections**: Class and section configuration
3. **Subjects**: Subject management and categorization
4. **Subject Categories**: Subject grouping
5. **Class-Subject Mappings**: Which subjects apply to which classes
6. **Holidays**: Holiday calendar management
7. **Parents**: Parent/guardian information
8. **Roles & Permissions**: Role-based access configuration

---

## Key Components

[EVIDENCE-BASED]

### Routes

| File | Purpose |
|------|---------|
| `src/routes/_app/masters/academicyears.tsx` | Academic year management |
| `src/routes/_app/masters/classesandsections.tsx` | Class & section management |
| `src/routes/_app/masters/subjects.tsx` | Subject management |
| `src/routes/_app/masters/subjectcategories.tsx` | Subject categories |
| `src/routes/_app/masters/classsubjectmappings.tsx` | Class-subject mappings |
| `src/routes/_app/masters/holidays.tsx` | Holiday management |
| `src/routes/_app/masters/parents.tsx` | Parent management |
| `src/routes/_app/masters/rolespermissions.tsx` | Roles & permissions |
| `src/routes/_app/masters/vehicles.tsx` | Vehicle management |
| `src/routes/_app/masters/routes.tsx` | Transport routes |
| `src/routes/_app/masters/routeStops.tsx` | Route stops |
| `src/routes/_app/masters/trips.tsx` | Trip management |

### API Hooks

| File | Purpose |
|------|---------|
| `src/api/hooks/masters/academicyears.ts` | Academic year hooks |
| `src/api/hooks/masters/classesandsections.ts` | Class/section hooks |
| `src/api/hooks/masters/subjects.ts` | Subject hooks |
| `src/api/hooks/masters/subjectCategories.ts` | Subject category hooks |
| `src/api/hooks/masters/classsubjectmappings.ts` | Mapping hooks |
| `src/api/hooks/masters/holiday.ts` | Holiday hooks |
| `src/api/hooks/masters/vehicles.ts` | Vehicle hooks |
| `src/api/hooks/masters/routes.ts` | Route hooks |
| `src/api/hooks/masters/routeStops.ts` | Route stop hooks |
| `src/api/hooks/masters/trips.ts` | Trip hooks |
| `src/api/hooks/masters/studentTransport.ts` | Student transport hooks |
| `src/api/hooks/masters/studentTrips.ts` | Student trip hooks |
| `src/api/hooks/masters/timetable.ts` | Timetable hooks |

### State Management

| File | Purpose |
|------|---------|
| `src/lib/academicYearStore.ts` | Academic year selection state |

### API Endpoints

| Directory | Purpose |
|-----------|---------|
| `src/api/masters/` | Masters API functions |

### Components

| Directory | Purpose |
|-----------|---------|
| `src/components/masters/` | Master data components |
| `src/components/masters/classesandsections/` | Class/section components |
| `src/components/masters/classsubjectmappings/` | Class-subject mapping components (bulk add modal) |
| `src/components/masters/parents/` | Parent components |
| `src/components/masters/trips/` | Trip components |
| `src/components/dropdown/CreateCategoryPopover.tsx` | Inline subject category creation popover |

### Hooks

| Directory | Purpose |
|-----------|---------|
| `src/hooks/masters/` | Additional master hooks |

### Constants

| Directory | Purpose |
|-----------|---------|
| `src/constants/api/masters/` | API constants for masters |

### Types

| Directory | Purpose |
|-----------|---------|
| `src/types/masters/` | Type definitions |

---

## Data Model Summary

[EVIDENCE-BASED]

### Academic Year

```typescript
interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}
```

**Source**: `src/types/masters/academicyear.ts`, `src/lib/academicYearStore.ts`

### Academic Year Store

```typescript
interface AcademicYearState {
  academicYears: AcademicYear[];
  selectedAcademicYearId: string;
  setSelectedAcademicYearId: (id: string) => void;
  setAcademicYears: (years: AcademicYear[]) => void;
  fetchAndSetAcademicYears: () => Promise<void>;
  clearInvalidData: () => void;
}
```

**Source**: `src/lib/academicYearStore.ts`

### Expected Entity Types

```typescript
interface Class {
  id: string;
  name: string;
  order?: number;
  is_active: boolean;
}

interface Section {
  id: string;
  class_id: string;
  name: string;
  is_active: boolean;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
  category_id?: string;
  is_active: boolean;
}

interface SubjectCategory {
  id: string;
  name: string;
  is_active: boolean;
}

interface ClassSubjectMapping {
  id: string;
  class_id: string;
  subject_id: string;
  section_id?: string;
  academic_year_id: string;
  exclude_marks: boolean;
  order?: number;
  is_active: boolean;
}

interface ClassSubjectMappingBulkCreate {
  class_id: string;
  section_id?: string;
  academic_year_id: string;
  subjects: SubjectMappingItem[];
}

interface SubjectMappingItem {
  subject_id: string;
  exclude_marks?: boolean;
  order?: number;
  is_active?: boolean;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  is_active: boolean;
}
```

---

## Invariants & Rules

[EVIDENCE-BASED]

### Academic Year Selection

1. **Persistence**: Selected academic year persisted in localStorage
2. **Validation**: Invalid IDs (like '371' or short IDs) are cleared
3. **Auto-Selection**: If current selection invalid, selects active year or last in list

```typescript
// Validation logic from academicYearStore.ts
if (!currentId || currentId === '' || currentId === '371' || currentId.length < 10 || !existsInList) {
  const activeYear = years.find(year => year.is_active);
  // Select active or fallback to last year
}
```

**Evidence**: `src/lib/academicYearStore.ts:48-62`

### Class-Subject Mappings

1. Active subjects only shown in timetable
2. Mappings connect classes to subjects with optional section-level granularity
3. **Bulk Creation**: Supports multi-select subjects with per-subject settings (order, exclude_marks, is_active)
4. **Section Support**:
   - `section_id: undefined` → Applies to ALL active sections in the class
   - `section_id: <UUID>` → Applies to specific section only
5. **Cascading Dropdown**: Section dropdown appears after class selection with "All Sections" option
6. **Upsert Behavior**: Backend creates new, updates existing, deactivates removed mappings
7. **Unique Constraint**: `class_id + section_id + subject_id + academic_year_id`

**Evidence**: `AI_GOVERNANCE/handovers/FRONTEND_HANDOVER_CLASS_SUBJECT_MAPPING.md`, `src/components/masters/classsubjectmappings/AddBulkClassSubjectMappingsModal.tsx`

### Subject Category Inline Creation

1. **Quick Add**: Users can create subject categories inline from the Subject form via "+" button
2. **Permission-Based**: Button only visible if user has `subject_categories.create` permission
3. **Auto-Selection**: Newly created category is automatically selected in the dropdown
4. **Modal Compatibility**: Uses `modal={true}` on Popover to work within parent Dialog
5. **Query Invalidation**: Creates invalidate all three query types:
   - `['subject-categories']`
   - `['subject-categories-dropdown']`
   - `['subject-categories-infinite']`

**Evidence**: `src/components/dropdown/CreateCategoryPopover.tsx`, `src/api/hooks/masters/subjectCategories.ts:44-47`

---

## Public Interfaces

[EVIDENCE-BASED]

### Academic Year Store

```typescript
import { useAcademicYearStore } from '@/lib/academicYearStore';

// Read state
const academicYears = useAcademicYearStore(s => s.academicYears);
const selectedId = useAcademicYearStore(s => s.selectedAcademicYearId);

// Actions
const setSelectedAcademicYearId = useAcademicYearStore(s => s.setSelectedAcademicYearId);
const fetchAndSetAcademicYears = useAcademicYearStore(s => s.fetchAndSetAcademicYears);
```

### Dropdown Components

From dropdown system:
```typescript
AcademicYearsDropdown
ClassesDropdown
SectionsByClassDropdown
SubjectCategoriesDropdown
SubjectsDropdown
SubjectsByCategoryDropdown
HolidaysDropdown
```

### API Functions

```typescript
// From src/api/masters/academicyears.ts
fetchAcademicYears()
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

- **Dropdown System**: Provides dropdown components
- **Core API**: CAxios for API calls

### External Dependencies

- **zustand**: State management with persist middleware
- **@tanstack/react-query**: Data fetching

---

## Known Risks

[INFERENCE]

### Data Integrity

1. **Cascading Deletes**: Deleting class may orphan sections, mappings
2. **Academic Year Switch**: Ensure data filtered by selected year

### Migration Issues

1. **Legacy ID Handling**: Code specifically handles legacy ID '371'
2. **ID Format Changes**: Validation expects IDs >= 10 characters

### User Experience

1. **Year Selection**: Users must remember to select correct academic year
2. **Active Filtering**: Some entities filtered by active status only

---

## Test Coverage

[UNCERTAIN]

No dedicated masters module tests found in codebase.

---

## Uncertainties

[UNCERTAIN]

1. **Timetable Generation**: How timetables are generated/managed
2. **Academic Calendar**: Full calendar features beyond holidays
3. **Grading System**: Grade/marks configuration unclear
4. **Class Promotion**: Year-end class promotion process
5. **Section Assignment**: How students are assigned to sections
6. **Parent Linking**: How parents linked to students
7. **Role Creation**: Custom role creation capabilities
8. **Permission Granularity**: Full permission action list
9. **Multi-Campus**: If multiple campus/branch support exists

---

## Changelog

### Version 1.4 (2025-12-28)

**Subject Category Inline Creation (Quick Add Category)**

Implemented inline category creation for the Subject page per Feature Plan Option 1.

**User Flow:**
1. User opens "Add Subject" dialog
2. User sees category dropdown with "+" button beside it
3. User clicks "+" → Popover opens with category name input
4. On save, category is created and auto-selected in dropdown
5. User continues filling subject details

**Changes Implemented:**

| Component | Change |
|-----------|--------|
| `CreateCategoryPopover` | New component for inline category creation |
| Subject Page | Integrated popover with category dropdown (form + table edit) |
| Query Invalidation | Fixed to invalidate all category query types |

**Technical Notes:**
- Uses `modal={true}` on Popover for proper focus management within Dialog
- Event propagation handlers prevent parent Dialog from closing
- Permission check: `subject_categories.create`

**Files Created:**
- `src/components/dropdown/CreateCategoryPopover.tsx`

**Files Modified:**
- `src/components/dropdown/index.ts`
- `src/pages/masters/subject.tsx`
- `src/api/hooks/masters/subjectCategories.ts`

**Handover Documents:**
- `AI_GOVERNANCE/handovers/subject_category_inline_creation_frontend_impl.md`
- `AI_GOVERNANCE/handovers/subject_category_inline_creation_backend_handover.md`
- `AI_GOVERNANCE/handovers/subject_category_inline_creation_validation_report.md`
- `AI_GOVERNANCE/handovers/subject_category_inline_creation_validation_checklist.md`

---

### Version 1.3 (2025-12-28)

**Backend Alignment: Class-Subject Mapping Section Support**

Aligned frontend with backend API per `AI_GOVERNANCE/handovers/FRONTEND_HANDOVER_CLASS_SUBJECT_MAPPING.md`.

**Changes Implemented:**

| Component | Change |
|-----------|--------|
| Section Dropdown | Added "All Sections" option at top of dropdown |
| Warning UI | Amber alert showing "This will apply to all X sections in [Class]" |
| API Payload | Sends `section_id: undefined` when "All Sections" selected |
| Table | Added "Section" column after "Class" column |

**Type Updates (`src/types/masters/subject.ts`):**

```typescript
// ClassSubjectMapping - added fields
section_id?: string;
section_name?: string;

// ClassSubjectMappingBulkResponse - added fields
updated_count: number;
deactivated_count: number;
sections_processed: number;
```

**Files Modified:**
- `src/components/masters/classsubjectmappings/AddBulkClassSubjectMappingsModal.tsx`
- `src/types/masters/subject.ts`
- `src/pages/masters/classsubjectmappings.tsx`

**Backend API Behavior:**
- `section_id: undefined` → Applies to ALL active sections in the class
- `section_id: <UUID>` → Applies to specific section only
- Upsert behavior: Creates new, updates existing, deactivates removed mappings

---

### Version 1.2 (2025-12-28)

**Validation Completed: Class-Subject Mapping Multi-Select Enhancement**

Implementation validated per `agents/validation.md` protocol:

| Validation Step | Result |
|-----------------|--------|
| Input Completeness | ✅ Feature plan + Implementation report provided |
| Feature Implementation | ✅ All requirements implemented |
| Scope Verification | ✅ Only listed files modified/created |
| Code Quality Review | ✅ Follows React Query, shadcn/ui, TypeScript patterns |
| Regression Assessment | Low risk - uses existing bulk create hook |
| Governance Compliance | ✅ AI_HALLUCINATION_SOP followed |
| **Final Decision** | **ACCEPTED** |

**Evidence Verified:**
- Multi-select subjects: `AddBulkClassSubjectMappingsModal.tsx:221-233`
- Per-subject settings table: `AddBulkClassSubjectMappingsModal.tsx:236-314`
- Cascading section dropdown: `AddBulkClassSubjectMappingsModal.tsx:198-216`
- Type update for `section_id`: `src/types/masters/subject.ts:95`
- MasterPage integration: `classsubjectmappings.tsx:240-246`

---

### Version 1.1 (2025-12-27)

**Class-Subject Mappings Enhancement**

- Added `AddBulkClassSubjectMappingsModal` component for multi-select subject creation
- Updated `ClassSubjectMappingBulkCreate` type to include `section_id`
- New features:
  - Multi-select subjects with react-select `isMulti`
  - Per-subject settings table (order, exclude_marks, is_active)
  - Cascading section dropdown (appears after class selection)
  - Bulk creation using existing `useCreateBulkClassSubjectMappings` hook
- Files created:
  - `src/components/masters/classsubjectmappings/AddBulkClassSubjectMappingsModal.tsx`
  - `src/components/masters/classsubjectmappings/index.ts`
- Files modified:
  - `src/pages/masters/classsubjectmappings.tsx`
  - `src/types/masters/subject.ts`

**Handover Document**: `AI_GOVERNANCE/handovers/class_subject_mapping_multiselect_implementation.md`
