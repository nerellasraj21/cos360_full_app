# Module Context – Authentication

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
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
|------|---------|
| `src/routes/_auth.tsx` | Authentication layout (unauthenticated users) |
| `src/routes/_auth/login.tsx` | Login page |
| `src/routes/_auth/forgot-password.tsx` | Password recovery |

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

1. **Login**: POST to `/auth/login` returns tokens + user data + permissions
2. **Token Storage**: Tokens persisted in localStorage via Zustand persist
3. **Token Refresh**: 401 responses trigger automatic refresh attempt
4. **Logout**: Clears all auth state and redirects to login

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
login: (data: LoginResponse) => void;
logout: () => void;
refreshTokens: (accessToken: string, refreshToken: string) => void;
setUser: (user: User | null) => void;

// Permission checking
hasPermission: (resource: string, action: string) => boolean;

// Student context (for parents)
selectStudent: (student: Student) => void;
setAvailableStudents: (students: Student[]) => void;
setStudentId: (studentId: string | null) => void;
```

### API Headers Added Automatically

| Header | Value | Purpose |
|--------|-------|---------|
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

## Uncertainties

[UNCERTAIN]

1. **Password Requirements**: No client-side password validation schema found
2. **Session Invalidation**: Server-side session invalidation mechanism unknown
3. **Multi-Device Sessions**: Unknown if multiple sessions allowed
4. **2FA/MFA**: No evidence of two-factor authentication
5. **Password Reset Flow**: Backend implementation details unknown
6. **Token Expiry Times**: JWT expiry durations not visible in frontend code
