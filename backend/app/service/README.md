# Service Layer Documentation

This directory contains the business logic layer for the COS360 multi-tenant school management system.

## Architecture

The service layer implements the business logic patterns following the COS360 database refresh pattern:
- `flush() → select() → commit()` for multi-tenant compatibility
- Proper relationship loading with `selectinload`
- Comprehensive error handling with rollback mechanisms

## Key Services

### Student Services (`student/`)
- **admission_service.py**: Student enrollment and parent management
- Implements parent email sharing functionality for multi-child families

### Authentication Services (`auth/`)
- Multi-tenant authentication and authorization
- Role-based permission management

### Master Data Services (`masters/`)
- Academic configuration and master data management
- Staff, class, and academic year management

### Fee Management Services (`fee/`)
- Fee structure and payment management
- Multi-tenant fee processing

### Super Admin Services (`super_admin/`)
- Cross-tenant system administration
- Tenant and plan management

## Recent Updates

### Parent Email Sharing Implementation (2025-01-19)

**Feature**: Multiple children can now share the same parent email addresses during enrollment.

**Changes Made**:
1. **Enhanced Email Validation** (`student/admission_service.py`):
   - Allows parent email reuse for existing Parent role users
   - Prevents role conflicts (blocks Staff/Student emails being used as parent emails)
   - Maintains security by validating user roles

2. **Smart Parent User Management**:
   - Reuses existing parent User records when email matches
   - Links to existing Parent records instead of creating duplicates
   - Prevents duplicate parent data while maintaining relationships

3. **Relationship Management**:
   - Prevents duplicate StudentParentLink records
   - Maintains proper parent-child associations
   - Supports multiple children per parent seamlessly

**Business Impact**:
- Families with multiple children can use same parent contact information
- Eliminates data duplication for parent records
- Maintains data integrity and security standards
- Backward compatible with existing single-child enrollments

**Error Messages**:
- `"Email {email} is already registered to a {role}, not a parent"` - Role conflict prevention
- `"Father and mother cannot have the same email address"` - Same-admission validation

## Database Refresh Pattern

All service functions follow the established refresh pattern:

```python
async def service_function(db: AsyncSession, data: Schema):
    try:
        # Create entity
        entity = Entity(**data.dict())
        db.add(entity)
        await db.flush()

        # Load with relationships before commit
        result = await db.execute(
            select(Entity)
            .options(selectinload(Entity.relationships))
            .where(Entity.id == entity.id)
        )
        loaded_entity = result.scalar_one()

        await db.commit()
        return loaded_entity
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
```

## Testing

Service layer functions should be tested with:
- Multi-tenant scenarios
- Database transaction rollback scenarios
- Permission validation tests
- Relationship loading verification

## Dependencies

- SQLAlchemy 2.0 with AsyncSession
- FastAPI for HTTP exception handling
- UUID for primary keys
- Role-based permission validation