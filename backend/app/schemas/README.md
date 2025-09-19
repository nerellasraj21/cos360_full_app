# Pydantic Schemas - Agent Contact Point

## 🎯 Purpose & Responsibility

The `app/schemas/` directory contains Pydantic validation and serialization schemas for COS360's multi-tenant school management system. These schemas define API contracts, handle request/response validation, ensure data integrity, and provide automatic OpenAPI documentation for all educational management operations.

**Core Responsibility**: Provide comprehensive data validation, serialization, and API contract definition for all school management operations while maintaining type safety and automatic documentation generation.

## 📁 Directory Structure

```
schemas/
├── admin/                   # Administrative operation schemas
│   ├── role_schema.py       # Role management validation
│   ├── user_schema.py       # User administration schemas
│   └── tenant_schema.py     # Tenant configuration schemas
├── auth/                    # Authentication and authorization schemas
│   ├── auth_schema.py       # Login, token, and authentication schemas
│   ├── permission_schema.py # Permission and role-based access schemas
│   └── user_schema.py       # User profile and management schemas
├── common/                  # Shared validation schemas and utilities
│   ├── base_schema.py       # Base schema classes and common patterns
│   ├── response_schema.py   # Standard API response formats
│   └── pagination_schema.py # Pagination and filtering schemas
├── expense/                 # Expense management schemas
│   ├── expense_schema.py    # Expense transaction validation
│   └── category_schema.py   # Expense categorization schemas
├── fee/                     # Fee management and collection schemas
│   ├── fee_schema.py        # Fee structure definition schemas
│   ├── collection_schema.py # Fee collection and payment schemas
│   ├── discount_schema.py   # Discount and scholarship schemas
│   └── report_schema.py     # Fee reporting and analytics schemas
├── masters/                 # Master data validation schemas
│   ├── staff_schema.py      # Staff management schemas
│   ├── subject_schema.py    # Subject and curriculum schemas
│   ├── class_schema.py      # Class and section schemas
│   ├── academic_schema.py   # Academic year and term schemas
│   └── transport/           # Transport management schemas
│       ├── route_schema.py  # Route definition schemas
│       └── vehicle_schema.py # Vehicle management schemas
├── public/                  # Public API schemas (no authentication)
│   ├── tenant_schema.py     # Public tenant information schemas
│   ├── menu_schema.py       # Menu structure schemas
│   └── health_schema.py     # Health check and status schemas
├── student/                 # Student management schemas
│   ├── student_schema.py    # Student profile and information schemas
│   ├── admission_schema.py  # Admission process validation schemas
│   ├── attendance_schema.py # Attendance tracking schemas
│   └── promotion_schema.py  # Student promotion schemas
└── README.md               # This agent contact point file
```

## 🏗️ Architecture Overview

### **Pydantic Schema Patterns**
- **Request/Response Separation**: Distinct schemas for input validation and output serialization
- **Inheritance Hierarchy**: Base schemas with common fields and validation patterns
- **Type Safety**: Comprehensive type hints and validation for all data fields
- **Automatic Documentation**: OpenAPI schema generation for API documentation

### **Validation Architecture**
```python
# Standard schema pattern for CRUD operations
class EntityBase(BaseModel):
    """Base schema with common fields"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class EntityCreate(EntityBase):
    """Schema for entity creation requests"""
    pass

class EntityUpdate(EntityBase):
    """Schema for entity update requests"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)

class EntityResponse(EntityBase):
    """Schema for entity API responses"""
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True  # Enable ORM model serialization
```

## 🔧 Key Components

### Component 1: Authentication Schemas (`auth/`)
- **Purpose**: User authentication, JWT token validation, and authorization schemas
- **Key Schemas**:
  - `LoginRequest`: User login credential validation
  - `TokenResponse`: JWT token structure and expiration
  - `UserProfile`: User information and role details
  - `PermissionCheck`: Role-based permission validation
