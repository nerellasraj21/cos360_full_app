# FastAPI Deployment Checklist Command

## Purpose
Comprehensive deployment workflow for COS360 FastAPI multi-tenant application with production readiness validation.

## Usage
`/deploy-api [environment] [stage]` - Execute deployment workflow

## Pre-Deployment Validation

### 1. Code Quality Checks
```bash
# Run linting and formatting
black app/ --check
flake8 app/
mypy app/

# Security scanning
bandit -r app/
safety check
```

### 2. Test Suite Execution
```bash
# Run comprehensive test suite
pytest --cov=app --cov-report=html --cov-fail-under=80

# Run integration tests
pytest tests/integration/ -v

# Performance testing
locust -f tests/performance/load_test.py --headless --users 100 --spawn-rate 10 --run-time 300s
```

### 3. Security Validation
- [ ] **Environment Variables**: No hardcoded secrets in code
- [ ] **JWT Configuration**: Secure token generation and validation
- [ ] **CORS Settings**: Proper origin restrictions for production
- [ ] **Rate Limiting**: API abuse prevention configured
- [ ] **Input Validation**: All endpoints validate input data

### 4. Database Preparation

#### Backup
Back up `public`, `cos360_master`, `test_tenant_schema` and `little_bunny` as described in the Backups section of `docs/operations/database-migrations.md`. `cos360_main` (client `default`) is an empty legacy schema and is not backed up or migrated.

#### Migrations
Apply pending revisions with the `/migration` workflow (`.claude/commands/migration.md`): `cos360_master` first, then each live tenant, one schema at a time with `SCHEMA_NAME` set. Every live schema must be migrated **before** the new code is deployed, or queries on new tables/columns return 500 for the schemas that lack them.
```powershell
$env:SCHEMA_NAME='little_bunny'; alembic current
python scripts/diagnose_schema_drift.py
```

## Deployment Process

### 5. Environment Configuration

#### Production Environment Variables
```bash
# Required environment variables for production
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<neon-host>/...
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
  -p 8003:8000 \
  cos360:latest
```

#### Direct Deployment
```bash
# Install dependencies
pip install -r requirements.txt

# Start with production server
uvicorn app.main:app --host 0.0.0.0 --port 8003 --workers 4
```

### 7. Health Checks

#### Application Health
```bash
# Test basic health endpoint
curl -f http://localhost:8003/health

# Test database connectivity
curl -f http://localhost:8003/api/v1/auth/health

# Test multi-tenant functionality
curl -H "cschema: test_tenant" http://localhost:8003/api/v1/fee/categories/
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
curl -X POST http://localhost:8003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "cschema: test_tenant" \
  -d '{"username": "admin", "password": "testpass123"}'

# Verify JWT token validation
curl -H "Authorization: Bearer <token>" \
     -H "cschema: test_tenant" \
     http://localhost:8003/api/v1/fee/categories/
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
curl -X POST http://localhost:8003/api/v1/fee/categories/ \
  -H "Authorization: Bearer <token>" \
  -H "cschema: test_tenant" \
  -H "Content-Type: application/json" \
  -d '{"category_name": "Tuition", "academic_year_id": "<uuid>"}'

# Student Management
curl -X GET http://localhost:8003/api/v1/student/admissions/ \
  -H "Authorization: Bearer <token>" \
  -H "cschema: test_tenant"

# Staff Management
curl -X GET http://localhost:8003/api/v1/masters/staff/ \
  -H "Authorization: Bearer <token>" \
  -H "cschema: test_tenant"
```

#### Data Integrity Verification
- [ ] **Database Constraints**: All foreign keys and constraints intact
- [ ] **Data Consistency**: No orphaned records or inconsistencies
- [ ] **Multi-Tenant Data**: Proper data isolation maintained
- [ ] **Backup Integrity**: Recent backups are valid and restorable

## COS360-Specific Deployment Considerations

### Multi-Tenant Architecture
1. **Schema Management**: Ensure all tenant schemas are properly configured
2. **Tenant Detection**: Verify header-based tenant detection works correctly
3. **Database Sessions**: Confirm tenant-specific database connections
4. **Permission Synchronization**: Verify plan and role permissions are synchronized

### Business Operations
1. **Fee Management**: Critical for school operations
2. **Student Admissions**: Core functionality validation
3. **Academic Year Management**: Ensure year transitions work correctly
4. **Transport Management**: Validate route and vehicle assignments

### Performance Considerations
1. **Database Connection Pooling**: Optimize for multiple tenant schemas
2. **Cache Configuration**: Redis caching for dropdown data
3. **Query Optimization**: Efficient database queries across tenant schemas
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
uvicorn app.main:app --host 0.0.0.0 --port 8003 --workers 4
```

### Database Rollback
```powershell
# Per schema, newest tenant first, cos360_master last
$env:SCHEMA_NAME='<schema>'; alembic downgrade <previous_revision>; alembic current
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