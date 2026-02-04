# Module Context – Core/Shared

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

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

[EVIDENCE-BASED]

### API Client

| File | Purpose |
|------|---------|
| `src/api/index.ts` | CAxios - Axios instance with interceptors |

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
| `src/components/ui/alert-dialog.tsx` | Alert dialog |
| `src/components/ui/badge.tsx` | Badge component |
| `src/components/ui/button.tsx` | Button component |
| `src/components/ui/card.tsx` | Card component |
| `src/components/ui/checkbox.tsx` | Checkbox component |
| `src/components/ui/command.tsx` | Command menu |
| `src/components/ui/dialog.tsx` | Dialog/Modal |
| `src/components/ui/dropdown-menu.tsx` | Dropdown menu |
| `src/components/ui/form.tsx` | Form components |
| `src/components/ui/input.tsx` | Input component |
| `src/components/ui/label.tsx` | Label component |
| `src/components/ui/popover.tsx` | Popover component |
| `src/components/ui/select.tsx` | Select component |
| `src/components/ui/separator.tsx` | Separator |
| `src/components/ui/switch.tsx` | Switch/Toggle |
| `src/components/ui/tabs.tsx` | Tabs component |
| `src/components/ui/table.tsx` | Table component |
| `src/components/ui/textarea.tsx` | Textarea |

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

### Providers

| File | Purpose |
|------|---------|
| `src/components/providers/AuthProvider.tsx` | Auth context provider |

### Utilities

| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | Utility functions |
| `src/lib/menuUtils.ts` | Menu utilities |

### Constants

| Directory | Purpose |
|-----------|---------|
| `src/constants/` | Application constants |
| `src/constants/permissions.ts` | Permission constants |
| `src/constants/dropdown/` | Dropdown constants |
| `src/constants/api/` | API constants |

---

## API Client (CAxios)

[EVIDENCE-BASED]

### Configuration

```typescript
const CAxios = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Request Interceptor

Adds the following headers automatically:

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

[EVIDENCE-BASED]

### Configuration Interface

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
  files: {
    maxSize: number;         // VITE_MAX_FILE_SIZE (5MB)
    supportedTypes: string[];// VITE_SUPPORTED_FILE_TYPES
  };
  cache: {
    ttl: number;             // VITE_CACHE_TTL (5min)
    maxSize: number;         // VITE_CACHE_MAX_SIZE (50)
  };
  rateLimit: {
    requests: number;        // VITE_API_RATE_LIMIT (100)
    window: number;          // VITE_API_RATE_WINDOW (1min)
  };
  dev: {
    mode: boolean;           // VITE_DEV_MODE
    logLevel: string;        // VITE_LOG_LEVEL
  };
}
```

### Utility Functions

```typescript
isDevelopment(): boolean
isProduction(): boolean
getApiUrl(endpoint: string): string
getTenantFromHostname(hostname: string): string
validateFileType(file: File): boolean
validateFileSize(file: File): boolean
logger.debug(message, ...args)
logger.info(message, ...args)
logger.warn(message, ...args)
logger.error(message, ...args)
```

**Source**: `src/lib/config.ts`

---

## Theme System

[EVIDENCE-BASED]

### Store

```typescript
type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}
```

### Implementation

- CSS class `dark` toggled on `documentElement`
- Persisted to localStorage as `theme-storage`
- Applied on app initialization in `main.tsx`

**Source**: `src/lib/themeStore.ts`, `src/main.tsx:13-17`

---

## Dropdown System

[EVIDENCE-BASED]

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

### Configuration

```typescript
DROPDOWN_ENDPOINTS      // API endpoint mappings
DEFAULT_DROPDOWN_CONFIG // Default configuration
ERROR_RECOVERY_CONFIG   // Error handling config
DROPDOWN_CACHE_CONFIG   // Cache configuration
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

[EVIDENCE-BASED]

Generic CRUD page component for simple master data management:

### Features

- Table display with configurable columns
- Inline editing support
- Add dialog with form fields
- Column visibility toggle
- Export (CSV, Excel, JSON)
- Permission-based rendering

### Props

```typescript
interface MasterPageConfig<T, TInput> {
  title: string;
  addButtonLabel?: string;
  columns: TableColumn<T>[];
  defaultValues: TInput;
  formFields: FormField[];
  isLoading: boolean;
  data: T[];
  onCreate: (data: TInput) => void;
  onUpdate: (id: string | number, data: any) => void;
  onDelete: (id: string | number) => void;
  isCreatePending: boolean;
  resetForm: () => void;
  isEditing?: boolean;
  addModal?: React.ReactNode;
  showColumnSelector?: boolean;
  pagination?: PaginationConfig;
  renderCustomField?: (field, value, onChange) => ReactNode;
  permissions?: PermissionConfig;
}
```

**Source**: `src/pages/masters/common/MasterPage.tsx`

---

## React Query Configuration

[EVIDENCE-BASED]

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

## Dependencies

[EVIDENCE-BASED]

### Internal

- Used by all other modules

### External

- **axios**: HTTP client
- **zustand**: State management
- **@tanstack/react-query**: Server state
- **@tanstack/react-router**: Routing
- **@radix-ui/***: UI primitives
- **tailwindcss**: Styling
- **lucide-react**: Icons
- **sonner**: Toast notifications
- **xlsx**: Excel export

---

## Known Risks

[INFERENCE]

### API Client

1. **Single Instance**: All requests go through same instance
2. **Token Refresh Race**: Multiple simultaneous 401s

### Configuration

1. **Env Exposure**: All `VITE_` variables exposed to client
2. **Default Values**: Hardcoded defaults if env vars missing

### UI Components

1. **Bundle Size**: Full shadcn/ui component set included
2. **Styling Conflicts**: Tailwind + Ant Design coexistence

---

## Test Coverage

[EVIDENCE-BASED]

Dropdown system has tests:
- `src/components/dropdown-system/__tests__/`
- `src/components/dropdown-system/components/__tests__/`

Other core components: [UNCERTAIN]

---

## Uncertainties

[UNCERTAIN]

1. **Error Boundary**: Global error boundary implementation unclear
2. **Loading States**: Global loading indicator unclear
3. **Offline Handling**: No offline support detected
4. **Analytics**: No analytics integration detected
5. **Logging Service**: Client-side logging service unclear
6. **Feature Flags**: No feature flag system detected
7. **A/B Testing**: No A/B testing infrastructure
8. **Performance Monitoring**: No performance monitoring detected
