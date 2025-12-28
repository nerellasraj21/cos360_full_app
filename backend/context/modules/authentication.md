# Module Context - Authentication

Version: 1.0
Generated On: 2025-12-26
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

Evidence: `app/api/v1/auth/`, `app/service/auth/`

---

## Key Components

[EVIDENCE-BASED]

### Models
| Model | File | Purpose |
|-------|------|---------|
| User | `app/models/auth/user_model.py` | User accounts within tenants |
| Role | `app/models/auth/role_model.py` | Role definitions |
| Permission | `app/models/auth/permissions_model.py` | Permission definitions |
| ResourcePermission | `app/models/auth/resource_permission_model.py` | Resource-level permissions |
| RoleInheritance | `app/models/auth/role_inheritance_model.py` | Role hierarchy |
| Menu | `app/models/auth/menu_model.py` | Menu structure |

### Services
| Service | File | Purpose |
|---------|------|---------|
| MultiTenantAuthService | `multi_tenant_auth_service.py` | Core authentication with tenant context |
| MultiTenantPermissionService | `multi_tenant_permission_service.py` | Permission checking with tenant context |
| AccessValidationService | `access_validation_service.py` | Resource access validation |
| PlanService | `plan_service.py` | Plan-based feature access |
| ResourcePermissionService | `resource_permission_service.py` | Resource permission CRUD |
| UserContextService | `user_context_service.py` | User session context management |

### API Endpoints
| Endpoint File | Routes |
|--------------|--------|
| `login_endpoints.py` | `/api/v1/auth/login`, `/api/v1/auth/logout` |
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
- `username`: Unique within tenant
- `email`: Email address
- `password_hash`: Bcrypt hashed password
- `role_id` (UUID FK): Associated role
- `is_active`: Account status

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
1. JWT tokens expire after 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
2. JWT algorithm is HS256
3. Token includes: `sub` (user_id), `tenant_id`, `exp` (expiry)

Evidence: `app/config.py:16-17`, `context_guide.json:82-86`

### Permission System (Dual-Layer)
1. **Layer 1 - Plan Permissions**: What features the tenant subscription allows
2. **Layer 2 - Role Permissions**: What the user's role permits within allowed features

Evidence: `context_guide.json:343-356`

### SuperAdmin Bypass
- SuperAdmin users bypass ALL permission checks
- Identified by JWT claims: `is_superadmin`, `bypass_permissions`, `ultimate_access`

Evidence: `context_guide.json:88-91,481-486`

---

## Public Interfaces

[EVIDENCE-BASED]

### Authentication Endpoints
```
POST /api/v1/auth/login
  - Input: username, password
  - Headers: cschema (tenant identifier)
  - Output: JWT token, user info, permissions

POST /api/v1/auth/logout
  - Headers: Authorization (Bearer token)
```

### Role Management Endpoints
```
GET    /api/v1/auth/roles/
POST   /api/v1/auth/roles/
GET    /api/v1/auth/roles/{id}
PUT    /api/v1/auth/roles/{id}
DELETE /api/v1/auth/roles/{id}
```

### Permission Management Endpoints
```
GET    /api/v1/auth/resource-permissions/
POST   /api/v1/auth/resource-permissions/
PUT    /api/v1/auth/resource-permissions/{id}
DELETE /api/v1/auth/resource-permissions/{id}
```

### Access Validation
```
POST /api/v1/auth/validate-access/
  - Validates if current user can access a specific resource/action
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies
- `app/db/tenant_session.py` - Database session with tenant context
- `app/middleware/tenant_middleware.py` - Tenant detection
- `app/config.py` - JWT configuration

### External Libraries
- `python-jose` - JWT handling
- `passlib[bcrypt]` - Password hashing

---

## Known Risks

[INFERENCE]

### Security Considerations
1. **Token Storage**: No token revocation mechanism visible; relies on expiry
2. **Password Policy**: No explicit password strength enforcement observed in codebase

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

## Uncertainties

[UNCERTAIN]

1. **Token Refresh**: No explicit refresh token mechanism observed
2. **Session Management**: No server-side session storage; stateless JWT only
3. **Account Lockout**: No failed login attempt tracking or lockout mechanism visible
4. **Password Reset**: No password reset flow endpoints found

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked.
