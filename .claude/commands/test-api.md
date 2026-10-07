# API Testing Workflow Command

## Purpose
Comprehensive testing framework for COS360 FastAPI multi-tenant application with focus on business logic validation.

## Usage
`/test-api [module] [coverage]` - Execute comprehensive API testing

## Where the real procedure lives
- Phases, test case IDs and coverage rules: `docs/testing/strategy.md`.
- QA database, `qa_` tenants and the test API on port 8100: `docs/testing/test-environment.md`.
- What is tracked, what CI runs, run commands: `docs/operations/testing.md`.
- API tests and QA scripts run only against the local database and `qa_` tenants. Logins come from `backend/.env.test` (gitignored); never put credentials in commands, tests or docs.

## Testing Strategy

### 1. Unit Tests for Services

#### Service Layer Testing
```bash
# From backend/; unit tests use mocked sessions and need no database
pytest tests/unit/<module>/ -v
```

#### Database Refresh Pattern Testing
- [ ] **Create Operations**: Verify `flush() → select() → commit()` pattern
- [ ] **Update Operations**: Ensure no `commit() → refresh()` usage
- [ ] **Multi-tenant Context**: Test tenant isolation (tenant_id + row-level security)
- [ ] **Relationship Loading**: Validate `selectinload()` usage

### 2. API Endpoint Testing

#### Authentication Testing
```bash
# Test tenant authentication
curl -X POST http://127.0.0.1:8100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "cschema: qa_school" \
  -d '{"username": "<QA_ADMIN_USER>", "password": "<QA_ADMIN_PASSWORD>", "academic_year_id": "<id from /auth/academic-years>"}'

# Test super admin authentication
curl -X POST http://127.0.0.1:8100/api/v1/super_admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "<QA_SUPERADMIN_USER>", "password": "<QA_SUPERADMIN_PASSWORD>"}'
```

#### CRUD Operations Testing
- [ ] **Create (POST)**: Test data creation with validation
- [ ] **Read (GET)**: Test data retrieval with filters
- [ ] **Update (PUT)**: Test partial updates and validation
- [ ] **Delete (DELETE)**: Test cascade deletion and dependencies
- [ ] **List (GET)**: Test pagination and filtering

### 3. Multi-Tenant Testing

#### Tenant Isolation Testing
```python
# Data created in QA_TENANT must be invisible from the second qa_ tenant (QA_B_TENANT, tests/api/support.py)
def test_tenant_isolation(api_a, api_b):
    created = api_a.post("/masters/subjects/", json={...})
    listed = api_b.get("/masters/subjects/")
    assert created["id"] not in [row["id"] for row in listed["items"]]
```
Database-level checks (forced RLS on every tenant table) are in `backend/tests/integration/test_tenant_isolation.py`.

#### Tenant Context Testing
- [ ] **Header Detection**: `cschema` picks the tenant only before login (`/auth/login`, `/auth/academic-years`)
- [ ] **Token Tenant**: Authenticated requests use the token's `tenant_id`; a `cschema` header for another tenant gets 403
- [ ] **Cross-Tenant Prevention**: Ensure no data leakage

### 4. Permission System Testing

#### Dual-Layer Permission Testing
```python
# Test plan + role permission validation
async def test_permission_layers():
    # Test plan permission restriction
    response = await test_endpoint_with_plan("Basic", "fee_categories", "create")
    assert response.status_code == 403

    # Test role permission restriction
    response = await test_endpoint_with_role("Student", "fee_categories", "create")
    assert response.status_code == 403

    # Test successful access
    response = await test_endpoint_with_role("Admin", "fee_categories", "create")
    assert response.status_code == 201
```

#### Super Admin Testing
- [ ] **Bypass Permissions**: Test super admin can access all endpoints
- [ ] **Cross-Tenant Access**: Test access to any tenant's data
- [ ] **System Management**: Test tenant and plan management
- [ ] **Audit Logging**: Verify all actions are logged

### 5. Business Logic Testing

#### Fee Management Testing
```python
# Test fee calculation logic
async def test_fee_calculations():
    # Test fee type creation
    fee_type = await create_fee_type(amount=1000)

    # Test class mapping
    mapping = await create_class_mapping(fee_type_id=fee_type.id, class_id=class_id)

    # Test term amount distribution
    term_amounts = await create_term_amounts(mapping_id=mapping.id)

    # Verify total amount consistency
    assert sum(term.amount for term in term_amounts) == 1000
```

