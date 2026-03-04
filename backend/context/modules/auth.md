# Module Context - Authentication

Version: 1.1
Generated On: 2026-03-04
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Authentication module handles:

- User authentication (login/logout)
- JWT token generation and validation
- Role and permission management
- Access validation for protected resources
- Multi-tenant authentication context
- Menu and resource permission configuration
- First-time login flow for Staff, Teacher, and Student roles

Evidence: `app/api/v1/auth/`, `app/service/auth/`

---

## Key Components

[EVIDENCE-BASED]

### Models

| Model | File | Purpose |
| --- | --- | --- |
| User | `app/models/auth/user_model.py` | User accounts within tenants |
| Role | `app/models/auth/role_model.py` | Role definitions |
| Permission | `app/models/auth/permissions_model.py` | Permission definitions |
| ResourcePermission | `app/models/auth/resource_permission_model.py` | Resource-level permissions |
| RoleInheritance | `app/models/auth/role_inheritance_model.py` | Role hierarchy |
| Menu | `app/models/auth/menu_model.py` | Menu structure |

### Services

| Service | File | Purpose |
| --- | --- | --- |
| MultiTenantAuthService | `multi_tenant_auth_service.py` | Core authentication with tenant context |
| MultiTenantPermissionService | `multi_tenant_permission_service.py` | Permission checking with tenant context |
| AccessValidationService | `access_validation_service.py` | Resource access validation |
| PlanService | `plan_service.py` | Plan-based feature access |
| ResourcePermissionService | `resource_permission_service.py` | Resource permission CRUD |
| UserContextService | `user_context_service.py` | User session context management |
| TokenBlacklistService | (in auth service layer) | Token revocation via blacklist |

### API Endpoints

| Endpoint File | Routes |
| --- | --- |
| `login_endpoints.py` | `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/staff/set-password` |
| `role_endpoints.py` | `/api/v1/auth/roles/` |
| `menu_endpoints.py` | `/api/v1/auth/menus/` |
| `permissions_endpoints.py` | `/api/v1/auth/permissions/` |
| `resource_permission_endpoints.py` | `/api/v1/auth/resource-permissions/` |
| `access_validation_endpoints.py` | `/api/v1/auth/validate-access/` |
| `seed_endpoints.py` | `/api/v1/auth/seed/` (data seeding) |
| `test_setup_endpoints.py` | `/api/v1/auth/test-setup/` (testing) |
| `test_jwt_endpoints.py` | `/api/v1/auth/test-jwt/` (JWT testing) |

---

## Data Model Summary

[EVIDENCE-BASED]

### User

- `id` (UUID): Primary key
- `username`: Unique within tenant — widened to `VARCHAR(100)` to accommodate email as username
- `email`: Email address
- `password_hash`: Bcrypt hashed password
- `role_id` (UUID FK): Associated role
- `is_active`: Account status
- `is_first_login` (boolean): NOT in the SQLAlchemy model — checked and set only via raw SQL with try/except graceful fallback. Set to `TRUE` on Staff/Teacher/Student enrollment; cleared to `FALSE` after first password change.

### Role

- `id` (UUID): Primary key
- `name`: Role name (e.g., Admin, Teacher, Student)
- `description`: Role description
- `is_system_role`: Whether role is predefined

### ResourcePermission

- `id` (UUID): Primary key
- `role_id` (UUID FK): Associated role
- `resource_name`: Resource identifier
- `action`: Permitted action (create, read, update, delete, list)

---

## Invariants & Rules

[EVIDENCE-BASED]

### Authentication Rules

1. JWT tokens expire after 24 hours (set in `app/tools/jwt_utils.py`)
2. JWT algorithm is HS256
3. **Real login token fields** (set by `login_user` in `multi_tenant_auth_service.py`):
   - `sub` = user UUID string (e.g. `e7a84da0-...`) — use `current_user.get('sub')` for DB lookups
   - `username` = username string (e.g. `sita.sharma`)
   - `role` = role name string
   - `client_name` = tenant name
   - `exp`, `token_type: "access"`
   - **No `id` field** in real login tokens