- **Validation Features**: Password strength, email format, token structure validation
- **Used By**: Authentication endpoints, permission validation middleware

### Component 2: Student Management Schemas (`student/`)
- **Purpose**: Comprehensive student lifecycle validation from admission to graduation
- **Key Schemas**:
  - `StudentCreate`: New student registration validation
  - `AdmissionApplication`: Admission process data validation
  - `StudentProfile`: Complete student information serialization
  - `AttendanceRecord`: Daily attendance tracking validation
- **Validation Features**: Student ID formats, academic year validation, family information
- **Used By**: Student management endpoints, admission workflows, attendance systems

### Component 3: Fee Management Schemas (`fee/`)
- **Purpose**: Complex fee structure validation and payment processing schemas
- **Key Schemas**:
  - `FeeStructureCreate`: Fee definition and calculation rules
  - `FeeCollectionRequest`: Payment transaction validation
  - `DiscountApplication`: Scholarship and discount validation
  - `FeeReport`: Financial reporting and analytics schemas
- **Validation Features**: Amount validation, payment method validation, discount rules
- **Used By**: Fee management endpoints, payment processing, financial reporting

### Component 4: Staff Management Schemas (`masters/staff_schema.py`)
- **Purpose**: Staff member information and role assignment validation
- **Key Schemas**:
  - `StaffCreate`: New staff member registration
  - `StaffProfile`: Complete staff information and qualifications
  - `RoleAssignment`: Staff role and department assignment
  - `StaffPerformance`: Performance evaluation data
- **Validation Features**: Qualification validation, contact information, role constraints
- **Used By**: Staff management endpoints, HR operations, role assignment

### Component 5: Academic Structure Schemas (`masters/`)
- **Purpose**: Academic hierarchy and institutional structure validation
- **Key Schemas**:
  - `AcademicYearCreate`: Academic year and term definitions
  - `ClassStructure`: Class and section organization
  - `SubjectMapping`: Subject and curriculum assignments
  - `AcademicCalendar`: Academic calendar and schedule validation
- **Validation Features**: Date range validation, capacity constraints, hierarchy validation
- **Used By**: Academic structure endpoints, scheduling systems, curriculum management

### Component 6: Common Schemas (`common/`)
- **Purpose**: Shared validation patterns and response structures
- **Key Schemas**:
  - `BaseModel`: Foundation class with common validation patterns
  - `PaginatedResponse`: Standard pagination and filtering
  - `ErrorResponse`: Standardized error message structure
  - `SuccessResponse`: Standard success response format
- **Validation Features**: UUID validation, timestamp formatting, pagination parameters
- **Used By**: All API endpoints for consistent response structures

## 🔄 Data Flow

### **Request Validation Flow**
1. **Request Reception**: FastAPI receives HTTP request with JSON body
2. **Schema Selection**: Appropriate Pydantic schema selected based on endpoint
3. **Automatic Validation**: Pydantic validates request data against schema definition
4. **Type Conversion**: Automatic type conversion and formatting
5. **Error Handling**: Validation errors returned with detailed field-level messages
6. **Business Logic**: Validated data passed to service layer for processing

### **Response Serialization Flow**
1. **Service Response**: Business logic returns SQLAlchemy model or data structure
2. **Schema Mapping**: Response schema selected for data serialization
3. **Automatic Conversion**: Pydantic converts ORM models to JSON-serializable format
4. **Field Selection**: Only authorized fields included in response
5. **Documentation**: Automatic OpenAPI documentation generation
6. **Client Response**: Standardized JSON response sent to client

## 🔗 Integration Points

### **Inputs**
- **HTTP Requests**: JSON payloads for all API endpoints
- **ORM Models**: SQLAlchemy models for response serialization
- **Configuration**: Validation rules and business constraints
- **User Context**: Authentication and authorization context for field filtering

### **Outputs**
- **Validated Data**: Type-safe, validated data structures for business logic
- **JSON Responses**: Standardized API responses with proper serialization
- **OpenAPI Documentation**: Automatic API documentation with schema definitions
- **Error Messages**: Detailed validation error responses with field-level details

