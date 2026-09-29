# FastAPI Code Review Command

## Purpose

Comprehensive code review for COS360 FastAPI multi-tenant application focusing on best practices, security, and performance.

## Usage

`/api-review [file_path]` - Review specific file or current working files

## Review Checklist

### FastAPI Best Practices

- [ ] **Async/Await Usage**

  - All database operations use `async def` and `await`
  - Proper use of `AsyncSession` from SQLAlchemy
  - No blocking I/O operations in async functions

- [ ] **Dependency Injection**

  - Database sessions injected via `Depends(get_tenant_db)`
  - Authentication handled via dependency injection
  - Proper use of FastAPI's dependency system

- [ ] **Response Models**
  - All endpoints specify `response_model` parameter
  - Pydantic schemas used for request/response validation
  - Proper HTTP status codes (201 for creation, 200 for updates, etc.)

### Database Patterns (COS360-Specific)

- [ ] **Multi-Tenant Compliance**

  - Uses tenant-specific database sessions
  - Proper schema isolation maintained
  - No cross-tenant data leakage

- [ ] **Database Refresh Pattern**

  - Uses `flush() → select() → commit()` pattern for operations returning objects
  - Avoids `commit() → refresh()` pattern that causes multi-tenant issues
  - Proper relationship loading with `selectinload()`

- [ ] **SQLAlchemy Best Practices**
  - UUID primary keys with proper generation
  - Timestamps (`created_at`, `updated_at`) included
  - Relationships use `back_populates`
  - Proper foreign key constraints

### Security Review

- [ ] **Authentication & Authorization**

  - All business endpoints protected with JWT authentication
  - Dual-layer permission checking (plan + role permissions)
  - Super Admin bypass logic properly implemented
  - No sensitive data in logs or responses

- [ ] **Input Validation**

  - Pydantic schemas validate all inputs
  - SQL injection protection via SQLAlchemy ORM
  - Proper UUID validation for IDs
  - No raw SQL queries without parameterization

- [ ] **Multi-Tenant Security**
  - Tenant isolation enforced at database level
  - No tenant data accessible from other tenants
  - Proper tenant context validation

### API Design

- [ ] **REST Conventions**

  - Proper HTTP methods (GET, POST, PUT, DELETE)
  - Consistent URL patterns (`/api/v1/resource/`)
  - Meaningful endpoint naming
  - Proper use of HTTP status codes

- [ ] **Error Handling**

  - HTTPException used for API errors
  - Proper error messages and status codes
  - Consistent error response format
  - Database rollback on errors

- [ ] **Documentation**
  - Endpoint docstrings present
  - Response models documented
  - API versioning consistent

### Performance Considerations

- [ ] **Database Optimization**

  - Efficient queries with proper joins
  - Relationship eager loading where needed
  - Pagination implemented for list endpoints
  - No N+1 query problems

- [ ] **Caching**
  - Dropdown endpoints use caching where appropriate
  - Cache invalidation on data updates
  - Redis integration properly configured

### Testing Coverage

- [ ] **Test Structure**
  - Unit tests for service functions
  - Integration tests for API endpoints
  - Multi-tenant test scenarios
  - Authentication and permission tests

## COS360-Specific Checks

### Permission System

- [ ] **Dual-Layer Validation**
  - Plan permissions checked first
  - Role permissions checked second
  - Super Admin bypass implemented
  - Proper error messages for permission failures

### Fee Management

- [ ] **Business Logic**
  - Fee calculation accuracy
  - Academic year validation
  - Class and student mapping integrity
  - Term amount calculations

### Academic Operations

- [ ] **Data Integrity**
  - Academic year consistency
  - Student enrollment validation
  - Staff assignment validation
  - Timetable conflict detection

## Output Format

Provide detailed findings with:

1. **Security Issues** (High/Medium/Low priority)
2. **Performance Concerns**
3. **Code Quality Issues**
4. **Best Practice Violations**
5. **COS360-Specific Issues**
6. **Recommendations for improvement**

## Example Usage

```
/api-review app/api/v1/fee/fee_category_endpoints.py
```

This will review the fee category endpoints for all checklist items and provide specific recommendations for the COS360 multi-tenant architecture.
