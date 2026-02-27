# Module Context – Core/Shared

Version: 1.1
Generated On: 2025-12-26
Last Updated: 2026-02-27
Source: Codebase Analysis + Governance Docs
Confidence Level: High

---

## Responsibility

The Core module provides shared infrastructure:

1. **API Client**: Axios instance with interceptors (CAxios)
2. **Configuration**: Application configuration management
3. **Theme System**: Dark/light mode support
4. **UI Components**: Shared shadcn/ui component library
5. **Dropdown System**: Advanced dropdown infrastructure
6. **Layouts**: Application layout components
7. **Utilities**: Shared helper functions
8. **Type Definitions**: Common TypeScript types

---

## Key Components

### API Client

| File | Purpose |
|------|---------|
| `src/api/index.ts` | CAxios — Axios instance with interceptors |

### Configuration

| File | Purpose |
|------|---------|
| `src/lib/config.ts` | Application configuration |
| `.env.example` | Environment variable template |

### Theme

| File | Purpose |
|------|---------|
| `src/lib/themeStore.ts` | Theme state management |

### Layouts

| File | Purpose |
|------|---------|
| `src/routes/__root.tsx` | Root layout |
| `src/routes/_app.tsx` | Authenticated app layout |
| `src/routes/_auth.tsx` | Authentication layout |
| `src/components/layouts/MainLayout.tsx` | Main layout component |
| `src/components/ui/navbar.tsx` | Navigation bar |
| `src/components/ui/sidebar.tsx` | Sidebar navigation |

### UI Components (shadcn/ui)

| File | Purpose |
|------|---------|
| `src/components/ui/alert.tsx` | Alert component |
| `src/components/ui/badge.tsx` | Badge component |
| `src/components/ui/button.tsx` | Button component |
| `src/components/ui/card.tsx` | Card component |
| `src/components/ui/dialog.tsx` | Dialog/Modal |
| `src/components/ui/form.tsx` | Form components |
| `src/components/ui/input.tsx` | Input component |
| `src/components/ui/select.tsx` | Select component |
| `src/components/ui/table.tsx` | Table component |
| `src/components/ui/popover.tsx` | Popover component |

### Dropdown System

| Directory | Purpose |
|-----------|---------|
| `src/components/dropdown-system/` | Advanced dropdown infrastructure |
| `src/components/dropdown-system/components/` | Dropdown components |
| `src/components/dropdown-system/config/` | Configuration |
| `src/components/dropdown-system/services/` | API services |
| `src/components/dropdown-system/utils/` | Utilities |
| `src/components/dropdown-system/__tests__/` | Tests |

### Common Components

| File | Purpose |
|------|---------|
| `src/components/common/table.tsx` | Common table component |
| `src/components/PermissionGuard.tsx` | Permission guard |
| `src/pages/masters/common/MasterPage.tsx` | Generic CRUD page |

### Utilities

| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | Utility functions (cn, etc.) |
| `src/lib/menuUtils.ts` | Menu utilities |

### Constants

| Directory | Purpose |
|-----------|---------|
| `src/constants/permissions.ts` | Permission constants |
| `src/constants/dropdown/` | Dropdown constants |
| `src/constants/api/` | API constants |

---

## API Client (CAxios)

### Configuration

```typescript
const CAxios = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: { 'Content-Type': 'application/json' },
});
```

### Request Interceptor — Auto-added Headers

| Header | Value | Condition |
|--------|-------|-----------|
| `Authorization` | `Bearer {accessToken}` | If token exists |
| `cschema` | Tenant identifier | Always (from hostname or default) |
| `X-Student-ID` | Selected student ID | If selectedStudent exists |
| `X-Academic-Year-ID` | Academic year ID | If selectedStudent exists |
| `X-Class-ID` | Class ID | If selectedStudent exists |

### Response Interceptor

- **401 Handling**: Attempts token refresh
- **Refresh Success**: Retries original request
- **Refresh Failure**: Logout and redirect to `/login`

**Source**: `src/api/index.ts`

---

## Configuration System

