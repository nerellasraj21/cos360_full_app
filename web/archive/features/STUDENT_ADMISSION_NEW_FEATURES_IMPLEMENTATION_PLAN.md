# Student Admission New Features - Implementation Plan

**Date**: February 4, 2026
**For**: Frontend Development Team
**Backend Status**: ✅ **ALL APIS READY** - Complete backend implementation
**Plan Status**: 📋 **READY FOR IMPLEMENTATION**

---

## Executive Summary

This plan outlines the implementation of 4 major new features for the student admission system plus master data management screens. All backend APIs are complete and documented in `frontend_admission_features_handover.md`.

### What Will Be Built

**Student Admission Form Enhancements** (4 features):
1. **Admission Type Selector** - Primary vs Non-Primary with auto-generated numbers
2. **Parent Salary Range Dropdown** - Income tracking for parents
3. **Caste Cascading Dropdowns** - 2-level: Caste → Sub-Caste
4. **Location Cascading Dropdowns** - 3-level: State → District → Mandal

**Master Data Management** (5 screens):
5. **Caste Management** - CRUD for castes
6. **Sub-Caste Management** - CRUD for sub-castes
7. **State Management** - CRUD for states
8. **District Management** - CRUD for districts
9. **Mandal Management** - CRUD for mandals

### Implementation Scope

- **Files to Create**: ~10 new files
- **Files to Modify**: ~5 existing files
- **New API Hooks**: ~15 hooks
- **New Dropdown Components**: 5 components
- **Master CRUD Pages**: 5 pages
- **Estimated Effort**: 3-4 days
- **Complexity**: Medium-High (cascading dropdowns pattern)

---

## Table of Contents