### **External Dependencies**
- **Pydantic v2**: Core validation and serialization framework
- **FastAPI**: Automatic integration with API endpoints and documentation
- **Python Type System**: Type hints and validation annotations
- **SQLAlchemy**: ORM model integration for response serialization

### **Internal Dependencies**
- **Database Models**: ORM models for response serialization patterns
- **API Endpoints**: FastAPI routers using schemas for validation
- **Service Layer**: Business logic receiving validated data structures
- **Configuration**: Application settings affecting validation rules

## 📊 Business Logic Summary

### **Educational Domain Validation**
- **Student Information**: Comprehensive validation of student personal, academic, and family data
- **Academic Structure**: Validation of educational hierarchy, terms, subjects, and schedules
- **Fee Management**: Complex fee calculation rules, payment validation, and financial reporting
- **Staff Management**: Staff qualifications, role assignments, and performance tracking
- **Administrative Operations**: Tenant management, user roles, and system configuration

### **Multi-Tenant Validation Patterns**
- **Tenant Context**: Validation rules that consider tenant-specific constraints
- **Plan-Based Validation**: Feature validation based on tenant subscription plans
- **Cross-Tenant Prevention**: Validation preventing access to other tenant data
- **Public Schema Validation**: Validation for system-wide operations and data

### **Business Rule Enforcement**
- **Academic Constraints**: Validation of academic year boundaries, class capacities
- **Financial Rules**: Fee structure validation, payment method constraints
- **Administrative Policies**: User role limitations, permission boundaries
- **Data Integrity**: Referential integrity validation and constraint enforcement

## ⚙️ Configuration

### **Pydantic Configuration**
```python
# Standard Pydantic model configuration
class Config:
    from_attributes = True      # Enable SQLAlchemy ORM serialization
    use_enum_values = True     # Use enum values instead of names
    validate_assignment = True  # Validate on attribute assignment
    str_strip_whitespace = True # Automatically strip whitespace
    json_encoders = {
        datetime: lambda v: v.isoformat() if v else None,
        UUID: lambda v: str(v) if v else None
    }
```

### **Validation Rules**
```python
# Common validation patterns
class FieldValidation:
    # Text fields with length constraints
    name_field = Field(..., min_length=1, max_length=100, regex=r'^[a-zA-Z\s]+$')

    # Email validation
    email_field = Field(..., regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

    # Phone number validation
    phone_field = Field(..., regex=r'^\+?[1-9]\d{1,14}$')

    # UUID validation
    id_field = Field(..., description="UUID identifier")
```

## 🚨 Error Handling

### **Validation Error Patterns**
```python
# Standard validation error response
{
    "detail": [
        {
            "loc": ["field_name"],
            "msg": "Field validation error message",
            "type": "value_error.missing"
        }
    ]
}
```

### **Custom Validation**
```python
# Custom validation methods for business rules
class StudentCreate(BaseModel):
    admission_number: str
    birth_date: date

    @validator('admission_number')
    def validate_admission_number(cls, v):
        if not re.match(r'^\d{4}[A-Z]{2}\d{3}$', v):
            raise ValueError('Invalid admission number format')
        return v

    @validator('birth_date')
    def validate_age(cls, v):
        age = (datetime.now().date() - v).days // 365
        if age < 3 or age > 25:
            raise ValueError('Student age must be between 3 and 25 years')
        return v
```

## 📈 Performance Considerations

### **Validation Performance**
- **Field Validation**: Efficient field-level validation with minimal overhead
- **Bulk Operations**: Optimized validation for bulk data processing
- **Caching**: Validation rule caching for repeated operations
- **Lazy Loading**: Optional field validation for performance optimization