4. **Manual test tokens** (created in scripts/tests): use `sub` = username and `id` = UUID — different convention, do NOT rely on `id` in endpoint code
5. `change_password_token` is a short-lived JWT (15 min) with `token_type: "change_password"` claim — used exclusively for the first-login password change flow

Evidence: `app/tools/jwt_utils.py`, `app/service/auth/multi_tenant_auth_service.py:389-397`

### Permission System (Dual-Layer)

1. **Layer 1 - Plan Permissions**: What features the tenant subscription allows
2. **Layer 2 - Role Permissions**: What the user's role permits within allowed features

Evidence: `context_guide.json:343-356`

### SuperAdmin Bypass

- SuperAdmin users bypass ALL permission checks
- Identified by JWT claims: `is_superadmin`, `bypass_permissions`, `ultimate_access`

Evidence: `context_guide.json:88-91,481-486`

### First-Time Login Rules

1. Applies to roles: `Staff`, `Teacher`, `Student`, and `Parent`
2. If `is_first_login = TRUE`, login returns `PasswordChangeRequiredResponse` instead of `LoginResponse`
3. The `change_password_token` must be used within 15 minutes to set a new password
4. After password change, `is_first_login` is set to `FALSE` and a full `LoginResponse` is returned
5. `is_first_login` is never declared in the SQLAlchemy User model — all reads/writes use raw SQL with graceful fallback to avoid SELECT failures if the column is missing from a schema
6. `entity_id` resolves correctly for all roles (in both `LoginResponse` and `SetPasswordResponse`):
   - `Student` → `student.id`
   - `Parent` → `parent.id`
   - `Staff` / `Teacher` → `staff.id`
7. Normal login (after first-login is complete) also returns `entity_id` for Student and Parent roles

Evidence: `app/api/v1/auth/login_endpoints.py`, `app/service/auth/multi_tenant_auth_service.py`

### Staff Enrollment Rules

1. Staff enrollment requires either an email OR a phone number (raises HTTP 400 if both are missing)
2. Email is used as `username` when available; phone is the fallback
3. Temp password on enrollment is `Welcome@123`
4. `is_first_login = TRUE` is set via raw SQL at enrollment time

Evidence: `app/service/masters/staff_service.py`

### Login Lookup Order

`authenticate_user` resolves credentials in this order:

1. Username match (direct)
2. Email match
3. Staff phone JOIN (enables login via email, phone number, or username)

---

## Public Interfaces

[EVIDENCE-BASED]

### Authentication Endpoints

```text
POST /api/v1/auth/login
  - Input: username (or email or phone), password
  - Headers: cschema (tenant identifier)
  - Output: Union[LoginResponse, PasswordChangeRequiredResponse, LegacyLoginResponse]
    - Normal login: LoginResponse (JWT token, user info, permissions)
    - First-login (Staff/Teacher): PasswordChangeRequiredResponse

POST /api/v1/auth/logout
  - Headers: Authorization (Bearer token)
  - Effect: Token added to blacklist via TokenBlacklistService
```

### First-Time Login Flow

```text
POST /api/v1/auth/staff/set-password
  - Input: SetPasswordRequest { change_password_token, new_password, confirm_password }
  - Headers: cschema (tenant identifier)
  - Output: SetPasswordResponse (same structure as LoginResponse + success message)
  - Effect: Verifies change_password_token, updates password hash, sets is_first_login = FALSE
```

**Flow sequence (applies to Staff, Teacher, Student, and Parent):**

1. User is enrolled — credentials set in DB
   - **Staff/Teacher** (`POST /staff/enrollment`): username = email (or phone fallback), temp password `Welcome@123`, `is_first_login = TRUE`
   - **Student** (`POST /students/admission/`): username = `firstname.lastname` lowercase (e.g., `ravi.sharma`), collision suffix added if taken (e.g., `ravi.sharma1`), password `student@123`, no first-login flag
   - **Parent** (`POST /students/admission/`): username = email (e.g., `suresh.sharma@gmail.com`), password `parent@123`, no first-login flag
2. User calls `POST /auth/login` — receives `PasswordChangeRequiredResponse`:

   ```json
   {
     "requires_password_change": true,
     "change_password_token": "<15-min JWT>",
     "message": "Please set a new password to continue"
   }
   ```