1. [Already Implemented Features](#already-implemented-features)
2. [Features To Implement](#features-to-implement)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Phases](#implementation-phases)
5. [File Structure](#file-structure)
6. [Detailed Implementation Steps](#detailed-implementation-steps)
7. [API Integration Details](#api-integration-details)
8. [Testing Strategy](#testing-strategy)
9. [Success Criteria](#success-criteria)
10. [Risks and Mitigations](#risks-and-mitigations)

---

## Already Implemented Features

✅ **Completed** (from STUDENT_ADMISSION_FINAL_HANDOVER.md):

| Feature | Status | Location |
|---------|--------|----------|
| #1: Academic Year Auto-Population | ✅ Complete | MultiStepAdmissionForm.tsx, AcademicStepForm.tsx |
| #3: Class/Section Sync Checkbox | ✅ Complete | AcademicStepForm.tsx |
| #6: Mother Tongue Dropdown | ✅ Complete | StudentStepForm.tsx |
| #8: Parent Phone Search | ✅ Complete | ParentsStepForm.tsx, parents.ts |
| #11: Previous School Label Fix | ✅ Complete | PreviousSchoolStepForm.tsx |

**Note**: These features are production-ready and should not be modified.

---

## Features To Implement

### Priority Matrix

| Priority | Feature | Complexity | Dependencies | Implementation Order |
|----------|---------|------------|--------------|---------------------|
| **HIGH** | #5: Admission Type Selector | Low | None | **Phase 1** |
| **HIGH** | #9: Parent Salary Range | Low | None | **Phase 1** |
| **HIGH** | #7: Caste Cascading | Medium | Master data | **Phase 2** |
| **HIGH** | #10: Location Cascading | High | Master data | **Phase 3** |
| **MEDIUM** | Master Data Screens | Medium | None | **Phase 4** |

---

## Technical Architecture

### Current State Analysis

**Form Structure**:
```
MultiStepAdmissionForm.tsx (parent, FormProvider)
  ├── AcademicStepForm.tsx (step 1)
  ├── StudentStepForm.tsx (step 2) ← Caste dropdowns here
  ├── ParentsStepForm.tsx (step 3) ← Salary range here
  ├── AddressStepForm.tsx (step 4) ← Location dropdowns here
  ├── PreviousSchoolStepForm.tsx (step 5)
  └── SummaryStepForm.tsx (step 6)
```

**Current Fields** (that need modification):
- `student_is_primary` (StudentStepForm.tsx) → Keep but also add admission-level field
- `student_caste` (text) → Change to `caste_id` (UUID, cascading dropdown)
- `student_sub_caste` (text) → Change to `sub_caste_id` (UUID, cascading dropdown)
- `state` (text in address) → Change to `state_id`, `district_id`, `mandal_id` (UUIDs, 3-level cascade)

### New Architecture Components

#### 1. API Layer
```
src/api/
├── hooks/
│   └── masters/
│       ├── castes.ts          ← NEW (React Query hooks)
│       ├── locations.ts       ← NEW (React Query hooks)
│       └── salaryRanges.ts    ← NEW (React Query hook)
└── masters/
    ├── castes.ts              ← NEW (API functions)
    ├── locations.ts           ← NEW (API functions)
    └── salaryRanges.ts        ← NEW (API functions)
```

#### 2. Dropdown Components
```
src/components/dropdown/
├── SalaryRangeDropdown.tsx    ← NEW
├── CasteDropdown.tsx          ← NEW (level 1)
├── SubCasteDropdown.tsx       ← NEW (level 2, cascading)
├── StateDropdown.tsx          ← NEW (level 1)
├── DistrictDropdown.tsx       ← NEW (level 2, cascading)
└── MandalDropdown.tsx         ← NEW (level 3, cascading)
```

#### 3. Master Data Pages
```
src/pages/masters/
├── castes.tsx                 ← NEW (list + CRUD)
├── caste-details.tsx          ← NEW (sub-castes for a caste)
├── states.tsx                 ← NEW (list + CRUD)
├── state-districts.tsx        ← NEW (districts for a state)
└── district-mandals.tsx       ← NEW (mandals for a district)
```

#### 4. Routing
```
src/routes/_app/masters/
├── castes.tsx                 ← NEW route
├── castes.$casteId.tsx        ← NEW route (sub-castes)
├── locations.tsx              ← NEW route (states list)
├── locations.$stateId.tsx     ← NEW route (districts for state)
└── locations.$stateId.$districtId.tsx  ← NEW route (mandals for district)
```

---

## Implementation Phases

### Phase 1: Simple Enhancements (Day 1)

**Goal**: Implement non-cascading features

**Features**:
- ✅ Feature #5: Admission Type Selector
- ✅ Feature #9: Parent Salary Range Dropdown

**Deliverables**:
1. Admission type radio/dropdown in AcademicStepForm
2. Optional: Preview next admission number
3. Salary range dropdown in ParentsStepForm (father & mother)
4. API integration for salary ranges
5. Updated form submission payload

**Testing**:
- Admission number format validation
- Salary range selection and submission
- Form validation

---

### Phase 2: Caste Cascading Dropdowns (Day 2)

**Goal**: Implement 2-level cascading dropdowns

**Features**:
- ✅ Feature #7: Caste & Sub-Caste Cascading

**Deliverables**:
1. Caste API functions and hooks
2. CasteDropdown component
3. SubCasteDropdown component (cascading)
4. Integration in StudentStepForm
5. Update form payload to use UUIDs

**Testing**:
- Caste selection enables sub-caste
- Sub-caste loads correctly for selected caste
- Changing caste clears sub-caste
- Form submission with UUIDs

---

### Phase 3: Location Cascading Dropdowns (Day 3)

**Goal**: Implement 3-level cascading dropdowns

**Features**:
- ✅ Feature #10: Location Cascading

**Deliverables**:
1. Location API functions and hooks
2. StateDropdown component
3. DistrictDropdown component (cascading)
4. MandalDropdown component (cascading)
5. Integration in AddressStepForm
6. Update form payload to use UUIDs

**Testing**:
- State → District → Mandal cascade flow
- Each level enables next level
- Changing parent clears children
- Form submission with UUIDs

---

### Phase 4: Master Data Management (Day 4)

**Goal**: Build admin CRUD screens

**Features**:
- ✅ Caste Management
- ✅ Sub-Caste Management
- ✅ State Management
- ✅ District Management
- ✅ Mandal Management

**Deliverables**:
1. 5 master data pages using MasterPage pattern
2. Routing configuration
3. Navigation menu items
4. Permission guards

**Testing**:
- Create, read, update, delete operations
- Pagination and filtering
- Dependency validation (can't delete with children)
- Permission checks

---

## File Structure

### Files to Create (~15 new files)

```
1. API Layer (6 files)
   ├── src/api/masters/castes.ts
   ├── src/api/masters/locations.ts
   ├── src/api/masters/salaryRanges.ts
   ├── src/api/hooks/masters/castes.ts
   ├── src/api/hooks/masters/locations.ts
   └── src/api/hooks/masters/salaryRanges.ts

2. Dropdown Components (6 files)
   ├── src/components/dropdown/SalaryRangeDropdown.tsx
   ├── src/components/dropdown/CasteDropdown.tsx
   ├── src/components/dropdown/SubCasteDropdown.tsx
   ├── src/components/dropdown/StateDropdown.tsx
   ├── src/components/dropdown/DistrictDropdown.tsx
   └── src/components/dropdown/MandalDropdown.tsx

3. Master Pages (5 files)
   ├── src/routes/_app/masters/castes.tsx
   ├── src/routes/_app/masters/castes.$casteId.tsx
   ├── src/routes/_app/masters/locations.tsx
   ├── src/routes/_app/masters/locations.$stateId.tsx
   └── src/routes/_app/masters/locations.$stateId.$districtId.tsx

4. TypeScript Types (1 file)
   └── src/types/masters.ts (caste, location types)
```

### Files to Modify (~5 existing files)

```
1. src/components/students/MultiStepAdmissionForm.tsx
   - Add admission_type field to defaultValues
   - Update onSubmit payload for new UUIDs
   - Add salary_range for father/mother

2. src/components/students/admission-steps/AcademicStepForm.tsx
   - Add admission type selector
   - Optional: Add admission number preview

3. src/components/students/admission-steps/StudentStepForm.tsx
   - Replace text caste/sub-caste with cascading dropdowns
   - Update field names to caste_id, sub_caste_id

4. src/components/students/admission-steps/ParentsStepForm.tsx
   - Add salary range dropdowns for father and mother

5. src/components/students/admission-steps/AddressStepForm.tsx
   - Replace state text field with State/District/Mandal cascade
   - Update field names to state_id, district_id, mandal_id
```

---

## Detailed Implementation Steps

### Phase 1, Step 1: Admission Type Selector

**File**: `src/components/students/admission-steps/AcademicStepForm.tsx`

**Implementation**:

1. Add admission type field after admission date:
```tsx
<div>
  <Label htmlFor="admission_type">Admission Type</Label>
  <select
    id="admission_type"
    className="flex h-10 w-full rounded-md border..."
    {...register('admission_type')}
  >
    <option value="non_primary">Non-Primary Admission</option>
    <option value="primary">Primary Admission</option>
  </select>
</div>
```

2. **Optional Enhancement**: Add admission number preview
```tsx
// Add state and hook
const [previewNumber, setPreviewNumber] = useState<string>('');
const admissionType = watch('admission_type');

useEffect(() => {
  if (admissionType) {
    fetch(`/api/v1/students/admission/next-admission-number?type=${admissionType}`)
      .then(res => res.json())
      .then(data => setPreviewNumber(data.next_number));
  }
}, [admissionType]);

// Display preview
{previewNumber && (
  <p className="text-sm text-gray-600">
    Next admission number will be: <strong>{previewNumber}</strong>
  </p>
)}
```

**Update MultiStepAdmissionForm.tsx**:
```tsx
// Add to defaultValues
admission_type: 'non_primary',

// Add to onSubmit payload
admission_type: data.admission_type || 'non_primary',
```

**Testing**:
- [ ] Radio/dropdown displays with both options
- [ ] Default is "non_primary"
- [ ] Preview updates when changed (if implemented)
- [ ] Form submits with admission_type
- [ ] Backend returns correct format (P2026001 vs NP2026001)

---

### Phase 1, Step 2: Parent Salary Range Dropdown

**File 1**: Create `src/api/masters/salaryRanges.ts`

```typescript
import { CAxios } from '../index';

export interface SalaryRange {
  value: string;
  label: string;
  display: string;
}

export const salaryRangesApi = {
  getDropdownOptions: async (): Promise<SalaryRange[]> => {
    const response = await CAxios.get('/masters/parents/salary-ranges/dropdown');
    return response.data;
  },
};
```

**File 2**: Create `src/api/hooks/masters/salaryRanges.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { salaryRangesApi, SalaryRange } from '@/api/masters/salaryRanges';

export const salaryRangeKeys = {
  all: ['salary-ranges'] as const,
  dropdown: () => [...salaryRangeKeys.all, 'dropdown'] as const,
};

export const useSalaryRanges = () => {
  return useQuery<SalaryRange[]>({
    queryKey: salaryRangeKeys.dropdown(),
    queryFn: () => salaryRangesApi.getDropdownOptions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

**File 3**: Create `src/components/dropdown/SalaryRangeDropdown.tsx`

```typescript
import React from 'react';
import { Label } from '@/components/ui/label';
import { useSalaryRanges } from '@/api/hooks/masters/salaryRanges';
import { Loader2 } from 'lucide-react';

interface SalaryRangeDropdownProps {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  register: any; // React Hook Form register
  required?: boolean;
}

export const SalaryRangeDropdown: React.FC<SalaryRangeDropdownProps> = ({
  id,
  label,
  register,
  required = false,
}) => {
  const { data: ranges = [], isLoading } = useSalaryRanges();

  if (isLoading) {
    return (
      <div>
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-2 p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={id}>{label}{required && ' *'}</Label>
      <select
        id={id}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        {...register}
      >
        <option value="">-- Select Salary Range --</option>
        {ranges.map((range) => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </select>
    </div>
  );
};
```

**File 4**: Update `src/components/students/admission-steps/ParentsStepForm.tsx`

```tsx
// Add import
import { SalaryRangeDropdown } from '@/components/dropdown/SalaryRangeDropdown';

// Add after father occupation field
<SalaryRangeDropdown
  id="father_salary_range"
  label="Father Salary Range"
  register={register('father_salary_range')}
/>

// Add after mother occupation field
<SalaryRangeDropdown
  id="mother_salary_range"
  label="Mother Salary Range"
  register={register('mother_salary_range')}
/>
```

**File 5**: Update `src/components/students/MultiStepAdmissionForm.tsx`

```tsx
// Add to defaultValues
father_salary_range: '',
mother_salary_range: '',

// Update onSubmit payload in student.father
father: {
  // ... existing fields
  salary_range: data.father_salary_range || undefined,
}

// Update onSubmit payload in student.mother
mother: {
  // ... existing fields
  salary_range: data.mother_salary_range || undefined,
}
```

**Testing**:
- [ ] Dropdown loads 5 options
- [ ] Field is optional (can submit empty)
- [ ] Selected value is submitted
- [ ] Backend receives salary_range in father/mother objects

---

### Phase 2: Caste Cascading Dropdowns

**File 1**: Create `src/types/masters.ts`

```typescript
export interface Caste {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
}

export interface SubCaste {
  id: string;
  caste_id: string;
  name: string;
  code?: string;
  is_active: boolean;
}

export interface CasteDropdownOption {
  id: string;
  name: string;
  code: string;
}

export interface SubCasteDropdownOption {
  id: string;
  caste_id: string;
  name: string;
  code: string;
}
```

**File 2**: Create `src/api/masters/castes.ts`

```typescript
import { CAxios } from '../index';
import { Caste, SubCaste, CasteDropdownOption, SubCasteDropdownOption } from '@/types/masters';

export const castesApi = {
  // Dropdown endpoints
  getCastesDropdown: async (activeOnly: boolean = true): Promise<CasteDropdownOption[]> => {
    const response = await CAxios.get(`/masters/castes/dropdown?active_only=${activeOnly}`);
    return response.data;
  },

  getSubCastesDropdown: async (
    casteId: string,
    activeOnly: boolean = true
  ): Promise<SubCasteDropdownOption[]> => {
    const response = await CAxios.get(
      `/masters/castes/${casteId}/sub-castes/dropdown?active_only=${activeOnly}`
    );
    return response.data;
  },

  // CRUD endpoints for master data management
  getCastes: async (skip: number = 0, limit: number = 20, activeOnly: boolean = false) => {
    const response = await CAxios.get(
      `/masters/castes/?skip=${skip}&limit=${limit}&active_only=${activeOnly}`
    );
    return response.data;
  },

  getCaste: async (id: string): Promise<Caste> => {
    const response = await CAxios.get(`/masters/castes/${id}`);
    return response.data;
  },

  createCaste: async (data: { name: string; code?: string; is_active?: boolean }) => {
    const response = await CAxios.post('/masters/castes/', data);
    return response.data;
  },

  updateCaste: async (id: string, data: { name?: string; code?: string; is_active?: boolean }) => {
    const response = await CAxios.put(`/masters/castes/${id}`, data);
    return response.data;
  },

  deleteCaste: async (id: string) => {
    const response = await CAxios.delete(`/masters/castes/${id}`);
    return response.data;
  },

  // Sub-caste CRUD
  getSubCastes: async (casteId: string, activeOnly: boolean = false) => {
    const response = await CAxios.get(
      `/masters/castes/${casteId}/sub-castes?active_only=${activeOnly}`
    );
    return response.data;
  },

  createSubCaste: async (data: {
    caste_id: string;
    name: string;
    code?: string;
    is_active?: boolean;
  }) => {
    const response = await CAxios.post('/masters/castes/sub-castes', data);
    return response.data;
  },

  updateSubCaste: async (
    id: string,
    data: { name?: string; code?: string; is_active?: boolean }
  ) => {
    const response = await CAxios.put(`/masters/castes/sub-castes/${id}`, data);
    return response.data;
  },

  deleteSubCaste: async (id: string) => {
    const response = await CAxios.delete(`/masters/castes/sub-castes/${id}`);
    return response.data;
  },
};
```

**File 3**: Create `src/api/hooks/masters/castes.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { castesApi } from '@/api/masters/castes';
import { toast } from 'sonner';

export const casteKeys = {
  all: ['castes'] as const,
  dropdown: () => [...casteKeys.all, 'dropdown'] as const,
  list: () => [...casteKeys.all, 'list'] as const,
  detail: (id: string) => [...casteKeys.all, id] as const,
  subCastes: (casteId: string) => [...casteKeys.all, casteId, 'sub-castes'] as const,
  subCasteDropdown: (casteId: string) => [
    ...casteKeys.all,
    casteId,
    'sub-castes',
    'dropdown',
  ] as const,
};

// Dropdown hooks (for admission form)
export const useCastesDropdown = (activeOnly: boolean = true) => {
  return useQuery({
    queryKey: [...casteKeys.dropdown(), activeOnly],
    queryFn: () => castesApi.getCastesDropdown(activeOnly),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSubCastesDropdown = (casteId: string | undefined, activeOnly: boolean = true) => {
  return useQuery({
    queryKey: [...casteKeys.subCasteDropdown(casteId || ''), activeOnly],
    queryFn: () => castesApi.getSubCastesDropdown(casteId!, activeOnly),
    enabled: !!casteId,
    staleTime: 5 * 60 * 1000,
  });
};

// CRUD hooks (for master data pages)
export const useCastes = (skip: number = 0, limit: number = 20, activeOnly: boolean = false) => {
  return useQuery({
    queryKey: [...casteKeys.list(), skip, limit, activeOnly],
    queryFn: () => castesApi.getCastes(skip, limit, activeOnly),
  });
};

export const useCreateCaste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: castesApi.createCaste,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casteKeys.all });
      toast.success('Caste created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create caste');
    },
  });
};

export const useUpdateCaste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => castesApi.updateCaste(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casteKeys.all });
      toast.success('Caste updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update caste');
    },
  });
};

export const useDeleteCaste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: castesApi.deleteCaste,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casteKeys.all });
      toast.success('Caste deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete caste');
    },
  });
};

