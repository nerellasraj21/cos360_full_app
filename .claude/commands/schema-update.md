# Database Schema Update Process Command

## Purpose
Comprehensive workflow for updating database schemas in COS360 multi-tenant system, including SQLAlchemy models, Pydantic schemas, and API endpoints.

## Usage
`/schema-update [module] [change_type]` - Execute schema update workflow

## Schema Update Workflow

### 1. Schema Change Analysis

#### Impact Assessment
- [ ] **Breaking Changes**: Identify backwards compatibility issues
- [ ] **Data Migration**: Assess data transformation requirements
- [ ] **API Changes**: Determine endpoint modifications needed
- [ ] **Multi-Tenant Impact**: Consider effect on all tenant schemas
- [ ] **Performance Impact**: Evaluate query performance changes

#### Change Types
1. **Additive Changes**: New fields, tables, relationships
2. **Modification Changes**: Field type changes, constraint updates
3. **Removal Changes**: Deprecated fields, tables, relationships
4. **Structural Changes**: Index additions, constraint modifications

### 2. SQLAlchemy Model Updates

#### Model Modification Process
```python
# Example: Adding new field to existing model
class Student(BaseOrg):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)

    # NEW FIELD - Added with proper defaults
    emergency_contact = Column(String(255), nullable=True)  # Non-breaking change
    enrollment_status = Column(String(50), nullable=False, default="active")  # With default

    # NEW RELATIONSHIP - Added with proper back_populates
    documents = relationship("StudentDocument", back_populates="student")
```

#### Model Update Checklist
- [ ] **UUID Primary Keys**: Maintain UUID consistency
- [ ] **Timestamps**: Include created_at/updated_at if missing
- [ ] **Nullable Fields**: Use nullable=True for optional fields
- [ ] **Default Values**: Provide defaults for new required fields
- [ ] **Relationships**: Update back_populates references
- [ ] **Constraints**: Add/update unique constraints
- [ ] **Indexes**: Consider performance implications

### 3. Pydantic Schema Updates

#### Schema Creation/Update Process
```python
# Update request/response schemas
class StudentCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    emergency_contact: Optional[str] = Field(None, max_length=255)  # NEW
    enrollment_status: str = Field("active", regex="^(active|inactive|graduated)$")  # NEW

class StudentUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    emergency_contact: Optional[str] = Field(None, max_length=255)  # NEW
    enrollment_status: Optional[str] = Field(None, regex="^(active|inactive|graduated)$")  # NEW

class StudentOut(BaseModel):
    id: UUID
    first_name: str
    last_name: Optional[str]
    emergency_contact: Optional[str]  # NEW
    enrollment_status: str  # NEW
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

#### Schema Update Guidelines
- [ ] **Field Validation**: Add appropriate validation rules
- [ ] **Optional Fields**: Make new fields optional in update schemas
- [ ] **Response Models**: Update output schemas to include new fields
- [ ] **Backward Compatibility**: Maintain existing field structure
- [ ] **Documentation**: Add field descriptions and examples

### 4. Migration Generation

#### Automatic Migration Creation
```bash
# Generate migration for schema changes
alembic revision --autogenerate -m "add_emergency_contact_and_enrollment_status_to_students"

# Review generated migration
cat migrations/versions/<generated_revision>_add_emergency_contact_and_enrollment_status_to_students.py
```

#### Manual Migration Refinement
```python
# Example migration refinement
def upgrade():
    # Add new columns
    op.add_column('students', sa.Column('emergency_contact', sa.String(255), nullable=True))
    op.add_column('students', sa.Column('enrollment_status', sa.String(50), nullable=False, server_default='active'))

    # Create indexes for performance
    op.create_index('idx_students_enrollment_status', 'students', ['enrollment_status'])

def downgrade():
    # Remove indexes first
    op.drop_index('idx_students_enrollment_status', 'students')

    # Remove columns
    op.drop_column('students', 'enrollment_status')
    op.drop_column('students', 'emergency_contact')
