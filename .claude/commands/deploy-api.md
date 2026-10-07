# FastAPI Deployment Checklist Command

## Purpose
Comprehensive deployment workflow for COS360 FastAPI multi-tenant application with production readiness validation.

## Usage
`/deploy-api [environment] [stage]` - Execute deployment workflow

## Pre-Deployment Validation

### 1. Code Quality Checks
```bash
# Lint and format with the versions pinned in requirements-dev.txt (from backend/)
ruff check .
black --check .
```

### 2. Test Suite Execution
```bash
# From backend/, against the local database only (docs/operations/testing.md)
pytest tests/unit/
pytest tests/integration -m integration
pytest tests/api -m api        # needs the QA tenant and scripts/qa/run_test_api.py (docs/testing/test-environment.md)
```

### 3. Security Validation
- [ ] **Environment Variables**: No hardcoded secrets in code
- [ ] **JWT Configuration**: Secure token generation and validation
- [ ] **CORS Settings**: Proper origin restrictions for production
- [ ] **Rate Limiting**: API abuse prevention configured
- [ ] **Input Validation**: All endpoints validate input data

### 4. Database Preparation

#### Backup
Back up the shared database as described in the Backups section of `docs/operations/database-migrations.md` (a Neon branch or a `pg_dump` against the direct host).

#### Migrations
Apply pending revisions with the `/migration` workflow (`.claude/commands/migration.md`): one `alembic upgrade head` as the owner role (`MIGRATION_DATABASE_URL`). The database must be migrated **before** the new code is deployed, or queries on new tables/columns return 500.
```powershell
alembic heads; alembic current
```

## Deployment Process

### 5. Environment Configuration

#### Production Environment Variables
```bash
# Required environment variables for production (names and full list: docs/operations/backend-deploy.md)
DATABASE_URL=<app role URL, postgresql+asyncpg form, never the owner or a superuser>
REDIS_URL=redis://localhost:6379
SECRET_KEY=<secure-random-key>
JWT_SECRET_KEY=<secure-jwt-key>
ALLOWED_ORIGINS=["https://your-domain.com"]
DEBUG=False
ENVIRONMENT=production
LOG_LEVEL=INFO
```

#### Security Configuration
- [ ] **HTTPS Enforcement**: All traffic uses SSL/TLS
- [ ] **Database SSL**: PostgreSQL connections use SSL
- [ ] **Secure Headers**: Security headers configured in middleware
- [ ] **API Documentation**: Protected or disabled in production

### 6. Application Build

#### Docker Deployment (if applicable)
```bash
# Build production image
docker build -t cos360:latest .

# Run with production configuration
docker run -d \
  --name cos360-api \
  --env-file .env.production \
  -p 8000:8000 \
  cos360:latest
```

#### Direct Deployment
```bash
# Install dependencies
pip install -r requirements.txt

# Start with production server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 7. Health Checks

#### Application Health
```bash
# Test basic health endpoint
curl -f http://localhost:8000/health

# Test tenant lookup (no token needed; 404 means unknown tenant)
curl -f -H "cschema: <client_name>" http://localhost:8000/api/v1/auth/academic-years
```

#### Performance Validation
- [ ] **Response Times**: API responses < 500ms for standard operations
- [ ] **Database Performance**: Query execution times acceptable
- [ ] **Memory Usage**: Application memory consumption within limits
- [ ] **CPU Usage**: Acceptable CPU utilization under load

### 8. Security Verification

#### Authentication Testing
```bash
# Test tenant authentication
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "cschema: <client_name>" \
  -d '{"username": "<admin user>", "password": "<password>", "academic_year_id": "<id from /auth/academic-years>"}'

# Verify JWT token validation (the tenant comes from the token; no cschema needed)
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/fee/categories/
```

#### Permission System Verification
- [ ] **Plan Permissions**: Verify plan-based access restrictions
- [ ] **Role Permissions**: Test role-based access control
- [ ] **Super Admin Access**: Verify cross-tenant access capabilities
- [ ] **Tenant Isolation**: Confirm data isolation between tenants

### 9. Monitoring Setup

#### Application Monitoring
```python
# Add monitoring endpoints
@app.get("/metrics")
async def get_metrics():
    return {
        "uptime": get_uptime(),
        "memory_usage": get_memory_usage(),
        "database_connections": get_db_connection_count(),
        "active_tenants": get_active_tenant_count()
    }
