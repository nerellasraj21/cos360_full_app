# COS360 Frontend - Claude Code Instructions

This document provides comprehensive instructions for Claude Code when working with the COS360 Frontend codebase.

## Project Overview

**COS360** is a multi-tenant school management system frontend built with React 19, TypeScript, Vite, and TanStack Router. It handles students, staff, fees, expenses, transport, and more across different organizations with role-based access control.

**Key Technologies:**

- React 19.1.0 + TypeScript 5.8.3
- TanStack Router v1 (file-based routing)
- TanStack React Query v5 (server state)
- Zustand 5 (client state)
- Tailwind CSS 4 + shadcn/ui + Radix UI
- Axios for API calls
- React Hook Form + Zod for forms

## Architecture Principles

### 1. Multi-Tenant Architecture

- Tenant is extracted from subdomain or defaults to `test_tenant`
- API client adds `cschema` header for tenant identification
- All API requests are tenant-scoped

### 2. State Management Strategy

- **Server State**: TanStack React Query for ALL API data
- **Global Client State**: Zustand stores in `src/lib/*Store.ts`
  - `authStore`: Authentication, user, permissions, student selection
  - `academicYearStore`: Current academic year
  - `themeStore`: Dark/light theme
  - `expenseStore`: Expense module state
- **Form State**: React Hook Form with Zod validation
- **Component State**: React useState/useReducer for UI-only state

### 3. API Integration Pattern

```
Component → React Query Hook → API Helper → CAxios → Backend
           ↓
    Cache Management (auto-invalidation)
           ↓
    Toast Notifications
```

### 4. File Organization

```
src/
├── api/
│   ├── hooks/           # React Query hooks by feature
│   │   ├── staff/
│   │   ├── students/
│   │   └── fee/
│   ├── staff/           # API endpoint functions
│   ├── students/
│   └── index.ts         # CAxios client
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── common/          # Shared components
│   ├── dropdown-system/ # Advanced dropdown infrastructure
│   ├── [feature]/       # Feature-specific components
│   └── layouts/
├── lib/                 # Utilities, stores, config
├── routes/              # TanStack Router file-based routes
├── types/               # TypeScript definitions
└── main.tsx             # Entry point
```

## Critical Coding Guidelines

### 1. API & Data Fetching

#### Always Use React Query Hooks

```typescript
// ✅ CORRECT - Use React Query hook
const { data, isLoading } = useStaffAttendance(date);

// ❌ WRONG - Don't call API directly in components
const data = await CAxios.get("/staff/attendance");
```

#### Hook Structure Pattern

```typescript
// src/api/hooks/staff/attendance.ts
export const useStaffAttendance = (date: string) => {
  return useQuery({
    queryKey: staffKeys.attendanceByDate(date),
    queryFn: () => staffApi.getStaffAttendanceByDate(date),
    enabled: !!date,
  });
};

export const useCreateStaffAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRequest) => staffApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });
      toast.success("Created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create");
    },
  });
};
```

#### Query Key Namespacing

```typescript
// src/hooks/staff/useStaff.ts
export const staffKeys = {
  all: ["staff"] as const,
  attendance: () => [...staffKeys.all, "attendance"] as const,
  attendanceList: () => [...staffKeys.attendance(), "list"] as const,
  attendanceDetail: (id: number) => [...staffKeys.attendance(), id] as const,
  attendanceByDate: (date: string) =>
    [...staffKeys.attendance(), "date", date] as const,
};
```

#### Dual API Paths Warning

Some features have BOTH legacy and new API paths:

- **Staff Attendance**: `/staff/attendance` (new) vs `/masters/staff/attendance` (legacy)
- Check existing code before adding new endpoints
- Prefer new paths when adding features

### 2. Authentication & Permissions

#### Check Permissions

```typescript
// In components
import { useAuthStore } from '@/lib/authStore';

const hasEditPermission = useAuthStore(s => s.hasPermission('students', 'update'));

// With PermissionGuard component
<PermissionGuard resource="students" action="create">
  <Button>Add Student</Button>
</PermissionGuard>
```

#### Student Context for Parents

Parents can switch between their children's student contexts:

```typescript
const selectedStudent = useAuthStore((s) => s.selectedStudent);
const availableStudents = useAuthStore((s) => s.availableStudents);

// API automatically adds these headers:
// X-Student-ID, X-Academic-Year-ID, X-Class-ID
```

#### Never Store Sensitive Data

- Tokens are managed by `authStore` with persistence
- Don't create duplicate auth state
- Don't store passwords or raw credentials

### 3. Routing with TanStack Router

#### File-Based Routes