### **Serialization Optimization**
```python
# Optimized response schemas for large datasets
class OptimizedStudentList(BaseModel):
    students: List[StudentSummary]  # Minimal fields for list views
    total_count: int
    page_info: PaginationInfo

    class Config:
        # Exclude None values for smaller responses
        exclude_none = True
```

## 🔒 Security Aspects

### **Input Validation Security**
- **SQL Injection Prevention**: Automatic input sanitization and validation
- **XSS Prevention**: HTML content validation and escaping
- **Data Type Enforcement**: Strict type validation preventing injection attacks
- **Field Length Limits**: Prevention of buffer overflow and DoS attacks

### **Data Privacy**
```python
# Sensitive field handling
class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    # Password field excluded from response schemas

    @validator('email')
    def mask_email(cls, v, values, **kwargs):
        # Optional email masking for privacy
        if should_mask_email(values.get('user_context')):
            return mask_email_address(v)
        return v
```

## 🧪 Testing

### **Schema Testing Patterns**
```python
# Comprehensive schema validation testing
def test_student_create_validation():
    # Valid data
    valid_data = {
        "first_name": "John",
        "last_name": "Doe",
        "admission_number": "2024AB001",
        "birth_date": "2010-01-15"
    }
    student = StudentCreate(**valid_data)
    assert student.first_name == "John"

    # Invalid data
    with pytest.raises(ValidationError):
        StudentCreate(first_name="", last_name="Doe")  # Empty name
```

### **Integration Testing**
- **API Endpoint Testing**: Validation of complete request/response cycles
- **Error Response Testing**: Validation error handling and response formats
- **Performance Testing**: Schema validation performance under load
- **Security Testing**: Input validation security and injection prevention

## 📝 Agent Guidance

### When to Dive Deeper
- **Validation Errors**: Examine specific schema files for validation rules and constraints
- **API Contract Issues**: Review request/response schema definitions and field requirements
- **Performance Problems**: Analyze schema complexity and validation overhead
- **Documentation Issues**: Check schema descriptions and OpenAPI integration
- **Business Rule Validation**: Examine custom validators and business logic constraints

### Quick Reference
- **Primary Pattern**: Request/Response schema separation with inheritance hierarchy
- **Most Complex Schemas**: Student and fee management schemas with extensive validation
- **Common Issues**: Field validation errors, type conversion problems, custom validator issues
- **Integration Pattern**: Automatic FastAPI integration with dependency injection

### **Critical Schema Files**
1. `common/base_schema.py` - Foundation patterns for all schemas
2. `student/student_schema.py` - Complex student validation examples
3. `fee/fee_schema.py` - Financial validation and calculation patterns
4. `auth/auth_schema.py` - Authentication and security validation patterns

## 🔄 Recent Changes

### **Pydantic v2 Migration**
- **Performance Improvements**: Significant validation performance enhancements
- **Type Safety**: Enhanced type validation and error messages
- **Compatibility**: Maintained backward compatibility with existing API contracts
- **Documentation**: Improved OpenAPI documentation generation

### **Validation Enhancements**
- **Business Rules**: Enhanced custom validation for educational domain constraints
- **Security Hardening**: Strengthened input validation for security
- **Error Messages**: Improved user-friendly validation error messages
- **Performance**: Optimized validation patterns for high-volume operations

## 📋 TODO/Known Issues

### **Active Improvements**
1. **Advanced Validation**: Enhanced business rule validation patterns
2. **Performance Optimization**: Schema validation performance analysis and optimization
3. **Documentation**: Extended schema documentation and examples
4. **Internationalization**: Multi-language validation error messages

### **Future Enhancements**
- **Dynamic Validation**: Runtime validation rule configuration
- **Advanced Serialization**: Enhanced response serialization patterns
- **Validation Caching**: Advanced validation result caching
- **Schema Versioning**: API versioning support with schema evolution

### **Technical Improvements**
- **Error Handling**: Enhanced validation error handling and reporting
- **Security**: Additional security validation patterns
- **Testing**: Expanded validation testing coverage
- **Monitoring**: Schema validation performance monitoring