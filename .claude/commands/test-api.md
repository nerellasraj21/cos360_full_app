# API Testing Workflow Command

## Purpose
Comprehensive testing framework for COS360 FastAPI multi-tenant application with focus on business logic validation.

## Usage
`/test-api [module] [coverage]` - Execute comprehensive API testing

## Testing Strategy

### 1. Unit Tests for Services

#### Service Layer Testing
```python
# Test service functions independently
pytest app/service/fee/test_fee_category_service.py -v
pytest app/service/masters/test_staff_service.py -v
pytest app/service/student/test_admission_service.py -v
```

#### Database Refresh Pattern Testing
- [ ] **Create Operations**: Verify `flush() → select() → commit()` pattern
- [ ] **Update Operations**: Ensure no `commit() → refresh()` usage
- [ ] **Multi-tenant Context**: Test schema isolation
- [ ] **Relationship Loading**: Validate `selectinload()` usage

### 2. API Endpoint Testing

#### Authentication Testing
```bash
# Test tenant authentication
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "cschema: test_tenant" \
  -d '{"username": "admin", "password": "testpass123"}'

# Test super admin authentication
curl -X POST http://localhost:8000/api/v1/super_admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin", "password": "admin123"}'
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
# Test data isolation between tenants
async def test_tenant_isolation():
    # Create data in tenant A (test tenants only; never the live little_bunny schema)
    tenant_a_data = await create_test_data(schema="test_tenant_schema")

    # Verify data not accessible from tenant B (a second test schema cloned from cos360_master)
    tenant_b_data = await get_data_from_tenant(schema="<second_test_schema>")

    assert tenant_a_data not in tenant_b_data
```

#### Schema Context Testing
- [ ] **Header Detection**: Test `cschema` header processing
- [ ] **Schema Switching**: Verify proper tenant context switching
- [ ] **Database Sessions**: Test tenant-specific database connections
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

#### Load Testing
```bash
# Use locust for load testing
locust -f tests/performance/locustfile.py --host=http://localhost:8000
```

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
# Run all tests
pytest -v

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific module tests
pytest tests/test_fee_management.py -v
pytest tests/test_authentication.py -v
pytest tests/test_multi_tenant.py -v
```

### Performance Testing
```bash
# Run performance tests
pytest tests/performance/ -v

# Load testing
locust -f tests/performance/load_test.py --host=http://localhost:8000 --users=50 --spawn-rate=5
```

## Test Data Management

### Test Fixtures
```python
# Create comprehensive test fixtures
@pytest.fixture
async def test_tenant_admin():
    return {
        "username": "admin",
        "password": "testpass123",
        "schema": "test_tenant_schema"
    }

@pytest.fixture
async def test_academic_year():
    return await create_test_academic_year()

@pytest.fixture
async def test_fee_category():
    return await create_test_fee_category()
```

### Test Database Setup
- [ ] **Isolated Test Database**: Use separate database for testing
- [ ] **Schema Recreation**: Clean schema setup for each test run
- [ ] **Test Data Seeding**: Consistent test data across test runs
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