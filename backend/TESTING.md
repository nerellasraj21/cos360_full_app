# Testing Guidelines for COS360 Project

## Overview
This document provides comprehensive testing guidelines for the COS360 school management system. All new features must include appropriate test coverage following these guidelines.

## Testing Structure

```
tests/
├── conftest.py              # Global fixtures and configuration
├── unit/                    # Unit tests (isolated component testing)
│   ├── fee/                 # Fee module unit tests
│   │   ├── test_fee_term_schemas.py
│   │   └── test_fee_category_schemas.py
│   └── [other_modules]/
├── integration/             # Integration tests (API endpoints, database)
│   ├── fee/                 # Fee module integration tests
│   │   ├── test_fee_term_api.py
│   │   └── test_fee_category_api.py
│   └── [other_modules]/
└── fixtures/                # Test data and fixtures
```

## Setup and Installation

### Install Testing Dependencies
```bash
pip install -r requirements-test.txt
```

### Run All Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test categories
pytest -m unit              # Unit tests only
pytest -m integration       # Integration tests only
pytest -m api               # API tests only

# Run tests for specific module
pytest tests/unit/fee/
pytest tests/integration/fee/
```

## Test Categories and Markers

### Test Markers
- `@pytest.mark.unit` - Unit tests (fast, isolated)
- `@pytest.mark.integration` - Integration tests (database, API)
- `@pytest.mark.api` - API endpoint tests
- `@pytest.mark.slow` - Tests that take longer to run

### Test Types

#### 1. Unit Tests (`tests/unit/`)
Test individual components in isolation:
- **Schema Validation**: Pydantic model validation
- **Business Logic**: Service layer functions (mocked dependencies)
- **Model Structure**: SQLAlchemy model definitions

#### 2. Integration Tests (`tests/integration/`)
Test components working together:
- **API Endpoints**: Full request/response cycle
- **Database Operations**: CRUD operations with real database
- **Service Integration**: Services with database interactions

## Testing Guidelines for New Features

### Required Test Coverage
Every new feature **MUST** include:

1. **Schema Tests** (`tests/unit/[module]/test_[feature]_schemas.py`)
   - Valid data validation
   - Invalid data rejection
   - Default values
   - Field requirements
   - Custom validators

2. **API Tests** (`tests/integration/[module]/test_[feature]_api.py`)
   - All CRUD operations (Create, Read, Update, Delete)
   - Success scenarios
   - Error scenarios (404, 400, 422, etc.)
   - Input validation
   - Business rule enforcement

### Test Structure Template

#### Schema Test Template
```python
"""
Unit tests for [Feature] schemas
"""
import pytest
from pydantic import ValidationError
from app.schemas.[module].[feature]_schema import FeatureCreate, FeatureUpdate

class TestFeatureSchemas:
    """Test Feature Pydantic schemas"""

    def test_feature_create_valid(self):
        """Test valid feature creation"""
        # Test valid data
        
    def test_feature_create_invalid(self):
        """Test feature creation with invalid data"""
        # Test validation errors
        
    def test_feature_update_partial(self):
        """Test partial feature update"""
        # Test optional fields
```

#### API Test Template
```python
"""
Integration tests for [Feature] API endpoints
"""
import pytest
from app.models.[module].[feature]_model import Feature

class TestFeatureAPI:
    """Test Feature API endpoints"""

    @pytest.mark.api
    async def test_create_feature_success(self, test_client):
        """Test successful feature creation"""
        # Test POST endpoint
        
    @pytest.mark.api
    async def test_get_feature_success(self, test_client):
        """Test successful feature retrieval"""
        # Test GET endpoint
        
    @pytest.mark.api
    async def test_update_feature_success(self, test_client):
        """Test successful feature update"""
        # Test PUT endpoint
        
    @pytest.mark.api
    async def test_delete_feature_success(self, test_client):
        """Test successful feature deletion"""
        # Test DELETE endpoint
```

## Available Fixtures

### Database Fixtures
- `test_engine` - Async SQLAlchemy engine for testing
- `test_db_session` - Database session for tests
- `test_client` - FastAPI test client with database override

### Sample Data Fixtures
- `sample_academic_year_data` - Academic year test data
- `sample_fee_category_data` - Fee category test data
- `sample_fee_term_data` - Fee term test data

### Custom Fixtures for New Features
Create module-specific fixtures in your test files:

```python
@pytest.fixture
async def setup_test_data(test_db_session):
    """Create test data for this feature"""
    # Create necessary test data
    # Return created objects for use in tests
