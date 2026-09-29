# Database Migration Workflow Command

## Purpose
Comprehensive database migration workflow for COS360 multi-tenant system with Alembic integration.

## Usage
`/migration [action] [schema_name]` - Execute migration workflow

## Migration Actions

### Pre-Migration Analysis
```bash
# Check current migration status
alembic current
python migrate_tenants.py --schema cos360_main --action current
python migrate_tenants.py --schema test_tenant_schema --action current

# Verify schema synchronization
python migrate_tenants.py --action sync-all --dry-run
```

### Migration Creation Workflow

#### 1. Model Analysis
- [ ] Review SQLAlchemy model changes
- [ ] Validate foreign key relationships
- [ ] Check for breaking changes
- [ ] Verify UUID field consistency
- [ ] Confirm multi-tenant compatibility

#### 2. Generate Migration
```bash
# Create auto-generated migration
alembic revision --autogenerate -m "descriptive_migration_name"

# Review generated migration file
# Check for:
# - Proper table names
# - Correct data types
# - Foreign key constraints
# - Index creation
# - Multi-tenant considerations
```

#### 3. Migration Validation
- [ ] Review migration SQL for correctness
- [ ] Check for data loss potential
- [ ] Verify backwards compatibility
- [ ] Test on development database first
- [ ] Validate schema changes don't break existing queries

### Migration Application Workflow

#### 4. Backup Strategy
```bash
# For production (Neon database)
pg_dump -h ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech \
        -U neondb_owner \
        -d neondb \
        --schema=public \
        --schema=cos360_main \
        --schema=test_tenant_schema \
        > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 5. Apply Migrations (Multi-Tenant)
```bash
# Apply to main schema first
python migrate_tenants.py --schema cos360_main --action upgrade --target head

# Verify successful application
python migrate_tenants.py --schema cos360_main --action current

# Apply to all tenant schemas
python migrate_tenants.py --action sync-all

# Verify all schemas are synchronized
python migrate_tenants.py --action verify-sync
```

### Post-Migration Verification

#### 6. Data Integrity Checks
- [ ] Verify all tables exist in all schemas
- [ ] Check foreign key constraints
- [ ] Validate data consistency
- [ ] Test critical business operations
- [ ] Verify multi-tenant isolation

#### 7. Application Testing
```bash
# Start application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8003

# Test critical endpoints
curl -H "cschema: test_tenant" http://localhost:8003/api/v1/fee/categories/
curl -H "cschema: cos360_main" http://localhost:8003/api/v1/masters/academic-years/
```

### Rollback Procedures

#### 8. Emergency Rollback
```bash
# Identify previous migration
alembic history

# Rollback to specific revision
python migrate_tenants.py --schema cos360_main --action downgrade --target <revision_id>
python migrate_tenants.py --action sync-all --target <revision_id>

# Restore from backup if needed
psql -h hostname -U username -d database < backup_file.sql
```

## COS360-Specific Migration Considerations

### Multi-Tenant Schema Management
- **Public Schema**: System-wide tables (tenants, plans, menus)
- **Tenant Schemas**: Business data (users, students, fees, etc.)
- **Schema Isolation**: Each tenant has completely isolated data

### Common Migration Scenarios

#### 1. Adding New Business Feature
```python
# Example: Adding new field to existing model
class Student(BaseOrg):
    # ... existing fields
    emergency_contact = Column(String(255), nullable=True)  # New field
```

#### 2. Creating New Module
- Create models in appropriate module (e.g., `app/models/new_module/`)
- Create schemas in `app/schemas/new_module/`
- Create services in `app/service/new_module/`
- Add API endpoints in `app/api/v1/new_module/`

#### 3. Permission System Updates
- Update `public.plan_resource_access` for new resources
- Update tenant schema `resource_permissions` tables
- Sync menu permissions if needed

### Migration Best Practices for COS360

#### Schema Design
- [ ] Use UUID primary keys consistently
- [ ] Include created_at/updated_at timestamps
- [ ] Proper foreign key relationships with back_populates
- [ ] Inherit from BaseOrg (tenant) or BasePublic (system-wide)

#### Data Migration
- [ ] Handle existing data gracefully
- [ ] Provide default values for new required fields
- [ ] Consider data transformation needs
- [ ] Test with production-like data volumes

#### Performance Considerations
- [ ] Add indexes for frequently queried fields
- [ ] Consider impact on existing queries
- [ ] Test migration time on large datasets
- [ ] Plan for minimal downtime

## Troubleshooting

### Common Issues
1. **Schema Out of Sync**: Use `alembic stamp <revision>` to mark migration as applied
2. **Permission Errors**: Ensure database user has proper schema permissions
3. **Environment Variables**: Use PowerShell method for Windows environments
4. **Foreign Key Violations**: Check data integrity before migration

### Windows-Specific Notes
```powershell
# Set environment for production
$env:DATABASE_URL='postgresql+asyncpg://<user>:<password>@<neon-host>/neondb?ssl=require'

# Run migration commands
python migrate_tenants.py --action sync-all
```

## Output Format
Provide migration report including:
1. **Pre-migration status** of all schemas
2. **Migration steps executed** with results
3. **Post-migration verification** results
4. **Any warnings or issues** encountered
5. **Recommended next steps**