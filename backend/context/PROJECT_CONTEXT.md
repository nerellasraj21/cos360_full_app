# Project Context

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Project Purpose

[EVIDENCE-BASED]

COS360 is a **Multi-Tenant School Management System** built with FastAPI. The system provides comprehensive school administration capabilities including:

- Student admissions and management
- Fee collection and financial management
- Staff and parent management
- Academic management (classes, subjects, timetables)
- Transport management
- Expense tracking
- Reports and analytics

Evidence: `context_guide.json:2-10`, `app/main.py`, folder structure under `app/api/v1/`

---

## Architecture Summary

[EVIDENCE-BASED]

### Multi-Tenant Architecture

- **Schema-per-tenant isolation**: Each tenant has its own PostgreSQL schema
- **Tenant detection via HTTP header**: `cschema` header identifies the tenant
- **Dual base classes**: `BasePublic` for public schema, `BaseOrg` for tenant schemas

Evidence: `app/db/base.py:1-12`, `app/middleware/tenant_middleware.py:1-224`

### Layered Architecture

```
+------------------+
|  API Endpoints   |  (app/api/v1/)
+------------------+
|  Services        |  (app/service/)
+------------------+
|  Models/Schemas  |  (app/models/, app/schemas/)
+------------------+
|  Database Layer  |  (app/db/)
+------------------+
```

### Key Architectural Patterns

1. **Router-based API organization**: Endpoints grouped by domain (auth, fee, student, masters, etc.)
2. **Service layer pattern**: Business logic separated in service classes
3. **Middleware stack**: Request processing through multiple middleware layers
4. **Dependency injection**: FastAPI's Depends() for database sessions and auth

Evidence: `app/api/v1/main_router.py:1-130`, `app/main.py:71-90`

---

## Technology Stack

[EVIDENCE-BASED]

### Core Framework

- **FastAPI** 0.116.1 - Web framework
- **Uvicorn** 0.35.0 - ASGI server
- **Starlette** 0.47.3 - ASGI toolkit
- **Pydantic** 2.11.7 - Data validation

### Database

- **PostgreSQL** - Primary database (Neon for production)
- **SQLAlchemy** 2.0.43 - ORM
- **Alembic** 1.16.5 - Database migrations
- **asyncpg** 0.30.0 - Async PostgreSQL driver

### Authentication & Security

- **python-jose** 3.5.0 - JWT handling
- **passlib/bcrypt** - Password hashing
- **HS256** algorithm for JWT tokens

### Task Queue

- **Celery** 5.3.4 - Distributed task queue
- **Redis** 6.4.0 - Message broker and caching

### Additional Libraries

- **openpyxl** 3.1.2 - Excel file handling
- **reportlab** 4.0.4 - PDF generation
- **slowapi** 0.1.9 - Rate limiting
- **python-socketio** 5.14.2 - WebSocket support

Evidence: `requirements.txt:1-110`

---

## Cross-Cutting Concerns

[EVIDENCE-BASED]

### 1. Multi-Tenancy

- Header-based tenant detection (`cschema` header)
- Dynamic PostgreSQL schema switching
- Tenant-specific data isolation

Evidence: `app/middleware/tenant_middleware.py:40-94`, `context_guide.json:64-80`

### 2. Authentication & Authorization

- **Dual-layer permission system**:
  - Layer 1: Plan-based permissions (what features tenant can access)
  - Layer 2: Role-based permissions (what user can do within features)
- JWT tokens with 30-minute expiry
- SuperAdmin bypass for ultimate access

Evidence: `context_guide.json:82-102`, `app/config.py:13-17`

### 3. Rate Limiting

- Implemented via `slowapi`
- Configurable rate limits per endpoint

Evidence: `app/main.py:12,33-34`, `app/middleware/rate_limit_middleware.py`

### 4. Error Handling

- Global error middleware
- Request context middleware for correlation IDs
- Structured error responses

Evidence: `app/main.py:71-75`, `app/middleware/error_middleware.py`

### 5. Logging

- Configured logging with file output (`cos360_errors.log`)
- Tenant-aware logging in middleware

Evidence: `app/main.py:68-69`, `app/tools/logging.py`

### 6. CORS

- Configurable allowed origins
- Full credential support

Evidence: `app/main.py:84-90`, `app/config.py:20`

---

## Global Constraints

[EVIDENCE-BASED]

### Database Constraints

1. All tables use **UUID primary keys** (migration completed 2025-09-19)
2. Multi-tenant schemas must be consistent across all tenants
3. Public schema contains system-wide data (tenants, plans, menus)

Evidence: `context_guide.json:254-341`