3. Frontend calls `POST /auth/staff/set-password` with the token and new password
   - Same endpoint is reused for ALL roles (Staff, Teacher, Student, Parent)
4. Backend verifies token type (`"change_password"`), updates password hash, clears `is_first_login`, returns full `LoginResponse` with correct `entity_id` for the role

**If username does NOT exist in DB:** login returns `401 Invalid Credentials`

### Role Management Endpoints

```text
GET    /api/v1/auth/roles/
POST   /api/v1/auth/roles/
GET    /api/v1/auth/roles/{id}
PUT    /api/v1/auth/roles/{id}
DELETE /api/v1/auth/roles/{id}
```

### Permission Management Endpoints

```text
GET    /api/v1/auth/resource-permissions/
POST   /api/v1/auth/resource-permissions/
PUT    /api/v1/auth/resource-permissions/{id}
DELETE /api/v1/auth/resource-permissions/{id}
```

### Access Validation

```text
POST /api/v1/auth/validate-access/
  - Validates if current user can access a specific resource/action
```

---

## Schemas (auth module)

[EVIDENCE-BASED]

Key schemas in `app/schemas/auth/login_schema.py`:

| Schema | Purpose |
| --- | --- |
| `LoginResponse` | Normal login response: user, role, menu, permissions, entity_id, tokens |
| `PasswordChangeRequiredResponse` | First-login response: `requires_password_change`, `change_password_token`, `message` |
| `SetPasswordRequest` | Input for `/staff/set-password`: `change_password_token`, `new_password` (min 8), `confirm_password` |
| `SetPasswordResponse` | Same structure as `LoginResponse` plus a success message field |
| `LegacyLoginResponse` | Returned for non-Staff/Teacher roles or older flows |

---

## JWT Utilities

[EVIDENCE-BASED]

File: `app/tools/jwt_utils.py`

| Function | Purpose |
| --- | --- |
| `create_access_token(data)` | Creates standard 30-min access JWT |
| `verify_token(token)` | Validates and decodes a standard access JWT |
| `create_change_password_token(data)` | Creates 15-min JWT with `token_type: "change_password"` |
| `verify_change_password_token(token)` | Validates the change-password JWT and checks token_type claim |

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

- `app/db/tenant_session.py` - Database session with tenant context
- `app/middleware/tenant_middleware.py` - Tenant detection
- `app/config.py` - JWT configuration
- `app/tools/jwt_utils.py` - Token creation and verification (including change_password tokens)
- `app/service/masters/staff_service.py` - Staff enrollment (sets is_first_login)

### External Libraries

- `python-jose` - JWT handling
- `passlib[bcrypt]` - Password hashing

---

## Known Risks

[INFERENCE]

### Security Considerations

1. **Token Revocation**: Token blacklist IS implemented via `TokenBlacklistService` — logout adds the token to the blacklist
2. **Password Policy**: No explicit password strength enforcement for general users. First-login password minimum is 8 characters (enforced by `SetPasswordRequest` schema)
3. **Temp Password Exposure**: Default temp password `Welcome@123` is a fixed constant — all newly enrolled staff share the same initial credential until first login
4. **is_first_login Raw SQL**: The `is_first_login` column is managed via raw SQL with try/except fallback. If the column does not exist in a tenant schema, the first-login check silently fails and normal login proceeds

### Performance Considerations

1. **Permission Checking**: May require multiple database queries per request for complex permission checks
2. **No Caching**: Permission results not cached (identified in `context_guide.json:646-650`)

---

## Test Coverage

[UNCERTAIN]

- Test endpoints exist (`test_setup_endpoints.py`, `test_jwt_endpoints.py`)
- Dedicated test files not found in standard test directories for auth module
- Integration tests may exist in `tests/` directory

---

## Utility Scripts (March 2026)

[EVIDENCE-BASED]

