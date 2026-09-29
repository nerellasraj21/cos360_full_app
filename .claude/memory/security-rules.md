# Security Rules and Patterns for COS360

## Authentication Security Rules

### JWT Token Security
**Rule**: All business endpoints must validate JWT tokens and extract user context.

**Implementation Pattern**:
```python
# Required for all protected endpoints
current_user = await get_current_user_token(request)
role = current_user.get('role')
user_type = current_user.get('user_type')
```

**Token Validation Rules**:
- Verify token signature with secret key
- Check token expiration timestamp
- Validate token structure and required claims
- Extract user context (role, tenant, permissions)

### User Type Hierarchy
**Rule**: Implement strict user type hierarchy with proper access controls.

**Hierarchy Levels**:
1. **Super Admin**: System-wide access, bypasses all restrictions
2. **Tenant Admin**: Organization-scoped admin within single tenant
3. **Regular Users**: Role-based access within single tenant

**Access Matrix**:
```
Super Admin: Can access ANY tenant's data + system management
Tenant Admin: Can access ONLY their tenant's data + user management
Regular User: Can access ONLY their tenant's data based on role permissions
```

## Permission System Security

### Dual-Layer Permission Validation
**Rule**: All business endpoints must check BOTH plan permissions AND role permissions.

**Security Pattern**:
```python
# Step 1: Check if user type allows bypass
if user_type == "super_admin":
    # Super Admin bypasses all permission checks
    pass
else:
    # Step 2: Dual-layer validation for all other users
    await check_role_plan_permission_with_error(
        db, request, role, 'resource_name', 'action'
    )
```

**Permission Logic**:
```
Access Granted = (Plan Allows Resource) AND (Role Has Permission)
```

### Resource Permission Matrix
**Rule**: All 34+ business resources must have explicit permissions defined.

**Resource Categories**:
- **Fee Management**: fee_categories, fee_types, fee_terms, etc.
- **Student Management**: student_admissions, student_attendance, etc.
- **Staff Management**: staff, designations, etc.
- **Academic Operations**: academic_years, classes, subjects, etc.
- **Transport Management**: routes, vehicles, trips, etc.

**Action Types**: create, read, update, delete, list

## Multi-Tenant Security Rules

### Tenant Isolation
**Rule**: Ensure complete data isolation between tenants at all levels.

**Database Security**:
```python
# Always use tenant-specific database sessions
db: AsyncSession = Depends(get_tenant_db)

# NEVER use direct database access without tenant context
```

**Header Validation**:
- Validate `cschema` header for tenant identification
- Ensure header matches user's tenant context
- Block cross-tenant access attempts

### Schema Context Security
**Rule**: Maintain tenant schema context throughout request lifecycle.

**Context Validation**:
```python
# Verify user belongs to requested tenant
if user_type != "super_admin":
    user_tenant = current_user.get('schema_name')
    request_tenant = request.headers.get('cschema')

    if user_tenant != request_tenant:
        raise HTTPException(status_code=403, detail="Cross-tenant access denied")
```

## Data Security Rules

### Input Validation Security
**Rule**: Validate all inputs at multiple layers to prevent injection attacks.

**Validation Layers**:
1. **Pydantic Schemas**: Type and format validation
2. **UUID Validation**: Ensure proper UUID format for IDs
3. **Business Logic**: Domain-specific validation rules
4. **Database Constraints**: Final validation layer

**SQL Injection Prevention**:
```python
# ALWAYS use SQLAlchemy ORM queries
result = await db.execute(select(Entity).where(Entity.id == entity_id))

# NEVER use raw SQL with string formatting
# BAD: f"SELECT * FROM table WHERE id = '{user_input}'"
```

### Data Sanitization
**Rule**: Sanitize all user inputs and outputs to prevent XSS and data leakage.

**Input Sanitization**:
- Trim whitespace from string inputs
- Validate data types and ranges
- Check for malicious patterns in text fields
- Encode special characters appropriately

**Output Sanitization**:
- Remove sensitive data from API responses
- Use Pydantic response models for consistent output
- Log sensitive operations without exposing data

## Password and Authentication Security

### Password Security Rules
**Rule**: Implement strong password policies and secure storage.

**Password Requirements**:
- Minimum 8 characters length
- Mix of uppercase, lowercase, numbers
- Hash passwords using bcrypt with salt
- No password storage in logs or responses

**Session Security**:
```python
# JWT token configuration
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Short-lived tokens
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Limited refresh window
```

### Account Security
**Rule**: Implement account protection mechanisms.

**Security Measures**:
- Rate limiting on authentication endpoints
- Account lockout after failed attempts
- Audit logging for authentication events
- Secure password reset procedures