```
routes/
├── __root.tsx           # Root layout
├── _auth.tsx            # Auth layout (login, etc.)
├── _app.tsx             # App layout (requires auth)
├── _app/
│   ├── dashboard.tsx
│   ├── students/
│   │   ├── admission.tsx
│   │   └── attendance.tsx
│   └── fee/
│       └── transactions.tsx
```

#### Route File Pattern

```typescript
// src/routes/_app/students/admission.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/students/admission')({
  component: AdmissionPage,
  beforeLoad: ({ context }) => {
    // Check permissions here if needed
  },
});

function AdmissionPage() {
  return <div>...</div>;
}
```

#### Navigation

```typescript
import { useNavigate } from "@tanstack/react-router";

const navigate = useNavigate();
navigate({ to: "/students/admission" });
```

### 4. Forms & Validation

#### React Hook Form + Zod Pattern

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  const createMutation = useCreateData();

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
      {form.formState.errors.name && <span>{form.formState.errors.name.message}</span>}
      <button type="submit" disabled={createMutation.isPending}>
        Submit
      </button>
    </form>
  );
}
```

### 5. UI Components & Styling

#### Use shadcn/ui Components

```typescript
// Import from @/components/ui
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
```

#### Loading States Standard

```typescript
// ✅ CORRECT - Use Loader2 from lucide-react
import { Loader2 } from 'lucide-react';

{isLoading ? (
  <div className="flex justify-center items-center py-8">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2">Loading data...</span>
  </div>
) : (
  <div>{/* Content */}</div>
)}
```

#### Active/Inactive Badge Pattern

```typescript
import { Badge } from '@/components/ui/badge';

// In table columns
render: (value: boolean) => (
  <Badge variant={value ? "default" : "secondary"}>
    {value ? 'Active' : 'Inactive'}
  </Badge>
)
```

#### Icon Standards (from UI_CONSISTENCY_IMPROVEMENT_PLAN.md)

```typescript
import { Edit, Trash2, Eye, Plus } from 'lucide-react';

// ✅ Use Edit (NOT Edit2)
<Button variant="ghost" size="sm">
  <Edit className="h-4 w-4" />
</Button>

// ✅ Use Trash2 for delete
<Button variant="ghost" size="sm">
  <Trash2 className="h-4 w-4" />
</Button>
```

#### Tailwind Utility Classes

```typescript
// Use Tailwind for all styling
<div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card">
  <span className="text-sm font-medium">Label</span>
</div>
```

### 6. Dropdown System

The project has a sophisticated dropdown infrastructure in `src/components/dropdown-system/`:

```typescript
// Use pre-built dropdowns
import { ClassesDropdown } from '@/components/dropdown-system/components/ClassesDropdown';
import { SubjectsDropdown } from '@/components/dropdown-system/components/SubjectsDropdown';

<ClassesDropdown
  value={selectedClass}
  onChange={setSelectedClass}
  placeholder="Select Class"
/>
```

Available dropdowns:

- `AcademicYearsDropdown`
- `ClassesDropdown`
- `SectionsByClassDropdown`
- `SubjectsDropdown`
- `StudentsDropdown`
- `TransportRoutesDropdown`
- `VehiclesDropdown`
- `FeeTypesDropdown`
- `FeeTermsDropdown`

### 7. Error Handling

#### API Error Handling

```typescript
// In API helpers (src/api/staff/attendance.ts)
const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.detail || error.message;
    throw new Error(message);
  }
  throw error;
};