### API Constraints

1. All business endpoints require tenant context (`cschema` header)
2. Protected endpoints require JWT Bearer token
3. Swagger/ReDoc protected with HTTP Basic Auth

Evidence: `app/main.py:21-30,59-66`

### Known Database Refresh Pattern Issue

[EVIDENCE-BASED]

- **Problem**: Using `refresh()` after `commit()` causes schema context loss in multi-tenant environment
- **Solution**: Use `flush() -> select() -> commit()` pattern
- **Status**: 56 instances remain unfixed across 26 files

Evidence: `context_guide.json:653-745`

---

## Known Non-Goals

[INFERENCE]

Based on codebase analysis, the following are NOT implemented:

1. **Real-time chat/messaging** - No chat models or services found
2. **Mobile-native API** - Standard REST API only, no mobile-specific optimizations
3. **GraphQL** - REST-only implementation
4. **External payment gateway integration** - Fee management is internal only
5. **Multi-language/i18n support** - No localization infrastructure observed

---

## Uncertainties

[UNCERTAIN]

1. **Celery worker deployment**: Worker configuration exists (`start_celery_worker.py`) but production deployment details unclear
2. **Redis production configuration**: Development defaults in `app/config.py:26-30`, production setup not documented
3. **Backup and disaster recovery**: No backup scripts or procedures found in codebase
4. **API versioning strategy**: Only v1 exists; strategy for future versions unclear
5. **WebSocket implementation status**: `python-socketio` in dependencies but no clear WebSocket endpoints found

---

## Database Schema Overview

[EVIDENCE-BASED]

### Public Schema (System-wide)

| Table                | Purpose                               |
| -------------------- | ------------------------------------- |
| tenants              | Tenant registration and configuration |
| plans                | Subscription plans                    |
| menus                | System menu structure                 |
| super_admin_users    | SuperAdmin accounts                   |
| super_admin_audit    | Audit trail for SuperAdmin actions    |
| plan_resource_access | Plan-to-resource permission mapping   |
| plan_menu_access     | Plan-to-menu access mapping           |

### Tenant Schema (Per-tenant)

- 55 tables per tenant schema
- Consistent structure across all tenants
- Key tables: users, roles, resource*permissions, students, staff, academic_years, classes, fee*_, expense\__

Evidence: `context_guide.json:254-341`

---

## Middleware Stack Order

[EVIDENCE-BASED]

Middleware executes in reverse order of registration:

1. **CORSMiddleware** - CORS headers
2. **TenantMiddleware** - Tenant detection and context
3. **SuperAdminMiddleware** - SuperAdmin context
4. **RequestContextMiddleware** - Correlation IDs
5. **GlobalErrorMiddleware** - Error handling

Evidence: `app/main.py:71-90`

---

## Environment Configuration

[EVIDENCE-BASED]

### Environment Files

- `.env` - Development configuration
- `.env.production` - Production configuration
- `.env.example` - Template

### Key Environment Variables

| Variable           | Purpose                      |
| ------------------ | ---------------------------- |
| DATABASE_URL       | PostgreSQL connection string |
| JWT_SECRET_KEY     | JWT signing key              |
| SECRET_KEY         | Application secret           |
| REDIS_URL          | Redis connection string      |
| TENANT_STRICT_MODE | Require cschema header       |

Evidence: `app/config.py:1-49`, `context_guide.json:13-62`

---

## Module Inventory

[EVIDENCE-BASED]

The following logical modules have been identified:

| Module              | Location                                              | Status   |
| ------------------- | ----------------------------------------------------- | -------- |
| Authentication      | `app/api/v1/auth/`, `app/service/auth/`               | Complete |
| SuperAdmin          | `app/api/v1/super_admin/`, `app/service/super_admin/` | Complete |
| Student Management  | `app/api/v1/student/`, `app/service/student/`         | Complete |
| Fee Management      | `app/api/v1/fee/`, `app/service/fee/`                 | Complete |
| Expense Management  | `app/api/v1/expense/`, `app/service/expense/`         | Complete |
| Masters (Core Data) | `app/api/v1/masters/`, `app/service/masters/`         | Complete |
| Reports             | `app/api/v1/reports/`, `app/service/reports/`         | Complete |
| Admin               | `app/api/v1/admin/`, `app/service/admin/`             | Complete |
| Profile             | `app/api/v1/profile/`, `app/service/profile/`         | Complete |
| Public (System)     | `app/api/v1/public/`, `app/service/public/`           | Complete |

Evidence: `app/api/v1/main_router.py:1-128`, folder structure analysis

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked as [INFERENCE] or [UNCERTAIN].
