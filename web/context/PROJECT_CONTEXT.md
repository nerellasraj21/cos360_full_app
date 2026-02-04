# Project Context

Version: 1.4
Generated On: 2025-12-26
Last Updated: 2025-12-28
Source: Codebase Analysis
Confidence Level: High

---

## Project Purpose

[EVIDENCE-BASED]

COS360 Frontend is a multi-tenant school management system frontend application. Based on the codebase analysis:

- **Primary Function**: Provides a web-based user interface for managing school operations across multiple tenants (schools/organizations)
- **Target Users**: Students, Parents, Staff, Administrators, and Super Administrators
- **Business Domain**: Educational institution management covering students, staff, fees, expenses, transport, and academic operations
- **Multi-Tenancy**: Tenant identification via subdomain extraction (e.g., `school1.domain.com` → `school1`) or configurable default tenant

**Evidence**:

- `src/lib/config.ts:98-102` - Tenant extraction from hostname
- `src/api/index.ts:23-27` - Tenant header (`cschema`) added to all API requests
- `src/types/auth.ts` - Defines multiple user roles (Student, Parent, Staff, Admin)

---

## Architecture Summary

[EVIDENCE-BASED]

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React SPA (Browser)                       │
├─────────────────────────────────────────────────────────────────┤
│  TanStack Router (File-based Routing)                           │
│  ├── _auth Layout (Login, Password Reset)                       │
│  └── _app Layout (Authenticated Application)                    │
├─────────────────────────────────────────────────────────────────┤
│  State Management Layer                                          │
│  ├── Zustand Stores (Client State)                              │
│  │   ├── authStore (Auth, User, Permissions)                    │
│  │   ├── academicYearStore (Academic Year Selection)            │
│  │   ├── themeStore (Dark/Light Theme)                          │
│  │   └── expenseStore (Expense Module State)                    │
│  └── TanStack React Query (Server State)                        │
├─────────────────────────────────────────────────────────────────┤
│  API Layer                                                       │
│  ├── React Query Hooks (src/api/hooks/*)                        │
│  ├── API Endpoint Functions (src/api/*)                         │
│  └── CAxios Client (Axios with interceptors)                    │
├─────────────────────────────────────────────────────────────────┤
│  Backend API (External)                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Architectural Pattern

**Feature-Based Organization** with clear separation of concerns:

1. **Routes** (`src/routes/`): TanStack Router file-based routing
2. **Pages** (`src/pages/`): Page-level components and business logic
3. **Components** (`src/components/`): Reusable UI components
4. **API Layer** (`src/api/`): API client, hooks, and endpoint functions
5. **State** (`src/lib/*Store.ts`): Zustand stores for client state
6. **Types** (`src/types/`): TypeScript type definitions

**Evidence**: Directory structure analysis, `src/main.tsx:1-67`

---

## Technology Stack

[EVIDENCE-BASED]

| Category           | Technology           | Version        | Evidence                            |
| ------------------ | -------------------- | -------------- | ----------------------------------- |
| **Core Framework** | React                | 19.1.0         | `package.json:38`                   |
| **Language**       | TypeScript           | 5.8.3          | `package.json:68`                   |
| **Build Tool**     | Vite                 | 6.3.5          | `package.json:71`                   |
| **Routing**        | TanStack Router      | 1.121.24       | `package.json:26-27`                |
| **Server State**   | TanStack React Query | 5.85.5         | `package.json:25`                   |
| **Client State**   | Zustand              | 5.0.5          | `package.json:51`                   |
| **HTTP Client**    | Axios                | 1.10.0         | `package.json:31`                   |
| **Styling**        | Tailwind CSS         | 4.1.10         | `package.json:48`                   |
| **UI Primitives**  | Radix UI             | Various        | `package.json:15-24`                |
| **UI Components**  | shadcn/ui            | Latest         | `package.json:45`, `components/ui/` |
| **Complex UI**     | Ant Design           | 5.26.2         | `package.json:30`                   |
| **Forms**          | React Hook Form      | 7.62.0         | `package.json:42`                   |
| **Validation**     | Zod                  | 3.25.76        | `package.json:50`                   |
| **Icons**          | Lucide React         | 0.518.0        | `package.json:37`                   |
| **Date Handling**  | date-fns, dayjs      | 4.1.0, 1.11.13 | `package.json:34-35`                |
| **Notifications**  | Sonner               | 2.0.5          | `package.json:46`                   |
| **Testing**        | Vitest               | 3.2.4          | `package.json:71`                   |
| **Excel Export**   | xlsx                 | 0.18.5         | `package.json:49`                   |

---

## Cross-Cutting Concerns

[EVIDENCE-BASED]

### 1. Authentication & Authorization

- **JWT-based authentication** with access + refresh tokens
- **Token refresh**: Automatic 401 handling with token refresh attempt
- **Persistent sessions**: Tokens stored via Zustand persist middleware (localStorage)
- **Role-Based Access Control (RBAC)**: Permission map (resource → actions[])
- **Permission checking**: `hasPermission(resource, action)` method in authStore

**Evidence**: `src/lib/authStore.ts:120-130`, `src/api/index.ts:44-82`

### 2. Multi-Tenancy

- **Tenant extraction**: From subdomain or default (`test_tenant`)
- **Request header**: `cschema` header added to all API requests
- **Configuration**: `VITE_DEFAULT_TENANT`, `VITE_TENANT_HEADER` env vars

**Evidence**: `src/lib/config.ts:98-103`, `src/api/index.ts:23-27`

### 3. Student Context (Parent Users)

- **Context switching**: Parents can switch between their children's student views
- **API headers**: `X-Student-ID`, `X-Academic-Year-ID`, `X-Class-ID`
- **State management**: `selectedStudent`, `availableStudents` in authStore

**Evidence**: `src/api/index.ts:29-39`, `src/lib/authStore.ts:87-99`

### 4. Theme System

- **Dark/Light mode**: CSS class-based (`dark` class on `documentElement`)
- **Persistence**: localStorage via Zustand persist
- **CSS Variables**: Tailwind CSS variables for theming

**Evidence**: `src/lib/themeStore.ts:1-31`, `src/main.tsx:13-17`

### 5. Error Handling

- **API errors**: Axios interceptors for 401 handling
- **Toast notifications**: Sonner for user feedback
- **Query errors**: React Query error states in components

**Evidence**: `src/api/index.ts:44-82`, `src/api/hooks/students/admissions.ts:96-98`

### 6. Caching Strategy

- **Server state caching**: React Query with 5-minute stale time
- **Cache invalidation**: Automatic via query key invalidation on mutations
- **Configuration**: `gcTime: 10min`, `refetchOnWindowFocus: false`

**Evidence**: `src/main.tsx:28-38`

---

## Global Constraints

[EVIDENCE-BASED]

### Technical Constraints

1. **API Dependency**: All data comes from backend API at `VITE_API_BASE_URL`
2. **Browser-Only**: SPA architecture, no server-side rendering
3. **Authentication Required**: Most routes require authentication (via `_app` layout guard)
4. **File Size Limits**: 5MB max file upload (`VITE_MAX_FILE_SIZE`)
5. **Supported File Types**: PDF, JPG, JPEG, PNG (`VITE_SUPPORTED_FILE_TYPES`)

### Coding Conventions

1. **React Query for API data**: All API data must use React Query hooks
2. **Zustand for client state**: Global client state in `src/lib/*Store.ts`
3. **File-based routing**: Routes auto-generated by TanStack Router
4. **shadcn/ui components**: Primary UI component library
5. **Tailwind for styling**: Utility-first CSS approach

[INFERENCE]

### Performance Constraints

- Rate limiting configured: 100 requests per minute window
- API timeout: 30 seconds default
- Cache TTL: 5 minutes

**Evidence**: `.env.example:21-25`

---

## Known Non-Goals

[INFERENCE - Based on absence in codebase]

1. **Server-Side Rendering (SSR)**: Pure client-side SPA architecture
2. **Offline Support**: No service worker or offline caching detected
3. **Real-Time Updates**: No WebSocket or SSE implementation found
4. **Internationalization (i18n)**: No translation files or i18n library detected
5. **Native Mobile Apps**: Web-only application
6. **GraphQL**: REST API only (Axios/HTTP)
7. **Micro-Frontend Architecture**: Monolithic SPA

---

## Identified Modules

Based on directory structure and domain analysis, the following modules have been identified:

| Module             | Location                                              | Responsibility                                         |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------ |
| **Authentication** | `src/lib/authStore.ts`, `src/routes/_auth/`           | User authentication, sessions, permissions             |
| **Students**       | `src/routes/_app/students/`, `src/api/students/`      | Student admission, attendance, documents, certificates |
| **Staff**          | `src/routes/_app/staff/`, `src/api/staff/`            | Staff management, attendance, enrollment               |
| **Fee**            | `src/routes/_app/fee/`, `src/hooks/fee/`              | Fee categories, types, terms, transactions             |
| **Expense**        | `src/routes/_app/expense/`, `src/lib/expenseStore.ts` | Expense tracking, approvals, reports                   |
| **Transport**      | `src/routes/_app/transport/`, `src/api/transport/`    | Vehicles, routes, trips, student assignments           |
| **Masters**        | `src/routes/_app/masters/`, `src/api/masters/`        | Academic years, classes, subjects, holidays            |
| **Core/Shared**    | `src/components/ui/`, `src/api/index.ts`              | UI components, API client, utilities                   |

---

## Key Files Reference

| File                                      | Purpose                         |
| ----------------------------------------- | ------------------------------- |
| `src/main.tsx`                            | Application entry point         |
| `src/api/index.ts`                        | CAxios client with interceptors |
| `src/lib/authStore.ts`                    | Authentication state management |
| `src/lib/config.ts`                       | Application configuration       |
| `src/routes/__root.tsx`                   | Root route layout               |
| `src/routes/_app.tsx`                     | Authenticated app layout        |
| `src/routes/_auth.tsx`                    | Authentication layout           |
| `src/routeTree.gen.ts`                    | Auto-generated route tree       |
| `src/pages/masters/common/MasterPage.tsx` | Generic CRUD page component     |

---

## Uncertainties

[UNCERTAIN]

1. **Backend API Documentation**: No OpenAPI/Swagger specs found in frontend codebase
2. **Deployment Configuration**: No CI/CD or deployment configs analyzed
3. **Legacy API Paths**: Some features have dual API paths (`/masters/*` vs feature-specific) - unclear migration status
4. **Test Coverage**: Limited test files found (primarily in dropdown-system)
5. **Feature Flags**: Rate limiting and cache configs exist but unclear if actively enforced
6. **Super Admin Features**: `src/pages/superadmin/` and `src/components/superorg/` exist but detailed functionality unclear

---

## Data Flow Pattern

[EVIDENCE-BASED]

```
User Action
    ↓
Component (useState for UI state)
    ↓
React Query Hook (useXxx)
    ↓
API Helper Function (src/api/*)
    ↓
CAxios Client
    ├── Adds Auth Token
    ├── Adds Tenant Header
    └── Adds Student Context Headers
    ↓
Backend API
    ↓
Response
    ↓
React Query Cache
    ↓
Component Re-render
    ↓
Toast Notification (on mutation success/error)
```

**Evidence**: `STAFF_ATTENDANCE_FLOW.md`, API hooks analysis

---

## Changelog

### Version 1.4 (2025-12-28)

**Subject Category Inline Creation (Quick Add Category)**

Implemented inline category creation for the Subject page, allowing users to create new subject categories directly from the Subject form without navigating to a separate page.

| Change | Description |
|--------|-------------|
| New Component | `CreateCategoryPopover` - Popover for inline category creation |
| Subject Page | Added "+" button next to category dropdown |
| Permission-Based | Only visible if user has `subject_categories.create` permission |
| Auto-Selection | Newly created category is auto-selected in dropdown |
| Query Invalidation | Fixed to invalidate all category query types |

**Files Created:**
- `src/components/dropdown/CreateCategoryPopover.tsx`

**Files Modified:**
- `src/components/dropdown/index.ts` - Added export
- `src/pages/masters/subject.tsx` - Integrated inline creation
- `src/api/hooks/masters/subjectCategories.ts` - Fixed query invalidation

**Handover Documents:**
- `AI_GOVERNANCE/handovers/subject_category_inline_creation_frontend_impl.md`
- `AI_GOVERNANCE/handovers/subject_category_inline_creation_backend_handover.md`
- `AI_GOVERNANCE/handovers/subject_category_inline_creation_validation_report.md`

---

### Version 1.3 (2025-12-28)

**Backend Alignment: Class-Subject Mapping Section Support**

Aligned frontend implementation with backend API handover document (`AI_GOVERNANCE/handovers/FRONTEND_HANDOVER_CLASS_SUBJECT_MAPPING.md`).

| Change | Description |
|--------|-------------|
| "All Sections" Option | Added to section dropdown - sends `undefined` to apply to all sections |
| Warning Message | Shows alert when "All Sections" selected with section count |
| Type Updates | `ClassSubjectMapping` now includes `section_id` and `section_name` |
| Response Type | `ClassSubjectMappingBulkResponse` includes `updated_count`, `deactivated_count`, `sections_processed` |
| Table Column | Added "Section" column displaying section name or "All" |
| .gitignore | Added `*.tsbuildinfo` pattern |

**Files Modified:**
- `src/components/masters/classsubjectmappings/AddBulkClassSubjectMappingsModal.tsx`
- `src/types/masters/subject.ts`
- `src/pages/masters/classsubjectmappings.tsx`
- `.gitignore`

**Backend Handover:** `AI_GOVERNANCE/handovers/FRONTEND_HANDOVER_CLASS_SUBJECT_MAPPING.md`

---

### Version 1.2 (2025-12-28)

**Validation Completed: Class-Subject Mapping Multi-Select Enhancement**

| Validation Item | Status |
|-----------------|--------|
| Feature Plan Fidelity | ✅ Matches approved plan |
| Scope Verification | ✅ No scope creep |
| Code Quality | ✅ Follows project standards |
| Regression Risk | Low |
| Governance Compliance | ✅ SOP followed |
| Final Decision | **ACCEPTED** |

**Validation Report:** Performed by Validation Agent per `agents/validation.md`

---

### Version 1.1 (2025-12-27)

**Masters Module - Class-Subject Mappings Enhancement**

Implemented multi-select subject functionality for the Class-Subject Mappings page:

| Change | Description |
|--------|-------------|
| New Component | `AddBulkClassSubjectMappingsModal` - Bulk creation modal with multi-select |
| Type Update | `ClassSubjectMappingBulkCreate.section_id` - Optional section support |
| UX Improvement | Multi-select subjects with per-subject settings (order, exclude_marks, is_active) |
| Cascading UI | Section dropdown appears after class selection |

**Files Changed:**
- `src/components/masters/classsubjectmappings/AddBulkClassSubjectMappingsModal.tsx` (new)
- `src/components/masters/classsubjectmappings/index.ts` (new)
- `src/pages/masters/classsubjectmappings.tsx` (modified)
- `src/types/masters/subject.ts` (modified)

**Module Context Updated:** `context/modules/masters.md`

**Handover Document:** `AI_GOVERNANCE/handovers/class_subject_mapping_multiselect_implementation.md`