export const getStaffAttendance = async (id: number) => {
  try {
    const response = await CAxios.get(`/staff/attendance/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
```

#### Component Error Handling

```typescript
// Let React Query handle errors
const { data, error, isError } = useStaffAttendance(id);

if (isError) {
  return <div className="text-red-500">Error: {error.message}</div>;
}
```

### 8. TypeScript Guidelines

#### Define Types Properly

```typescript
// src/types/staff.ts
export interface StaffAttendance {
  id: number;
  staff_id: number;
  date: string;
  status: "present" | "absent" | "late";
  remarks?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffAttendanceCreateRequest {
  staff_id: number;
  date: string;
  status: "present" | "absent" | "late";
  remarks?: string;
}
```

#### Use Type Inference

```typescript
// ✅ Let TypeScript infer when obvious
const [count, setCount] = useState(0);

// ✅ Provide types when needed
const [data, setData] = useState<StaffAttendance[]>([]);
```

#### Avoid `any`

```typescript
// ❌ WRONG
const handleData = (data: any) => { ... };

// ✅ CORRECT
const handleData = (data: StaffAttendance) => { ... };

// ✅ If truly dynamic, use unknown and type guard
const handleData = (data: unknown) => {
  if (isStaffAttendance(data)) { ... }
};
```

## Common Patterns

### 1. MasterPage Pattern

For simple CRUD pages with inline editing:

```typescript
import { MasterPage } from '@/pages/masters/common/MasterPage';
import { Badge } from '@/components/ui/badge';

const columns = [
  { key: 'id', label: 'ID', editable: false },
  { key: 'name', label: 'Name', editable: true },
  {
    key: 'is_active',
    label: 'Active',
    editable: true,
    render: (v: boolean) => (
      <Badge variant={v ? "default" : "secondary"}>
        {v ? 'Active' : 'Inactive'}
      </Badge>
    ),
    renderEdit: (value: boolean, _row, onChange) => (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
    )
  },
];

export default function SubjectsPage() {
  return (
    <MasterPage
      title="Subjects"
      columns={columns}
      useReadHook={useSubjects}
      useCreateHook={useCreateSubject}
      useUpdateHook={useUpdateSubject}
      useDeleteHook={useDeleteSubject}
      resource="subjects"
    />
  );
}
```

### 2. Custom Table Component Pattern

For complex tables with custom logic:

```typescript
import { Loader2, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function StaffTable() {
  const { data, isLoading } = useStaff();
  const deleteMutation = useDeleteStaff();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading staff...</span>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data?.map((staff) => (
          <tr key={staff.id}>
            <td>{staff.name}</td>
            <td>
              <Badge variant={staff.is_active ? "default" : "secondary"}>
                {staff.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </td>
            <td>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(staff.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 3. Modal/Dialog Pattern

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function EditDialog({ open, onOpenChange, itemId }: Props) {
  const { data } = useItem(itemId);
  const updateMutation = useUpdateItem();

  const handleSubmit = (formData) => {
    updateMutation.mutate(
      { id: itemId, data: formData },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success('Updated successfully');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. React-Select in Dialog Pattern

When using react-select dropdowns inside Dialog components, you must handle portaling correctly to avoid pointer event blocking:

```typescript
import Select from 'react-select';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// CRITICAL: Dialog must have modal={false} when using portaled react-select menus
<Dialog open={isOpen} onOpenChange={setIsOpen} modal={false}>
  <DialogContent>
    <Select
      options={options}
      value={selectedValue}
      onChange={handleChange}
      placeholder="Select option"
      classNamePrefix="react-select"
      menuPlacement="auto"
      // Portal the menu to document.body to avoid clipping
      menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
      // CRITICAL: Add pointer events to ensure clickability
      styles={{
        menuPortal: base => ({
          ...base,
          zIndex: 9999,
          pointerEvents: 'auto'  // Essential for clickability
        }),
        menu: base => ({
          ...base,
          pointerEvents: 'auto'  // Essential for clickability
        })
      }}
      // Keyboard accessibility props
      menuShouldBlockScroll={false}
      closeMenuOnScroll={false}
      tabSelectsValue={false}
      openMenuOnFocus={true}
      blurInputOnSelect={true}
    />
  </DialogContent>
</Dialog>
```

**Key Requirements:**

1. **Dialog `modal={false}`** - Prevents overlay from blocking pointer events
2. **`menuPortalTarget={document.body}`** - Renders menu outside dialog to avoid clipping
3. **`pointerEvents: 'auto'`** - Ensures menu is clickable (both menuPortal and menu styles)
4. **`zIndex: 9999`** - Places menu above dialog overlay
5. **Keyboard accessibility props** - Ensures keyboard navigation (arrows, Enter, Escape) works properly

**Common Mistakes:**

- ❌ Forgetting `modal={false}` → dropdowns visible but unclickable
- ❌ Missing `pointerEvents: 'auto'` → dropdowns may be blocked
- ❌ Not using `menuPortalTarget` → dropdowns clipped by dialog overflow

**Reference:** See `TRANSPORT_ROUTES_DROPDOWN_FIX.md` for detailed explanation

## Important Conventions

### 1. Naming Conventions

- **Files**: PascalCase for components (`StaffTable.tsx`), camelCase for utilities (`staffHelpers.ts`)
- **Variables/Functions**: camelCase (`getUserData`, `isActive`)
- **Components**: PascalCase (`StaffTable`, `FeeForm`)
- **Types/Interfaces**: PascalCase (`StaffAttendance`, `CreateRequest`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_FILE_SIZE`)

### 2. Import Organization

```typescript
// 1. React and core libraries
import React, { useState, useEffect } from "react";

// 2. Third-party libraries
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

// 3. UI components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// 4. Icons (alphabetically)
import { Edit, Loader2, Trash2 } from "lucide-react";

// 5. API hooks
import { useStaff, useCreateStaff } from "@/api/hooks/staff";

// 6. Types
import type { Staff } from "@/types/staff";

// 7. Local components
import { StaffTable } from "./StaffTable";

// 8. Utilities
import { cn } from "@/lib/utils";
```

### 3. File Comments

Add JSDoc comments for complex functions:

```typescript
/**
 * Fetches staff attendance records for a specific date range
 * @param staffId - The ID of the staff member
 * @param params - Date range parameters (start_date, end_date)
 * @returns Promise with attendance records
 */
export const getStaffAttendanceByDateRange = async (
  staffId: number,
  params: { start_date: string; end_date: string }
) => {
  // Implementation
};
```

## Testing

Vitest is configured. Tests are colocated in `__tests__` directories:

```typescript
// src/components/dropdown-system/components/__tests__/ClassesDropdown.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ClassesDropdown } from '../ClassesDropdown';

describe('ClassesDropdown', () => {
  it('renders without crashing', () => {
    const { container } = render(<ClassesDropdown value={null} onChange={() => {}} />);
    expect(container).toBeTruthy();
  });
});
```

## Environment Setup

### .env File

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Tenant Configuration
VITE_DEFAULT_TENANT=test_tenant

# Optional: Feature Flags
VITE_ENABLE_DARK_MODE=true
```

### Running the Project

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run build:check  # Type check + build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Common Pitfalls to Avoid

### 1. ❌ Don't Call API Directly in Components

```typescript
// ❌ WRONG
const fetchData = async () => {
  const response = await CAxios.get("/staff");
  setData(response.data);
};

// ✅ CORRECT
const { data } = useStaff();
```

### 2. ❌ Don't Create Duplicate State for Server Data

```typescript
// ❌ WRONG
const [staff, setStaff] = useState([]);
const { data } = useStaff();
useEffect(() => {
  setStaff(data);
}, [data]);

// ✅ CORRECT
const { data: staff } = useStaff();
```

### 3. ❌ Don't Forget to Invalidate Queries

```typescript
// ❌ WRONG - UI won't update
const createMutation = useMutation({
  mutationFn: createStaff,
});

// ✅ CORRECT - Queries auto-refresh
const createMutation = useMutation({
  mutationFn: createStaff,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: staffKeys.all });
  },
});
```

### 4. ❌ Don't Use Edit2 Icon

```typescript
// ❌ WRONG
import { Edit2 } from 'lucide-react';
<Edit2 className="h-4 w-4" />

