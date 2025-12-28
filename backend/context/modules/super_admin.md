# Module Context - SuperAdmin

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The SuperAdmin module provides system-wide administrative capabilities:
- SuperAdmin authentication with ultimate access
- Tenant management and provisioning
- Plan and subscription management
- System health monitoring
- Cross-tenant data access
- Schema management

Evidence: `app/api/v1/super_admin/`, `app/service/super_admin/`, `context_guide.json:456-496`

---

## Key Components

[EVIDENCE-BASED]

### Models
| Model | File | Purpose |
|-------|------|---------|
| SuperAdminUser | `app/models/public/super_admin_model.py` | SuperAdmin accounts |
| SuperAdminAudit | `app/models/public/super_admin_model.py` | Audit trail |
| Tenant | `app/models/public/tenant_model.py` | Tenant registration |
| Plan | `app/models/public/plan_model.py` | Subscription plans |

### Services
| Service | File | Purpose |
|---------|------|---------|
| SuperAdminService | `super_admin_service.py` | Core SuperAdmin operations |
| TenantSchemaService | `tenant_schema_service.py` | Tenant schema provisioning |
| DatabaseService | `database_service.py` | Dynamic database operations |

### API Endpoints
| Endpoint File | Routes |
|--------------|--------|
| `auth_endpoints.py` | `/api/v1/super_admin/auth/` |
| `plan_endpoints.py` | `/api/v1/super_admin/plans/` |
| `system_endpoints.py` | `/api/v1/super_admin/system/` |
| `setup_endpoints.py` | `/api/v1/super_admin/setup/` |
| `tenant_data_endpoints.py` | `/api/v1/super_admin/tenant-data/` |
| `enhanced_tenant_endpoints.py` | Enhanced tenant management |

---

## Data Model Summary

[EVIDENCE-BASED]

### SuperAdminUser (Public Schema)
- `id` (UUID): Primary key
- `username`: Unique identifier
- `email`: Email address
- `password_hash`: Bcrypt hashed password
- `is_active`: Account status
- `created_at`, `updated_at`: Timestamps

### SuperAdminAudit (Public Schema)
- `id` (UUID): Primary key
- `super_admin_id` (UUID FK): Acting SuperAdmin
- `action`: Action performed
- `target_tenant`: Affected tenant
- `details`: JSON details
- `created_at`: Timestamp

### Tenant (Public Schema)
- `id` (UUID): Primary key
- `name`: Display name
- `client_name`: URL-safe identifier (used in cschema header)
- `schema_name`: PostgreSQL schema name
- `plan_id` (UUID FK): Subscription plan
- `is_active`: Tenant status

### Plan (Public Schema)
- `id` (UUID): Primary key
- `name`: Plan name (e.g., Basic, Standard, Enterprise)
- `description`: Plan description
- `is_active`: Plan availability

---

## Invariants & Rules

[EVIDENCE-BASED]

### SuperAdmin Authentication
1. SuperAdmin uses separate login endpoint: `/api/v1/super_admin/auth/login`
2. SuperAdmin JWT includes special claims:
   - `is_superadmin: true`
   - `bypass_permissions: true`
   - `ultimate_access: true`

Evidence: `context_guide.json:480-486`

### Ultimate Access
1. SuperAdmin bypasses ALL permission checks at middleware level
2. Can access any tenant schema using `X-SuperAdmin-Target-Tenant` header
3. Without target header, operates on public schema

Evidence: `app/middleware/tenant_middleware.py:186-216`

### Audit Logging
1. All SuperAdmin actions logged to `super_admin_audit` table
2. 154 audit records recorded (as of context_guide.json)

Evidence: `context_guide.json:576-577`

---

## Public Interfaces

[EVIDENCE-BASED]

### Authentication
```
POST /api/v1/super_admin/auth/login
  - Input: username, password
  - Output: JWT token with ultimate access claims
```

### Plan Management
```
GET    /api/v1/super_admin/plans/
POST   /api/v1/super_admin/plans/
GET    /api/v1/super_admin/plans/{id}
PUT    /api/v1/super_admin/plans/{id}
DELETE /api/v1/super_admin/plans/{id}
```

### System Monitoring
```
GET /api/v1/super_admin/system/health
  - System health status
```

### Tenant Data Access
```
GET /api/v1/super_admin/tenant-data/schemas/
  - List all tenant schemas

GET /api/v1/super_admin/tenant-data/{tenant_schema}/users/
  - List users in specific tenant

GET /api/v1/super_admin/tenant-data/{tenant_schema}/students/
  - List students in specific tenant

GET /api/v1/super_admin/tenant-data/{tenant_schema}/stats/
  - Tenant statistics
```

### Special Headers
```
X-SuperAdmin-Target-Tenant: {schema_name}
  - Required for accessing specific tenant data
  - Optional for public schema operations
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies
- `app/middleware/super_admin_middleware.py` - SuperAdmin context
- `app/middleware/tenant_middleware.py` - Dynamic schema switching
- `app/db/tenant_session.py` - Multi-tenant database sessions

### Public Schema Access
- Operates on `public` PostgreSQL schema
- Creates/manages tenant schemas dynamically

---

## Known Risks

[INFERENCE]

### Security Considerations
1. **Ultimate Access**: SuperAdmin has unrestricted access - single point of failure
2. **Audit Trail Integrity**: Audit logs stored in same database as application data

### Operational Considerations
1. **Schema Creation**: Tenant provisioning involves DDL operations
2. **Data Migration**: Schema changes need to propagate to all tenant schemas

---

## Test Coverage

[EVIDENCE-BASED]

- Tested and verified working as of 2025-09-23
- Test results documented in `context_guide.json:162-198`
- All major endpoints verified working

---

## Uncertainties

[UNCERTAIN]

1. **Tenant Deprovisioning**: Process for removing/archiving tenant schemas not documented
2. **Backup Integration**: How SuperAdmin integrates with backup procedures
3. **Rate Limiting**: Whether SuperAdmin endpoints have rate limits applied

---

## Verified Test Credentials

[EVIDENCE-BASED]

```
Username: superadmin
Password: SuperAdmin123!
User Type: super_admin
Status: VERIFIED WORKING (2025-09-23)
```

Evidence: `context_guide.json:104-116`

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked.