```typescript
interface AppConfig {
  api: {
    baseURL: string;        // VITE_API_BASE_URL
    timeout: number;        // VITE_API_TIMEOUT (30000ms)
  };
  auth: {
    jwtRefreshThreshold: number;  // VITE_JWT_REFRESH_THRESHOLD (5min)
    sessionTimeout: number;       // VITE_SESSION_TIMEOUT (1hr)
  };
  tenant: {
    defaultTenant: string;   // VITE_DEFAULT_TENANT
    headerName: string;      // VITE_TENANT_HEADER (cschema)
  };
  dev: {
    mode: boolean;           // VITE_DEV_MODE
    logLevel: string;        // VITE_LOG_LEVEL
  };
}
```

**Source**: `src/lib/config.ts`

---

## Multi-Tenant Architecture

- Tenant extracted from subdomain: `school1.domain.com` → `school1`
- Default tenant: `VITE_DEFAULT_TENANT` (e.g., `test_tenant`)
- `cschema` header sent on every API request via CAxios interceptor
- Verified working: Multi-tenant isolation confirmed via API testing

---

## Theme System

```typescript
type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}
```

- CSS class `dark` toggled on `documentElement`
- Persisted to localStorage as `theme-storage`
- Applied on app initialization in `main.tsx`

---

## Dropdown System

### Available Dropdowns

```typescript
AcademicYearsDropdown
ClassesDropdown
SectionsByClassDropdown
SubjectCategoriesDropdown
SubjectsDropdown
SubjectsByCategoryDropdown
TransportRoutesDropdown
HolidaysDropdown
```

### Features

- Infinite scroll support
- Search/filter capability
- Cascading dropdowns
- Error recovery
- Caching

**Source**: `src/components/dropdown-system/index.ts`

---

## MasterPage Component

Generic CRUD page for simple master data management (`src/pages/masters/common/MasterPage.tsx`):

**Features**: Table display, inline editing, add dialog, column visibility toggle, export (CSV/Excel/JSON), permission-based rendering.

---

## React Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});
```

**Source**: `src/main.tsx:28-38`

---

## Custom Select Component Gotcha

**`src/components/ui/select.tsx`** uses `if (itemProps.value && ...)` to build options. This means `value=""` (empty string = falsy) is **silently skipped**.

**Fix**: Use a non-empty sentinel value for "clear selection" options:

```typescript
// ❌ Wrong — value="" is skipped
<SelectItem value="">— None —</SelectItem>

// ✅ Correct
<SelectItem value="__none__">— None —</SelectItem>
value={form.watch('field_id') ?? '__none__'}
onValueChange={(v) => form.setValue('field_id', v === '__none__' ? null : v)}
```

---

## Performance Issues Identified

Seven issues were identified in a performance audit (`docs/PERFORMANCE_ANALYSIS.md`):

1. **Page blocking on menu load** — menu transformation blocks render
2. **Duplicate academic year fetches** — store + query both fetch
3. **Sync IIFE in stores** — synchronous initialization in Zustand stores
4. **Validation duplication** — Zod schemas recreated on every render
5. **Missing `staleTime`** — some queries have no staleTime (overrides global default)
6. **Console logs** — logging in several modules impacts performance
7. **Menu transformation** — expensive recalculation on each render

See `docs/PERFORMANCE_ANALYSIS.md` for priority matrix and quick wins.

---

## Common Debugging Guide

### 403 Forbidden After Permission Change

JWT tokens cache permissions. After backend adds new permissions:
1. User must **logout** from the app
2. **Login again** to refresh the JWT with new permissions
3. Old sessions continue getting 403 until re-login

### 401 Unauthorized

Token expired. CAxios automatically retries with refresh token. If refresh also fails, user is logged out.

### 422 Validation Error

Usually a field name mismatch between frontend payload and backend schema. Check `console.error` for the FastAPI validation detail array — it lists the exact field path and error message.

### Stale Data Not Refreshing

Check query key structure — if the key used for invalidation doesn't exactly match the key used for the query, the cache won't clear.

---

## Dependencies

### External Dependencies

- **axios**: HTTP client
- **zustand**: State management (with persist middleware for auth, academicYear, theme)
- **@tanstack/react-query**: Server state
- **@tanstack/react-router**: File-based routing
- **@radix-ui/***: UI primitives
- **tailwindcss**: Styling
- **lucide-react**: Icons (use `Edit` not `Edit2`, `Trash2` for delete)
- **sonner**: Toast notifications
- **xlsx**: Excel export

---

## Test Coverage

Dropdown system has tests:
- `src/components/dropdown-system/__tests__/`
- `src/components/dropdown-system/components/__tests__/`

Other core components: no dedicated tests found.