// ✅ CORRECT
import { Edit } from 'lucide-react';
<Edit className="h-4 w-4" />
```

### 5. ❌ Don't Skip Loading States

```typescript
// ❌ WRONG - No loading feedback
const { data } = useStaff();
return <Table data={data} />;

// ✅ CORRECT
const { data, isLoading } = useStaff();
if (isLoading) return <LoadingSpinner />;
return <Table data={data} />;
```

## When Making Changes

### Adding a New Feature

1. **Create types** in `src/types/[feature].ts`
2. **Add API functions** in `src/api/[feature].ts`
3. **Create React Query hooks** in `src/api/hooks/[feature]/*.ts`
4. **Build components** in `src/components/[feature]/`
5. **Create route** in `src/routes/_app/[feature]/`
6. **Test thoroughly** with proper permissions

### Modifying Existing Features

1. **Read existing code first** - understand patterns used
2. **Check for dual API paths** (legacy vs new)
3. **Maintain consistency** with existing conventions
4. **Update types** if data structure changes
5. **Invalidate relevant queries** in mutations
6. **Test edge cases** (loading, errors, empty states)

### Debugging Tips

1. Check **React Query DevTools** (available in dev mode)
2. Check **TanStack Router DevTools** (available in dev mode)
3. Inspect **Network tab** for API calls
4. Check **Console** for validation errors
5. Verify **authStore** state for permission issues
6. Check `src/lib/config.ts` for logger settings

## Documentation References

- **Architecture**: See `context_guide.json`
- **Staff Attendance Flow**: See `STAFF_ATTENDANCE_FLOW.md`
- **UI Standards**: See `UI_CONSISTENCY_IMPROVEMENT_PLAN.md`
- **TanStack Router**: https://tanstack.com/router
- **TanStack Query**: https://tanstack.com/query
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com

## Quick Command Reference

```bash
# Development
npm run dev

# Type checking
npm run build:check

# Linting
npm run lint

# Production build
npm run build

# Preview build
npm run preview

# Add shadcn component
npx shadcn@latest add [component-name]
```

## Final Notes

- **Consistency is key**: Follow existing patterns in the codebase
- **Security matters**: Always check permissions, never expose sensitive data
- **User experience**: Show loading states, handle errors gracefully, provide feedback
- **Performance**: Use React Query caching, avoid unnecessary re-renders
- **Maintainability**: Write clean, documented, testable code

When in doubt, check existing implementations in the codebase for reference patterns.
