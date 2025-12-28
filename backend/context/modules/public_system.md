# Module Context - Public (System)

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Public module manages system-wide entities in the public PostgreSQL schema:
- Organization/tenant registration
- Public schema data management
- Tenant provisioning preparation

Evidence: `app/api/v1/public/`, `app/service/public/`, `app/models/public/`

---

## Key Components

[EVIDENCE-BASED]

### Models (Public Schema)
| Model | File | Purpose |
|-------|------|---------|
| Organization | `org_model.py` | Organization registration |
| Tenant | `tenant_model.py` | Tenant configuration |
| Plan | `plan_model.py` | Subscription plans |
| Menu | `menu_model.py` | System menu structure |
| MenuAction | `menu_action_model.py` | Menu action definitions |
| PlanMenu | `plan_menu_model.py` | Plan-to-menu access |
| PermissionTemplate | `permission_template_model.py` | Default permissions |
| RoleTemplate | `role_template_model.py` | Default roles |
| SuperAdminUser | `super_admin_model.py` | SuperAdmin accounts |

### Services
| Service | File | Size | Purpose |
|---------|------|------|---------|
| OrgService | `org_service.py` | 18KB | Organization CRUD |

### API Endpoints
| Endpoint File | Routes |
|--------------|--------|
| `org_routes.py` | `/api/v1/orgs/` |

---

## Data Model Summary

[EVIDENCE-BASED]

### Organization
- `id` (UUID): Primary key
- `name`: Organization display name
- `code`: Unique organization code
- `is_active`: Status

### Tenant (managed by SuperAdmin)
- `id` (UUID): Primary key
- `name`: Tenant display name
- `client_name`: URL-safe identifier (cschema header value)
- `schema_name`: PostgreSQL schema name
- `plan_id` (UUID FK): Subscription plan
- `is_active`: Status

### Plan
- `id` (UUID): Primary key
- `name`: Plan name (Basic, Standard, Enterprise)
- `description`: Plan description
- `is_active`: Availability

### Menu
- `id` (UUID): Primary key
- `name`: Menu item name
- `url`: Navigation URL
- `icon`: Display icon
- `parent_id` (UUID FK): Parent menu (nullable)
- `display_order`: Sort order
- `is_active`: Visibility

---

## Public Schema Tables

[EVIDENCE-BASED]

| Table | Records | Purpose |
|-------|---------|---------|
| tenants | 3 | Registered tenants |
| plans | 4 | Subscription plans |
| menus | 49 | Menu structure |
| plan_resource_access | 108 | Plan-resource mapping |
| super_admin_users | 1 | SuperAdmin accounts |
| super_admin_audit | 154 | Audit trail |
| menu_actions | 5 | Action types |
| permission_templates | 5 | Default permissions |
| plan_menu_access | 125 | Plan-menu mapping |
| role_templates | 5 | Default roles |
| organizations | 0 | Organization registry |

Evidence: `context_guide.json:257-284`

---

## Invariants & Rules

[EVIDENCE-BASED]

### Schema Isolation
1. Public schema contains ONLY system-wide data
2. Tenant-specific data in separate schemas
3. All public tables use UUID primary keys

Evidence: `context_guide.json:254-256,284`

### Plan-Based Access
1. Plan defines available features for tenant
2. Menu access controlled by plan_menu_access
3. Resource access controlled by plan_resource_access

---

## Public Interfaces

[EVIDENCE-BASED]

### Organization Endpoints
```
GET    /api/v1/orgs/
  - List organizations

POST   /api/v1/orgs/
  - Register new organization

GET    /api/v1/orgs/{id}
  - Get organization details

PUT    /api/v1/orgs/{id}
  - Update organization

DELETE /api/v1/orgs/{id}
  - Deactivate organization
```

---

## Dependencies

[EVIDENCE-BASED]

### Database
- Operates on `public` PostgreSQL schema
- Uses `BasePublic` declarative base

Evidence: `app/db/base.py:4-6`

### Related Modules
- SuperAdmin Module (tenant management)
- Authentication Module (plan enforcement)

---

## Unfixed Issues

[EVIDENCE-BASED]

### Database Refresh Pattern
- `org_service.py` (3 instances: create, update, deactivate)
- Marked as LOW PRIORITY

Evidence: `context_guide.json:703-707`

---

## Known Risks

[INFERENCE]

### Data Integrity
1. **Tenant Deletion**: Complex cascade to tenant schema
2. **Plan Changes**: Downgrading plan may remove features in use

### Security
1. **Public Exposure**: Public schema accessible to all tenants
2. **Menu Injection**: Menu updates affect all tenants

---

## Test Coverage

[UNCERTAIN]

- Organization records: 0 (empty table)
- Other tables have production data
- Specific tests not observed

---

## Uncertainties

[UNCERTAIN]

1. **Tenant Lifecycle**: Full tenant provisioning workflow not documented
2. **Plan Upgrade**: How plan changes affect existing permissions
3. **Menu Customization**: Whether tenants can customize menus
4. **Billing Integration**: No payment/billing system visible

---

## Migration Status

[EVIDENCE-BASED]

- UUID migration: COMPLETED (2025-09-19)
- All 11 tables migrated from Integer to UUID

Evidence: `context_guide.json:284`

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked.