// Similar hooks for sub-castes...
export const useCreateSubCaste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: castesApi.createSubCaste,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casteKeys.all });
      toast.success('Sub-caste created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create sub-caste');
    },
  });
};
```

**File 4**: Create `src/components/dropdown/CasteDropdown.tsx`

```typescript
import React from 'react';
import { Label } from '@/components/ui/label';
import { useCastesDropdown } from '@/api/hooks/masters/castes';
import { Loader2 } from 'lucide-react';

interface CasteDropdownProps {
  id: string;
  label?: string;
  value?: string;
  onChange: (value: string | null) => void;
  register?: any;
  required?: boolean;
}

export const CasteDropdown: React.FC<CasteDropdownProps> = ({
  id,
  label = 'Caste',
  value,
  onChange,
  register,
  required = false,
}) => {
  const { data: castes = [], isLoading } = useCastesDropdown(true);

  if (isLoading) {
    return (
      <div>
        <Label htmlFor={id}>{label}{required && ' *'}</Label>
        <div className="flex items-center gap-2 p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading castes...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={id}>{label}{required && ' *'}</Label>
      <select
        id={id}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        {...register}
      >
        <option value="">-- Select Caste --</option>
        {castes.map((caste) => (
          <option key={caste.id} value={caste.id}>
            {caste.name} {caste.code && `(${caste.code})`}
          </option>
        ))}
      </select>
    </div>
  );
};
```

**File 5**: Create `src/components/dropdown/SubCasteDropdown.tsx`

```typescript
import React from 'react';
import { Label } from '@/components/ui/label';
import { useSubCastesDropdown } from '@/api/hooks/masters/castes';
import { Loader2 } from 'lucide-react';

interface SubCasteDropdownProps {
  id: string;
  label?: string;
  casteId?: string;
  value?: string;
  onChange: (value: string | null) => void;
  register?: any;
  required?: boolean;
}

export const SubCasteDropdown: React.FC<SubCasteDropdownProps> = ({
  id,
  label = 'Sub-Caste',
  casteId,
  value,
  onChange,
  register,
  required = false,
}) => {
  const { data: subCastes = [], isLoading } = useSubCastesDropdown(casteId, true);

  const isDisabled = !casteId;

  if (isLoading && casteId) {
    return (
      <div>
        <Label htmlFor={id}>{label}{required && ' *'}</Label>
        <div className="flex items-center gap-2 p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading sub-castes...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={id}>{label}{required && ' *'}</Label>
      <select
        id={id}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={isDisabled}
        {...register}
      >
        <option value="">-- Select Sub-Caste --</option>
        {subCastes.map((subCaste) => (
          <option key={subCaste.id} value={subCaste.id}>
            {subCaste.name} {subCaste.code && `(${subCaste.code})`}
          </option>
        ))}
      </select>
      {isDisabled && (
        <p className="text-xs text-gray-500 mt-1">Please select a caste first</p>
      )}
    </div>
  );
};
```

**File 6**: Update `src/components/students/admission-steps/StudentStepForm.tsx`

```tsx
// Add imports
import { CasteDropdown } from '@/components/dropdown/CasteDropdown';
import { SubCasteDropdown } from '@/components/dropdown/SubCasteDropdown';
import { useEffect, useState } from 'react';

// Add state for caste cascade
const [selectedCasteId, setSelectedCasteId] = useState<string | undefined>();

// Watch caste field
const casteId = watch('caste_id');

// Sync state with form field
useEffect(() => {
  setSelectedCasteId(casteId || undefined);
}, [casteId]);

// Clear sub-caste when caste changes
useEffect(() => {
  setValue('sub_caste_id', '');
}, [selectedCasteId, setValue]);

// Replace old text fields with:
<CasteDropdown
  id="caste_id"
  label="Caste"
  value={selectedCasteId}
  onChange={(value) => {
    setValue('caste_id', value || '');
    setSelectedCasteId(value || undefined);
  }}
/>

<SubCasteDropdown
  id="sub_caste_id"
  label="Sub-Caste"
  casteId={selectedCasteId}
  value={watch('sub_caste_id')}
  onChange={(value) => setValue('sub_caste_id', value || '')}
/>
```

**File 7**: Update `src/components/students/MultiStepAdmissionForm.tsx`

```tsx
// Update defaultValues - remove old text fields
// student_caste: '',        ← REMOVE
// student_sub_caste: '',    ← REMOVE

// Add new UUID fields
caste_id: '',
sub_caste_id: '',

// Update onSubmit payload
student: {
  // ... other fields
  caste_id: data.caste_id || undefined,
  sub_caste_id: data.sub_caste_id || undefined,
  // Remove: caste, sub_caste (old text fields)
}
```

**Testing**:
- [ ] Caste dropdown loads on page load
- [ ] Sub-caste dropdown is disabled initially
- [ ] Selecting caste enables sub-caste dropdown
- [ ] Sub-caste loads correct options for selected caste
- [ ] Changing caste clears sub-caste
- [ ] Form submits with caste_id and sub_caste_id (UUIDs)

---

### Phase 3: Location Cascading Dropdowns

**Implementation**: Similar pattern to castes but 3-level

**Files to Create**:
1. `src/api/masters/locations.ts` - API functions
2. `src/api/hooks/masters/locations.ts` - React Query hooks
3. `src/components/dropdown/StateDropdown.tsx` - Level 1
4. `src/components/dropdown/DistrictDropdown.tsx` - Level 2 (cascading)
5. `src/components/dropdown/MandalDropdown.tsx` - Level 3 (cascading)

**Files to Modify**:
1. `src/components/students/admission-steps/AddressStepForm.tsx`
2. `src/components/students/MultiStepAdmissionForm.tsx`
3. `src/types/masters.ts` (add Location types)

**Key Implementation Points**:
- State dropdown loads on mount
- District dropdown enabled when state selected
- Mandal dropdown enabled when district selected
- Changing state clears district and mandal
- Changing district clears mandal
- Form submits state_id, district_id, mandal_id (all UUIDs)

**Code Structure**: Follow exact same pattern as castes but with 3 levels instead of 2

---

### Phase 4: Master Data Management Screens

**Implementation**: Use MasterPage pattern

**Example**: Caste Management Page

**File**: `src/routes/_app/masters/castes.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { MasterPage } from '@/pages/masters/common/MasterPage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useCastes, useCreateCaste, useUpdateCaste, useDeleteCaste } from '@/api/hooks/masters/castes';

export const Route = createFileRoute('/_app/masters/castes')({
  component: CastesPage,
});

function CastesPage() {
  const columns = [
    { key: 'id', label: 'ID', editable: false },
    { key: 'name', label: 'Name', editable: true },
    { key: 'code', label: 'Code', editable: true },
    {
      key: 'is_active',
      label: 'Status',
      editable: true,
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
      renderEdit: (value: boolean, _row, onChange) => (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4"
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      editable: false,
      render: (_value: any, row: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Navigate to sub-castes
            window.location.href = `/masters/castes/${row.id}`;
          }}
        >
          <Eye className="h-4 w-4" />
          <span className="ml-2">View Sub-Castes</span>
        </Button>
      ),
    },
  ];

  return (
    <MasterPage
      title="Castes"
      columns={columns}
      useReadHook={useCastes}
      useCreateHook={useCreateCaste}
      useUpdateHook={useUpdateCaste}
      useDeleteHook={useDeleteCaste}
      resource="castes"
    />
  );
}
```

**Similar pages needed**:
1. Sub-Castes (for a specific caste)
2. States
3. Districts (for a specific state)
4. Mandals (for a specific district)

---

## API Integration Details

### Endpoints Summary

| Feature | Endpoint | Method | Purpose |
|---------|----------|--------|---------|
| Admission Type Preview | `/students/admission/next-admission-number?type={type}` | GET | Preview next number |
| Salary Ranges | `/masters/parents/salary-ranges/dropdown` | GET | Get salary options |
| Castes Dropdown | `/masters/castes/dropdown?active_only=true` | GET | Caste level 1 |
| Sub-Castes Dropdown | `/masters/castes/{id}/sub-castes/dropdown?active_only=true` | GET | Caste level 2 |
| States Dropdown | `/masters/locations/states/dropdown?active_only=true` | GET | Location level 1 |
| Districts Dropdown | `/masters/locations/states/{id}/districts/dropdown?active_only=true` | GET | Location level 2 |
| Mandals Dropdown | `/masters/locations/districts/{id}/mandals/dropdown?active_only=true` | GET | Location level 3 |

### Authentication

All API calls require JWT token:
```typescript
// CAxios automatically adds headers
Authorization: Bearer {token}
cschema: {tenant}
```

### Error Handling

Standard error responses:
- 401: Unauthorized (redirect to login)
- 403: Permission denied
- 404: Not found
- 422: Validation error
- 400: Bad request (e.g., can't delete with dependencies)

---

## Testing Strategy

### Unit Testing

**Dropdown Components**:
- [ ] Component renders without errors
- [ ] Loading state displays correctly
- [ ] Options populate from API
- [ ] onChange callback fires
- [ ] Disabled state works

**Cascading Logic**:
- [ ] Child dropdown disabled when parent empty
- [ ] Child dropdown enabled when parent selected
- [ ] Child dropdown clears when parent changes

### Integration Testing

**Form Submission**:
- [ ] All new fields included in payload
- [ ] UUIDs format correctly
- [ ] Backend accepts payload
- [ ] Success toast displays
- [ ] Form resets after submission

**Cascading Flow**:
- [ ] Caste → Sub-Caste cascade works
- [ ] State → District → Mandal cascade works
- [ ] Multiple selections in sequence
- [ ] Back button maintains selections

### End-to-End Testing

**Complete Admission Flow**:
1. Fill admission type (Primary)
2. Complete student details with caste cascade
3. Complete parent details with salary ranges
4. Complete address with location cascade
5. Submit form
6. Verify backend receives all data
7. Verify admission number format

**Master Data Management**:
1. Create new caste
2. Create sub-caste for that caste
3. Use in admission form
4. Verify dropdown shows new options
5. Try to delete caste with sub-castes (should fail)
6. Delete sub-caste first, then caste (should succeed)

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Admission type selector working
- [ ] Admission numbers generated with correct format
- [ ] Salary range dropdowns loading and selectable
- [ ] Form submits with new fields
- [ ] No TypeScript errors

### Phase 2 Complete When:
- [ ] Caste dropdown loads on page load
- [ ] Sub-caste dropdown cascades correctly
- [ ] Form submits with caste_id and sub_caste_id
- [ ] Changing caste clears sub-caste
- [ ] No console errors

### Phase 3 Complete When:
- [ ] State → District → Mandal cascade works
- [ ] Each level enables next correctly
- [ ] Form submits with all 3 UUIDs
- [ ] Changing parent clears children
- [ ] No console errors

### Phase 4 Complete When:
- [ ] All 5 master pages accessible
- [ ] Create, update, delete operations work
- [ ] Dependency validation working
- [ ] Permissions enforced
- [ ] Navigation menu updated

### Overall Success:
- [ ] All 9 features implemented
- [ ] 100% CLAUDE.md compliance
- [ ] 0 TypeScript compilation errors
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Production ready

---

## Risks and Mitigations

### Risk 1: Master Data Not Populated
**Impact**: HIGH - Dropdowns will be empty
**Probability**: HIGH
**Mitigation**:
- Phase 4 (master data screens) must be completed first
- Admin must populate data before testing admission form
- Add helpful messages when dropdowns are empty
- Provide sample data import script

### Risk 2: Cascading Logic Complexity
**Impact**: MEDIUM - Bugs in cascade behavior
**Probability**: MEDIUM
**Mitigation**:
- Follow proven pattern from dropdown-system
- Thorough testing of all cascade scenarios
- useEffect dependency arrays must be correct
- Clear comments in code

### Risk 3: Form Payload Breaking Changes
**Impact**: HIGH - Backend rejects submissions
**Probability**: LOW
**Mitigation**:
- Carefully maintain backward compatibility
- Keep nested structure for student.father/mother
- Test with backend team before production
- Document all payload changes

### Risk 4: Performance with Large Datasets
**Impact**: MEDIUM - Slow dropdowns
**Probability**: LOW
**Mitigation**:
- Backend pagination implemented
- React Query caching (5 min staleTime)
- Only load active items by default
- Virtualization if needed (future)

### Risk 5: TypeScript Type Mismatches
**Impact**: MEDIUM - Compilation errors
**Probability**: MEDIUM
**Mitigation**:
- Define types upfront in types/masters.ts
- Use strict type checking
- Test incrementally
- Fix types before moving to next phase

---

## Timeline and Effort Estimates

### Phase 1: 1 Day (6-8 hours)
- Admission type: 2 hours
- Salary range dropdown: 4 hours
- Testing: 2 hours

### Phase 2: 1 Day (6-8 hours)
- Caste API layer: 2 hours
- Cascade components: 3 hours
- Form integration: 2 hours
- Testing: 1 hour

### Phase 3: 1 Day (6-8 hours)
- Location API layer: 2 hours
- Cascade components (3-level): 4 hours
- Form integration: 1 hour
- Testing: 1 hour

### Phase 4: 1 Day (6-8 hours)
- Master pages setup: 4 hours
- Routing and navigation: 2 hours
- Testing and polish: 2 hours

**Total Estimated Effort**: 3-4 days

---

## Next Steps

### Immediate Actions

1. **Review this plan** with team
2. **Verify backend APIs** are accessible
3. **Set up test environment** with sample data
4. **Begin Phase 1** implementation
5. **Create feature branch**: `feature/admission-enhancements`

### Implementation Order

1. ✅ Complete Phase 1 (simple enhancements)
2. ✅ Test Phase 1 thoroughly
3. ✅ Complete Phase 4 (master data screens)
4. ✅ Populate sample master data
5. ✅ Complete Phase 2 (caste cascade)
6. ✅ Test Phase 2 with sample data
7. ✅ Complete Phase 3 (location cascade)
8. ✅ Test Phase 3 with sample data
9. ✅ Full end-to-end testing
10. ✅ Production deployment

### Documentation Updates Needed

- [ ] Update CLAUDE.md if new patterns introduced
- [ ] Create user guide for master data management
- [ ] Update API documentation with new endpoints
- [ ] Create handover document when complete

---

## Appendix A: Quick Reference

### New Types to Add

```typescript
// src/types/admission.ts updates
export interface StudentAdmissionCreate {
  // Add these new fields:
  admission_type?: 'primary' | 'non_primary';
  caste_id?: string;
  sub_caste_id?: string;
  state_id?: string;
  district_id?: string;
  mandal_id?: string;
  father_salary_range?: string;
  mother_salary_range?: string;

  // Keep existing fields...
}
```

### Import Statements Reference

```typescript
// Common imports for all phases
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CAxios } from '@/api/index';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
```

### Query Key Patterns

```typescript
// Follow this pattern for all new hooks
export const featureKeys = {
  all: ['feature-name'] as const,
  dropdown: () => [...featureKeys.all, 'dropdown'] as const,
  list: () => [...featureKeys.all, 'list'] as const,
  detail: (id: string) => [...featureKeys.all, id] as const,
};
```

---

## Appendix B: Backend API Contract

### Request/Response Examples

**Admission Type Preview**:
```http
GET /students/admission/next-admission-number?type=primary

