# Module Context – Authentication

Version: 1.1
Generated On: 2025-12-26
Last Updated: 2026-03-04
Source: Codebase Analysis + Mar 2026 Backend Handover
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Authentication module handles:

1. **User Authentication**: Login/logout flows with JWT tokens
2. **Session Management**: Token storage, refresh, and expiration
3. **Authorization**: Role-based access control (RBAC) with permission checking
4. **Student Context**: Parent users can switch between their children's student views
5. **Menu Management**: Dynamic menu items based on user permissions

---

## Key Components

[EVIDENCE-BASED]

### State Management

| File | Purpose |
|------|---------|
| `src/lib/authStore.ts` | Zustand store for authentication state |

**Key State Properties**:
```typescript
interface AuthState {
  user: User | null;
  role: Role | null;
  selectedStudent: Student | null;
  availableStudents: Student[];
  studentId: string | null;
  entityId: string | null;     // student UUID (Student role) or parent UUID (Parent role)
  permissions: Permission[];
  permissionsMap: PermissionMap;
  menuItems: MenuItem[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}
```

### Routes

| File | Purpose |
| --- | --- |
| `src/routes/_auth.tsx` | Authentication layout (unauthenticated users) |
| `src/routes/_auth/login.tsx` | Login page |
| `src/routes/_auth/forgot-password.tsx` | Password recovery |
| `src/routes/_auth/set-password.tsx` | First-login set-password page |

### Components

| File | Purpose |
|------|---------|
| `src/components/providers/AuthProvider.tsx` | Authentication context provider |
| `src/components/PermissionGuard.tsx` | Permission-based rendering guard |
| `src/components/ui/forgot-password-form.tsx` | Password reset form |

### API Integration

| File | Purpose |
|------|---------|
| `src/api/index.ts` | CAxios client with auth interceptors |

---

## Data Model Summary

[EVIDENCE-BASED]

### User Entity

```typescript
interface User {
  id: string;
  username: string;
  email: string | null;
  is_active: boolean;
  role?: Role;
  parent_profile?: ParentProfile;
}
```

### Role Entity

```typescript
interface Role {
  id: string;
  name: string;
  description: string | null;
}
```

### Permission Structure

```typescript
interface Permission {
  id: string;
  resource: string;
  action: string;
  is_granted: boolean;
}

interface PermissionMap {
  [resource: string]: string[];  // resource -> actions[]
}
```

### Student Context (for Parents)

```typescript
interface Student {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string;
  class_name: string;
  section_id?: string;
  section_name?: string;
  academic_year: string;
  academic_year_id: string;
  is_active: boolean;
}
```

**Source**: `src/types/auth.ts:1-118`

---

## Invariants & Rules

[EVIDENCE-BASED]

### Authentication Flow

1. **Login**: `POST /auth/login` — two possible responses:
   - **Normal**: returns tokens + user + permissions + menus + `entity_id`
   - **First-login**: returns `{ requires_password_change: true, change_password_token, message }`
2. **First-login redirect**: store `change_password_token` in `sessionStorage`, navigate to `/set-password`
3. **Set password**: `POST /auth/staff/set-password` — works for ALL roles (Staff, Teacher, Student, Parent). On success returns normal `LoginResponse`.
4. **Token Storage**: Tokens + `entityId` persisted in localStorage via Zustand `persist` with `partialize`
5. **Token Refresh**: 401 responses trigger automatic refresh attempt
6. **Logout**: Clears all auth state and redirects to login

### entity_id

`entity_id` in login response is role-specific:

| Role | `entity_id` is | How to use |
| --- | --- | --- |
| Student | student profile UUID | Pass as `student_id` in all self-service endpoints |
| Parent | parent profile UUID | Fetch children list with this ID, then use child's `id` |
| Admin/Staff/Teacher | not present | Not needed |

Stored as `entityId` in `authStore` — persisted to localStorage, cleared on logout.

### Route Protection

1. **`_app` layout**: Redirects to `/login` if `!isAuthenticated`
2. **`_auth` layout**: Redirects to `/` if `isAuthenticated`

**Evidence**: `src/routes/_app.tsx:9-14`, `src/routes/_auth.tsx:5-9`