```

## Best Practices

### 1. Test Naming Conventions
- Test files: `test_[feature]_[type].py`
- Test classes: `Test[Feature][Type]`
- Test methods: `test_[action]_[scenario]`

### 2. Test Organization
- One test class per schema/endpoint group
- Group related tests together
- Use descriptive test names that explain the scenario

### 3. Test Data Management
- Use fixtures for reusable test data
- Keep test data minimal and focused
- Clean up test data when necessary (fixtures handle this automatically)

### 4. Assertions
- Use specific assertions (`assert data["field"] == expected`)
- Test both success and failure scenarios
- Verify HTTP status codes for API tests
- Check error messages for validation tests

### 5. Async Testing
- Use `async def` for test functions that call async code
- Use `await` for async operations
- Database and API tests are typically async

## Example Test Cases to Include

### For Every New Feature:

#### Schema Tests
```python
def test_create_valid_data(self):
    """Test creation with valid data"""
    
def test_create_invalid_data(self):
    """Test creation with invalid data"""
    
def test_create_missing_required_fields(self):
    """Test creation with missing required fields"""
    
def test_update_partial(self):
    """Test partial updates"""
    
def test_default_values(self):
    """Test default field values"""
```

#### API Tests
```python
async def test_create_success(self):
    """Test successful creation"""
    
async def test_create_invalid_data(self):
    """Test creation with invalid data returns 422"""
    
async def test_get_success(self):
    """Test successful retrieval"""
    
async def test_get_not_found(self):
    """Test retrieval of non-existent resource returns 404"""
    
async def test_get_all(self):
    """Test retrieving all resources"""
    
async def test_update_success(self):
    """Test successful update"""
    
async def test_update_not_found(self):
    """Test update of non-existent resource returns 404"""
    
async def test_delete_success(self):
    """Test successful deletion"""
    
async def test_delete_not_found(self):
    """Test deletion of non-existent resource returns 404"""
```

### Business Logic Specific Tests
Add tests for your feature's specific business rules:
- Unique constraints
- Foreign key validations
- Complex business logic
- Edge cases

## Running Tests During Development

### Continuous Testing
```bash
# Run tests automatically when files change
pytest-watch

# Run only failed tests
pytest --lf

# Run tests in parallel (faster)
pytest -n auto
```

### Test Coverage
```bash
# Generate coverage report
pytest --cov=app --cov-report=html
# View coverage report at htmlcov/index.html

# Check coverage for specific module
pytest --cov=app.api.v1.fee --cov-report=term-missing
```

## CI/CD Integration
Tests are automatically run in CI/CD pipeline:
- All tests must pass before merge
- Coverage threshold: 80% minimum
- Tests run on multiple Python versions

## Troubleshooting Common Issues

### Database Connection Issues
- Ensure test database is properly configured
- Check if test migrations are up to date
- Verify test data cleanup is working

### Async Test Issues
- Always use `async def` for async tests
- Use `await` for async operations
- Check if `pytest-asyncio` is properly configured

### Import Issues
- Verify Python path includes app directory
- Check if all `__init__.py` files are present
- Ensure proper module structure

## Contributing New Tests

### Before Adding Tests
1. Review existing tests for similar features
2. Follow the established patterns and conventions
3. Use appropriate fixtures and markers
4. Include both positive and negative test cases

### Test Review Checklist
- [ ] Tests cover all public API endpoints
- [ ] Tests cover all schema validations
- [ ] Tests include error scenarios
- [ ] Tests use appropriate fixtures
- [ ] Tests have descriptive names
- [ ] Tests follow established patterns
- [ ] All tests pass locally

## Future Enhancements

### Planned Improvements
- Performance testing with locust
- Visual regression testing for frontend
- End-to-end testing with Playwright
- Load testing for API endpoints
- Security testing integration

---

**Remember**: Quality tests are as important as quality code. Invest time in writing comprehensive tests - they will save you time debugging issues later!