```

#### Log Configuration
- [ ] **Log Levels**: Appropriate logging levels for production
- [ ] **Log Format**: Structured logging for analysis
- [ ] **Log Retention**: Proper log rotation and retention
- [ ] **Error Tracking**: Comprehensive error logging

### 10. Post-Deployment Verification

#### Functional Testing
```bash
# Test critical business operations
# Fee Management
curl -X POST http://localhost:8000/api/v1/fee/categories/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"category_name": "Tuition", "academic_year_id": "<uuid>"}'

# Student Management
curl -X GET http://localhost:8000/api/v1/student/admissions/ \
  -H "Authorization: Bearer <token>"

# Staff Management
curl -X GET http://localhost:8000/api/v1/masters/staff/ \
  -H "Authorization: Bearer <token>"
```
Run write checks only against a test tenant, never a live school.

#### Data Integrity Verification
- [ ] **Database Constraints**: All foreign keys and constraints intact
- [ ] **Data Consistency**: No orphaned records or inconsistencies
- [ ] **Multi-Tenant Data**: Proper data isolation maintained
- [ ] **Backup Integrity**: Recent backups are valid and restorable

## COS360-Specific Deployment Considerations

### Multi-Tenant Architecture
1. **Shared schema**: One database and one `alembic_version`; every tenant table has forced row-level security
2. **Tenant Detection**: `cschema` picks the tenant at login; afterwards the token's `tenant_id` does, and a disagreeing header gets 403
3. **Database Roles**: The API connects as the app role (no owner, no superuser, no `BYPASSRLS`)
4. **Permission Synchronization**: Verify plan and role permissions are synchronized

### Business Operations
1. **Fee Management**: Critical for school operations
2. **Student Admissions**: Core functionality validation
3. **Academic Year Management**: Ensure year transitions work correctly
4. **Transport Management**: Validate route and vehicle assignments

### Performance Considerations
1. **Database Connection Pooling**: Size uvicorn workers against the Neon connection limit (see backend-deploy doc)
2. **Cache Configuration**: Redis caching for dropdown data
3. **Query Optimization**: Indexes on tenant tables lead with `tenant_id`
4. **API Response Times**: Acceptable performance for real-time operations

## Rollback Plan

### Emergency Rollback
```bash
# Stop current application
kill -TERM $APP_PID

# Restore previous version
git checkout <previous_commit>

# Restore database backup if needed
psql -h hostname -U username -d database < backup_pre_deploy.sql

# Restart application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Database Rollback
```powershell
alembic downgrade <previous_revision>; alembic current
```

## Monitoring and Alerting

### Key Metrics to Monitor
- [ ] **API Response Times**: Average response time < 500ms
- [ ] **Error Rate**: Error rate < 1%
- [ ] **Database Performance**: Query execution times
- [ ] **Memory Usage**: Application memory consumption
- [ ] **Active Users**: Concurrent user sessions
- [ ] **Tenant Activity**: Per-tenant usage metrics

### Alert Conditions
- API error rate > 5%
- Average response time > 1000ms
- Database connection failures
- Memory usage > 80%
- Disk space < 20%

## Post-Deployment Tasks

### Documentation Updates
- [ ] Update API documentation
- [ ] Record deployment notes
- [ ] Update configuration documentation
- [ ] Update monitoring dashboards

### Communication
- [ ] Notify stakeholders of successful deployment
- [ ] Update status page if applicable
- [ ] Schedule post-deployment review
- [ ] Document lessons learned

## Example Usage
```bash
# Full production deployment
/deploy-api production --full-check

# Staging deployment
/deploy-api staging --skip-security-scan

# Quick deployment with minimal checks
/deploy-api production --quick
```

## Output Format
Provide deployment report including:
1. **Pre-deployment validation results**
2. **Migration status and results**
3. **Security verification results**
4. **Performance metrics**
5. **Post-deployment verification status**
6. **Any issues or warnings encountered**
7. **Rollback procedures if needed**