### Permission Checking

```typescript
hasPermission: (resource: string, action: string) => {
  const { permissionsMap } = get()
  return permissionsMap[resource]?.includes(action) || false;
}
```

**Evidence**: `src/lib/authStore.ts:120-130`

### Token Refresh Logic

1. On 401 response (not a retry)
2. Get refresh token from store
3. POST to `/auth/login/refresh`
4. Update tokens in store
5. Retry original request
6. On refresh failure → logout + redirect

**Evidence**: `src/api/index.ts:44-82`

[INFERENCE]

### Session Timeout

- JWT refresh threshold: 5 minutes (`VITE_JWT_REFRESH_THRESHOLD`)
- Session timeout: 1 hour (`VITE_SESSION_TIMEOUT`)

---

## Public Interfaces

[EVIDENCE-BASED]

### Zustand Store Methods

```typescript
// Authentication actions
login: (data: LoginResponse) => void;   // sets entityId from data.entity_id
logout: () => void;                      // clears entityId
refreshTokens: (accessToken: string, refreshToken: string) => void;
setUser: (user: User | null) => void;

// Permission checking
hasPermission: (resource: string, action: string) => boolean;

// Student context (for parents)
selectStudent: (student: Student) => void;
setAvailableStudents: (students: Student[]) => void;
setStudentId: (studentId: string | null) => void;
```

### Parent Children Hook

```typescript
// src/api/auth.ts
useParentChildren(parentEntityId: string | null): UseQueryResult<Student[]>
// GET /student-parent-links/parent/{parentEntityId}/students
// enabled: !!parentEntityId, staleTime: 5 min
// Use directly in components — do NOT rely on availableStudents from store
```

### API Headers Added Automatically

| Header | Value | Purpose |
| --- | --- | --- |
| `Authorization` | `Bearer {accessToken}` | Authentication |
| `cschema` | Tenant identifier | Multi-tenancy |
| `X-Student-ID` | Selected student ID | Parent context |
| `X-Academic-Year-ID` | Academic year ID | Parent context |
| `X-Class-ID` | Class ID | Parent context |

### PermissionGuard Component

```tsx
<PermissionGuard
  resource="students"
  action="create"
  fallback={<NoPermissionMessage />}
>
  <ProtectedContent />
</PermissionGuard>
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

- **lib/config.ts**: API configuration, tenant settings
- **types/auth.ts**: TypeScript type definitions

### External Dependencies

- **zustand**: State management (`persist` middleware)
- **axios**: HTTP client for token refresh
- **@tanstack/react-router**: Route guards (`redirect`, `beforeLoad`)

---

## Known Risks

[INFERENCE]

### Security Considerations

1. **Token Storage**: localStorage is vulnerable to XSS attacks
2. **No CSRF Protection**: Token-based auth, no CSRF tokens observed
3. **Debug Logging**: Permission checks logged to console in production

### Concurrency

1. **Token Refresh Race**: Multiple simultaneous 401s could trigger multiple refresh attempts

### Error Handling

1. **Refresh Failure**: Silent redirect to login, no user notification observed

---

## Test Coverage

[UNCERTAIN]

No dedicated authentication tests found in codebase. Testing approach unclear.

---

## Role-Based Access Summary (Mar 2026)

| Role | Menu scope | Data scope | `entity_id` |
| --- | --- | --- | --- |
| Student | 13 student-facing menus | Own data only (403 on others) | student UUID |
| Parent | 13 student-facing menus | Linked children only (403 on others) | parent UUID |
| Admin/Staff/Teacher | All module menus | Full access | not present |

**Menu rendering**: Always use `menus` array from login response — never hardcode menus per role.

**403 vs 404**: Backend returns 404 (not 403) when a user tries to access a record they don't own — prevents information leakage. Handle both with a "not found" message on detail pages.

---

## Uncertainties

[UNCERTAIN]

1. **Session Invalidation**: Server-side session invalidation mechanism unknown
2. **Multi-Device Sessions**: Unknown if multiple sessions allowed
3. **2FA/MFA**: No evidence of two-factor authentication
4. **Token Expiry Times**: JWT expiry durations not visible in frontend code