| Script | Purpose |
| --- | --- |
| `scripts/create_ganesh_teacher.py` | Seeds Ganesh G (Teacher) with the first-login flow for dev/testing |
| `scripts/set_staff_password.py` | Directly sets a staff/teacher password and clears `is_first_login` (bypasses first-login during frontend dev) |
| `scripts/create_lambodhar_student.py` | Seeds Lambodhar Vinayak (Student, Class ABC / Section A) with first-login flow. Also seeds Student role permissions and role_menu_permissions. |
| `scripts/create_parent_with_children.py` | Seeds Sita Sharma (Parent, username: `sita.sharma`) linked to Lambodhar Vinayak (Child 1) and Arjun Sharma (Child 2). Seeds Parent role with `read_related`/`list_related` permissions. |
| `scripts/seed_arjun_admission.py` | Creates Arjun Sharma's admission record (Class ABC, Section B) so the parent can swap to him and view his details. |
| `scripts/reseed_student_parent_permissions.py` | Drops and re-inserts Student/Parent resource_permissions with correct `_own`/`_related` variants. Run when ON CONFLICT DO NOTHING prevents updates. |

## Student & Parent Role Permissions (March 2026)

[EVIDENCE-BASED]

Permissions for Student and Parent are managed by `scripts/reseed_student_parent_permissions.py` (full delete + re-insert) and seeded by `POST /api/v1/auth/seed/all-role-permissions` (additive WHERE NOT EXISTS).

### Student Role — 29 permissions

| Resource | Actions |
| -------- | ------- |
| `profile` | `read_own`, `update_own` |
| `academic_years` | `read`, `list` |
| `classes` | `read`, `list` |
| `subjects` | `read`, `list` |
| `certificate_types` | `read`, `list` |
| `exams` | `read`, `list` |
| `exam_marks` | `read_own`, `list_own` |
| `exam_hall_tickets` | `read_own`, `list_own` |
| `student_admissions` | `read_own`, `list_own` |
| `student_attendance` | `read_own`, `list_own` |
| `student_certificates` | `read_own`, `list_own` |
| `student_documents` | `read_own`, `list_own` |
| `student_transport` | `read_own` |
| `fee_receipts` | `read_own`, `list_own` |
| `fee_transactions` | `read_own`, `list_own` |

### Parent Role — 21 permissions

| Resource | Actions |
| -------- | ------- |
| `academic_years` | `read`, `list` |
| `classes` | `read`, `list` |
| `subjects` | `read`, `list` |
| `student_admissions` | `read_related`, `list_related` |
| `student_attendance` | `read_related`, `list_related` |
| `student_certificates` | `read_related`, `list_related` |
| `student_documents` | `read_related`, `list_related` |
| `student_transport` | `read_related` |
| `exams` | `read`, `list` |
| `exam_marks` | `read_related`, `list_related` |
| `exam_hall_tickets` | `read_related`, `list_related` |

### Menu Restriction (Student & Parent)

Both roles receive exactly 13 menus from the login response — admin Transport menus are excluded. The menu seeder uses a URL allowlist in `seed_endpoints.py`. Student Transport menu URL is `/students/studenttransport` (all lowercase).

---

## Attendance Date Range Requirement (March 2026)

[EVIDENCE-BASED]

Both student-facing attendance endpoints now require `start_date` and `end_date` as mandatory query parameters. Omitting either returns `422 Unprocessable Entity`.

| Endpoint | Who uses it | Behaviour |
| --- | --- | --- |
| `GET /student/attendance/my-attendance?start_date=&end_date=` | Student (self) | Returns own attendance in date range only |
| `GET /student/attendance/student/{student_id}/filter?start_date=&end_date=` | Parent / Admin / Teacher | Returns child's attendance in date range only |

**Frontend must always supply both params before calling.** Recommended default: current month (`first day of month` → `today`).

---

## Uncertainties

[UNCERTAIN]

1. **Token Refresh**: Refresh tokens ARE implemented — the `LoginResponse` includes both `access_token` and `refresh_token`
2. **Session Management**: Primarily stateless JWT; token blacklist provides server-side revocation on logout
3. **Account Lockout**: No failed login attempt tracking or lockout mechanism visible
4. **Password Reset**: Self-service password reset flow (for forgotten passwords) not found — the `/staff/set-password` endpoint covers first-login only, not arbitrary reset

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked.
