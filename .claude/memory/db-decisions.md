# Database Architecture Decisions for COS360

## Multi-Tenant Architecture Choice

### Schema-Per-Tenant Approach
**Decision**: Use separate database schemas for each tenant instead of shared tables with tenant_id columns.

**Reasoning**:
- **Data Isolation**: Complete separation prevents data leakage between tenants
- **Performance**: No need for tenant_id filtering in every query
- **Compliance**: Easier to meet data sovereignty requirements
- **Scalability**: Individual schema optimization per tenant
- **Security**: Physical separation reduces cross-tenant attack vectors

**Implementation**:
```
Database: neondb
├── public schema (system-wide data)
│   ├── tenants (tenant registry)
│   ├── plans (subscription plans)
│   ├── menus (application menus)
│   └── plan_resource_access (plan permissions)
├── cos360_main (primary tenant schema)
├── test_tenant_schema (test tenant)
└── {client_name}_schema (additional tenants)
```

## Database Refresh Pattern Decision

### The Flush-Select-Commit Pattern
**Decision**: Use `flush() → select() → commit()` instead of `commit() → refresh()` for operations returning objects.

**Problem Solved**: The `refresh()` method in SQLAlchemy breaks multi-tenant schema context, causing cross-tenant data contamination.

**Critical Implementation**:
```python
# CORRECT - Multi-tenant safe
await db.flush()  # Write to database but don't commit
result = await db.execute(select(Entity).where(Entity.id == entity.id))
fresh_entity = result.scalar_one()
await db.commit()  # Commit transaction
return fresh_entity

# WRONG - Breaks tenant isolation
await db.commit()
await db.refresh(entity)  # This breaks schema context
return entity
```

**Applied Everywhere**: All service functions that return objects use this pattern.

## UUID Primary Keys Decision

### Universal UUID Usage
**Decision**: All entities use UUID primary keys instead of auto-incrementing integers.

**Benefits**:
- **Security**: No enumeration attacks possible
- **Multi-tenant Safe**: No ID conflicts between tenants
- **Distributed Systems**: Globally unique identifiers
- **API Security**: Unpredictable resource identifiers

**Implementation**:
```python
id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
```

## Permission System Architecture

### Dual-Layer Permission Model
**Decision**: Implement two-layer permission checking (Plan + Role) instead of single-layer.

**Layer 1 - Plan Permissions (Public Schema)**:
- Controls which features are available to the organization
- Managed by Super Admin only
- Stored in `public.plan_resource_access`

**Layer 2 - Role Permissions (Tenant Schema)**:
- Controls which users can access available features
- Managed by Tenant Admin (or Super Admin)
- Stored in `{tenant}.resource_permissions`

**Access Formula**: `User Access = Plan Permissions ∩ Role Permissions`

## Database Migration Strategy

### Multi-Tenant Migration Approach
**Decision**: Use Python migration manager for Windows environments instead of direct Alembic commands.

**Problem**: Windows environment variables don't persist across command chains, causing migration failures.

**Solution**:
```python
# migrate_tenants.py handles all tenant migrations
python migrate_tenants.py --action sync-all  # Apply to all tenants
python migrate_tenants.py --schema cos360_main --action upgrade
```

**Migration Order**:
1. Apply to main schema first
2. Verify successful application
3. Sync all tenant schemas
4. Verify synchronization across all tenants

## Connection Pooling Decision

### Async SQLAlchemy with Connection Pooling
**Decision**: Use SQLAlchemy 2.0 async engine with proper connection pooling for multi-tenant access.

**Configuration**:
```python
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
    pool_recycle=3600  # Recycle connections every hour
)
```

**Tenant Session Management**:
- Dynamic schema switching per request
- Connection reuse across same-tenant requests
- Automatic cleanup and isolation

## Index Strategy Decision

### Strategic Index Placement
**Decision**: Create indexes based on query patterns and multi-tenant performance requirements.

**Standard Indexes**:
- UUID primary keys (automatic)
- Foreign key columns for relationships
- Frequently filtered columns (status, academic_year_id)
- Composite indexes for common query patterns

**Multi-Tenant Considerations**:
- Indexes created per tenant schema
- No cross-tenant index optimization needed
- Schema-specific performance tuning possible

## Timestamp Management Decision

### Automatic Timestamp Tracking
**Decision**: Include `created_at` and `updated_at` timestamps in all business entities.

**Implementation**:
```python
created_at = Column(DateTime(timezone=True), server_default=func.now())
updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

**Benefits**:
- Audit trail capability
- Data lifecycle tracking
- Debugging and troubleshooting support
- Compliance requirements satisfaction

## Foreign Key Constraint Strategy

### Strict Referential Integrity
**Decision**: Enforce foreign key constraints at database level with proper cascade behaviors.

**Patterns**:
- Use meaningful constraint names
- Implement proper cascade delete where appropriate
- Check dependencies before deletion in service layer
- Use `back_populates` for bidirectional relationships

## Data Seeding Strategy

### Environment-Specific Seeding
**Decision**: Separate data seeding strategies for development, testing, and production.

**Development**: Full sample data with realistic volumes
**Testing**: Minimal consistent test fixtures
**Production**: Essential system data only (plans, menus, super admin)

**Implementation**:
- SQL scripts for initial system data
- Python fixtures for test data
- Alembic migrations for schema changes
- Manual scripts for production data updates

## Backup and Recovery Strategy

### Multi-Tenant Backup Approach
**Decision**: Schema-aware backup strategy for tenant isolation.

**Backup Command**:
```bash
pg_dump -h hostname -U username -d database \
  --schema=public \
  --schema=cos360_main \
  --schema=test_tenant_schema \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Recovery Considerations**:
- Per-tenant recovery capability
- System-wide recovery procedures
- Point-in-time recovery for individual tenants
- Cross-tenant data integrity verification

## Transaction Management Decision

### Explicit Transaction Boundaries
**Decision**: Use explicit transaction management with proper error handling and rollback.

**Pattern**:
```python
try:
    # Database operations
    await db.commit()
    return result
except Exception as e:
    await db.rollback()
    raise HTTPException(status_code=500, detail=str(e))
```

**Key Points**:
- Always rollback on exceptions
- Use appropriate transaction scope
- Avoid long-running transactions
- Proper error propagation

## Performance Monitoring Decision

### Query Performance Tracking
**Decision**: Enable SQLAlchemy query logging and monitoring for performance optimization.

**Monitoring Areas**:
- Query execution times
- N+1 query detection
- Connection pool utilization
- Schema-specific performance metrics
- Multi-tenant query efficiency

## Data Validation Strategy

### Multi-Layer Validation
**Decision**: Implement validation at multiple layers for data integrity.

**Validation Layers**:
1. **Pydantic Schemas**: Request/response validation
2. **SQLAlchemy Models**: Database constraints
3. **Service Layer**: Business logic validation
4. **Database**: Foreign key and check constraints

This ensures data integrity across all system boundaries while maintaining performance and security.