## API Security Rules

### Endpoint Protection
**Rule**: All business endpoints must be protected with authentication and authorization.

**Protection Pattern**:
```python
@router.post("/", response_model=EntityOut)
async def create_entity(
    entity_data: EntityCreate,
    request: Request,  # Required for user context
    db: AsyncSession = Depends(get_tenant_db)  # Required for tenant isolation
):
    # Authentication check
    current_user = await get_current_user_token(request)

    # Authorization check
    await check_role_plan_permission_with_error(
        db, request, current_user.get('role'), 'resource_name', 'create'
    )
```

### CORS Security
**Rule**: Configure CORS appropriately for development and production environments.

**Development CORS**:
```python
allow_origins=["*"]  # Permissive for development
```

**Production CORS**:
```python
allow_origins=["https://yourdomain.com"]  # Restrictive for production
```

## Audit and Logging Security

### Audit Trail Requirements
**Rule**: Log all security-relevant events for compliance and monitoring.

**Events to Log**:
- Authentication attempts (success/failure)
- Permission denials and access violations
- Data modification operations
- Super Admin actions across tenants
- System configuration changes

**Audit Pattern**:
```python
# Log security events
logger.info(f"User {username} accessed {resource} with action {action}")

# Log Super Admin cross-tenant access
logger.warning(f"Super Admin {username} accessed tenant {tenant_name} data")
```

### Sensitive Data Protection
**Rule**: Never log sensitive data or expose it in error messages.

**Protected Data**:
- Passwords and password hashes
- JWT tokens and secrets
- Personal identification information
- Financial data and payment information
- System configuration secrets

## Error Handling Security

### Secure Error Responses
**Rule**: Return consistent error responses without exposing system internals.

**Error Pattern**:
```python
try:
    # Business logic
    pass
except SpecificException as e:
    # Log detailed error internally
    logger.error(f"Database error: {str(e)}")

    # Return generic error to client
    raise HTTPException(status_code=500, detail="Internal server error")
```

### Information Disclosure Prevention
**Rule**: Prevent information leakage through error messages.

**Safe Error Messages**:
- "Resource not found" (instead of "Table X does not exist")
- "Access denied" (instead of "User lacks permission Y")
- "Invalid input" (instead of "Column Z constraint violation")

## Database Security Rules

### Connection Security
**Rule**: Use secure database connections with proper authentication.

**Connection Security**:
```python
DATABASE_URL = "postgresql+asyncpg://user:pass@host/db?ssl=require"
```

**Connection Pooling Security**:
- Use connection pooling to prevent resource exhaustion
- Set appropriate pool size limits
- Enable connection recycling
- Monitor connection usage patterns

### Transaction Security
**Rule**: Implement proper transaction boundaries to maintain data consistency.

**Transaction Pattern**:
```python
try:
    # All related operations in single transaction
    await db.commit()
except Exception:
    # Always rollback on error
    await db.rollback()
    raise
```

## Environment Security Rules

### Secret Management
**Rule**: Never commit secrets to version control or expose them in code.

**Secret Handling**:
- Store secrets in environment variables
- Use different secrets for different environments
- Rotate secrets regularly
- Use secure secret management services

**Environment Variables**:
```bash
# Production secrets
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET_KEY=random-secure-key
SECRET_KEY=another-random-key
```

### Development vs Production Security
**Rule**: Maintain different security configurations for different environments.

**Development**:
- Relaxed CORS policies
- Detailed error messages
- Debug logging enabled
- Test data and credentials

**Production**:
- Strict CORS policies
- Generic error messages
- Info-level logging
- Production credentials and secrets

## Compliance and Monitoring

### Security Monitoring
**Rule**: Implement continuous security monitoring and alerting.

**Monitoring Areas**:
- Failed authentication attempts
- Permission violations
- Unusual data access patterns
- Cross-tenant access attempts
- System configuration changes

### Compliance Requirements
**Rule**: Ensure all security measures meet compliance requirements.

**Compliance Areas**:
- Data protection regulations (GDPR, etc.)
- Educational data privacy laws
- Financial data security standards
- Audit trail requirements
- Data retention policies

## Security Testing Rules

### Security Test Requirements
**Rule**: Include security testing in all development workflows.

**Security Tests**:
- Authentication bypass attempts
- Authorization violation tests
- Cross-tenant access prevention
- Input validation and injection tests
- Session management security tests

**Test Pattern**:
```python
async def test_cross_tenant_access_prevention():
    # Attempt to access tenant A data from tenant B context
    response = await client.get(
        "/api/v1/tenant-a-resource/",
        headers={"Authorization": f"Bearer {tenant_b_token}"}
    )
    assert response.status_code == 403
```