#### Academic Operations Testing
- [ ] **Academic Year Management**: Test activation/deactivation
- [ ] **Student Enrollment**: Test admission process with parent linking
- [ ] **Staff Management**: Test designation assignments
- [ ] **Class Management**: Test section and subject assignments

### 6. Integration Testing

#### Database Integration
```python
# Test database operations with real connections
async def test_database_integration():
    async with get_tenant_db() as db:
        # Test create
        entity = await service.create_entity(db, test_data)
        assert entity.id is not None

        # Test read
        retrieved = await service.get_entity(db, entity.id)
        assert retrieved.id == entity.id

        # Test update
        updated = await service.update_entity(db, entity.id, update_data)
        assert updated.field == update_data.field

        # Test delete
        await service.delete_entity(db, entity.id)
        with pytest.raises(HTTPException):
            await service.get_entity(db, entity.id)
```

#### External Service Integration
- [ ] **JWT Token Validation**: Test token generation and verification
- [ ] **Cache Operations**: Test Redis caching functionality
- [ ] **File Upload**: Test document and certificate uploads
- [ ] **Rate Limiting**: Test API rate limiting functionality

### 7. Performance Testing

#### Database Performance
- [ ] **Query Optimization**: Test N+1 query prevention
- [ ] **Pagination Performance**: Test large dataset pagination
- [ ] **Relationship Loading**: Test eager loading performance
- [ ] **Index Usage**: Verify proper index utilization

### 8. Error Handling Testing

#### Exception Testing
```python
# Test various error scenarios
async def test_error_handling():
    # Test 404 errors
    response = await test_get_nonexistent_entity()
    assert response.status_code == 404

    # Test validation errors
    response = await test_create_with_invalid_data()
    assert response.status_code == 422

    # Test permission errors
    response = await test_unauthorized_access()
    assert response.status_code == 403

    # Test database constraint violations
    response = await test_duplicate_creation()
    assert response.status_code == 400
```

## COS360-Specific Test Scenarios

### Multi-Tenant Business Operations
1. **Fee Collection Workflow**
   - Create fee types for different academic years
   - Assign fees to classes and individual students
   - Process fee payments and generate receipts
   - Test fee refund scenarios

2. **Student Lifecycle Management**
   - Student admission with parent registration
   - Academic year progression
   - Certificate generation and document management
   - Transport assignment and management

3. **Staff Operations**
   - Staff enrollment with role assignment
   - Attendance tracking and reporting
   - Performance evaluation and documentation

### Security Testing
- [ ] **SQL Injection Prevention**: Test with malicious input
- [ ] **JWT Token Security**: Test token expiration and validation
- [ ] **CORS Configuration**: Test cross-origin request handling
- [ ] **Rate Limiting**: Test API abuse prevention

### Data Integrity Testing
- [ ] **Foreign Key Constraints**: Test cascade operations
- [ ] **Unique Constraints**: Test duplicate prevention
- [ ] **Data Validation**: Test Pydantic schema validation
- [ ] **Transaction Rollback**: Test error recovery

## Test Execution Commands

### Run Full Test Suite
```bash
# From backend/ (docs/operations/testing.md)
pytest tests/unit/                              # phase 1, no database
pytest tests/api -m api                         # phase 2, needs scripts/qa/run_test_api.py running
pytest tests/api -m "api and tc" -k FEE-03      # one documented feature
pytest tests/integration -m integration         # local database only
```

There is no performance or load test suite in the repo.

## Test Data Management

### Test Fixtures
Use the session fixtures in `backend/tests/api/conftest.py` (`logins` per role, `academic_year_id`, per-role API clients). They read the QA logins from `backend/.env.test`; never hardcode usernames or passwords.

### Test Database Setup
- [ ] **Isolated Test Database**: The local `cos360_unischema` database and `qa_` tenants only
- [ ] **Baseline**: `python scripts/qa/setup_qa_tenant.py --reset` before a full run
- [ ] **Own Data**: Each test creates rows with unique names and removes them
- [ ] **Cleanup Procedures**: Proper test data cleanup

## Output Format
Provide comprehensive test report including:
1. **Test Summary**: Pass/fail counts and coverage percentage
2. **Performance Metrics**: Response times and throughput
3. **Security Assessment**: Vulnerability test results
4. **Multi-Tenant Validation**: Isolation verification results
5. **Recommendations**: Performance and security improvements

## Example Usage
```bash
# Run complete API test suite
/test-api fee_management --coverage

# Run specific endpoint tests
/test-api student_admissions --integration

# Run performance tests
/test-api --performance --load-test
```