```

### 5. API Endpoint Updates

#### Service Layer Updates
```python
# Update service functions to handle new fields
async def create_student(db: AsyncSession, student_data: StudentCreate):
    try:
        db_student = Student(
            first_name=student_data.first_name,
            last_name=student_data.last_name,
            emergency_contact=student_data.emergency_contact,  # NEW
            enrollment_status=student_data.enrollment_status,  # NEW
        )

        db.add(db_student)
        await db.flush()

        # Load with relationships before commit (COS360 pattern)
        result = await db.execute(
            select(Student)
            .options(selectinload(Student.documents))  # Include new relationship
            .where(Student.id == db_student.id)
        )
        created_student = result.scalar_one()

        await db.commit()
        return created_student
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
```

#### Endpoint Updates
```python
# Update API endpoints to use new schemas
@router.post("/", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_data: StudentCreate,  # Updated schema
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    await check_role_plan_permission_with_error(
        db, request, current_user.get('role'), 'student_admissions', 'create'
    )
    return await student_service.create_student(db, student_data)

@router.put("/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: UUID,
    student_data: StudentUpdate,  # Updated schema
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    await check_role_plan_permission_with_error(
        db, request, current_user.get('role'), 'student_admissions', 'update'
    )
    return await student_service.update_student(db, student_id, student_data)
```

### 6. Test Updates

#### Unit Test Updates
```python
# Update tests to cover new fields
async def test_create_student_with_emergency_contact():
    student_data = StudentCreate(
        first_name="John",
        last_name="Doe",
        emergency_contact="jane.doe@example.com",  # NEW
        enrollment_status="active"  # NEW
    )

    created_student = await student_service.create_student(db, student_data)

    assert created_student.emergency_contact == "jane.doe@example.com"
    assert created_student.enrollment_status == "active"

async def test_update_enrollment_status():
    # Test enrollment status update
    update_data = StudentUpdate(enrollment_status="graduated")
    updated_student = await student_service.update_student(db, student_id, update_data)

    assert updated_student.enrollment_status == "graduated"
```

#### Integration Test Updates
```python
# Update API integration tests
async def test_api_create_student_with_new_fields():
    response = await client.post(
        "/api/v1/student/admissions/",
        headers={"Authorization": f"Bearer {token}", "cschema": "test_tenant"},
        json={
            "first_name": "John",
            "last_name": "Doe",
            "emergency_contact": "jane.doe@example.com",
            "enrollment_status": "active"
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["emergency_contact"] == "jane.doe@example.com"
    assert data["enrollment_status"] == "active"
```

### 7. Documentation Updates

#### API Documentation
```python
# Update endpoint docstrings
@router.post("/", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_data: StudentCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Create a new student admission.

    This endpoint creates a new student record with admission details.

    **New Fields Added:**
    - emergency_contact: Optional emergency contact information
    - enrollment_status: Current enrollment status (active, inactive, graduated)

    **Required Permissions:**
    - Role: Must have 'student_admissions:create' permission
    - Plan: Must have access to student management features
    """
```

#### Schema Documentation
- [ ] **Field Descriptions**: Document new field purposes
- [ ] **Validation Rules**: Document field constraints
- [ ] **Examples**: Provide usage examples
- [ ] **Migration Notes**: Document breaking changes

## COS360-Specific Schema Update Considerations

### Multi-Tenant Schema Management
1. **Schema Synchronization**: Ensure all tenant schemas get updates
2. **Data Migration**: Handle existing data across all tenants
3. **Rollback Compatibility**: Ensure safe rollback procedures
4. **Performance Impact**: Test impact on multi-tenant queries

### Business Logic Considerations
1. **Fee Management**: Updates to fee-related schemas
2. **Academic Operations**: Changes to academic year, class, student schemas
3. **Permission System**: Updates to role and permission schemas
4. **Reporting**: Impact on existing reports and analytics

### Database Refresh Pattern Compliance
- [ ] **Service Functions**: Ensure new/updated functions use `flush() → select() → commit()`
- [ ] **Relationship Loading**: Use `selectinload()` for relationships
- [ ] **Error Handling**: Proper rollback on exceptions
- [ ] **Multi-Tenant Context**: Maintain schema context throughout operations

## Execution Workflow

### Step-by-Step Process
1. **Analyze Impact**: Assess change requirements and impact
2. **Update Models**: Modify SQLAlchemy models
3. **Update Schemas**: Update Pydantic request/response schemas
4. **Generate Migration**: Create and review Alembic migration
5. **Update Services**: Modify service layer functions
6. **Update Endpoints**: Update API endpoint logic
7. **Update Tests**: Modify and add test cases
8. **Update Documentation**: Update API and schema documentation
9. **Test Changes**: Run comprehensive test suite
10. **Deploy Changes**: Execute deployment workflow

### Validation Checklist
- [ ] **Backward Compatibility**: Existing API calls still work
- [ ] **Data Integrity**: No data loss during migration
- [ ] **Performance**: No significant performance degradation
- [ ] **Multi-Tenant**: All tenant schemas updated correctly
- [ ] **Security**: No security implications from changes

## Example Usage
```bash
# Update student schema with new fields
/schema-update student_management --add-fields

# Update fee schema with relationship changes
/schema-update fee_management --modify-relationships

# Full schema review and update
/schema-update --comprehensive-review
```

## Output Format
Provide schema update report including:
1. **Change Summary**: Overview of modifications made
2. **Migration Status**: Database migration results
3. **API Compatibility**: Backward compatibility assessment
4. **Test Results**: Updated test suite results
5. **Performance Impact**: Query performance analysis
6. **Documentation Updates**: Summary of documentation changes