Response:
{
  "next_number": "P2026001",
  "format": "P{YEAR}{SEQ}",
  "type": "primary",
  "note": "Preview only"
}
```

**Caste Dropdown**:
```http
GET /masters/castes/dropdown?active_only=true

Response:
[
  { "id": "uuid-1", "name": "General", "code": "GEN" },
  { "id": "uuid-2", "name": "OBC", "code": "OBC" }
]
```

**Form Submission with New Fields**:
```json
POST /students/admission
{
  "admission_type": "primary",
  "admission_date": "2026-02-04",
  "state_id": "state-uuid",
  "district_id": "district-uuid",
  "mandal_id": "mandal-uuid",
  "student": {
    "first_name": "John",
    "caste_id": "caste-uuid",
    "sub_caste_id": "sub-caste-uuid",
    "father": {
      "name": "John Sr.",
      "salary_range": "3l_5l"
    }
  }
}
```

---

## Conclusion

This implementation plan provides a clear, phased approach to implementing all remaining student admission features. Following this plan ensures:

- ✅ Systematic implementation (Phase 1 → 4)
- ✅ Incremental testing at each phase
- ✅ Code quality and CLAUDE.md compliance
- ✅ Minimal risk through proven patterns
- ✅ Clear success criteria
- ✅ Complete documentation

**Status**: Ready for implementation approval
**Next**: Team review and Phase 1 kickoff

---

**Document Version**: 1.0
**Created**: February 4, 2026
**Status**: Draft - Pending Approval
