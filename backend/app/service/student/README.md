# Student Services Documentation

This directory contains all student-related business logic for the COS360 multi-tenant school management system.

## Services

### admission_service.py

**Primary Function**: Handles student enrollment and parent management with multi-child family support.

#### Key Features

##### ✅ Parent Email Sharing (Updated 2025-01-19)
**Business Requirement**: Multiple children can share the same parent email addresses during enrollment.

**Implementation Details**:

1. **Smart Email Validation**:
   ```python
   # Allows parent email reuse for existing Parent role users
   # Prevents conflicts with Staff/Student/Admin emails
   if user.role.name != "Parent":
       raise HTTPException(400, f"Email {email} is already registered to a {user.role.name}, not a parent")
   ```

2. **Parent User Management**:
   ```python
   # Reuses existing parent users when email matches
   if father_email in existing_emails:
       father_user_data = existing_emails[father_email]
       # Links to existing Parent record
   else:
       # Creates new parent user and Parent record
   ```

3. **Relationship Management**:
   ```python
   # Prevents duplicate StudentParentLink records
   if not existing_father_link.scalar_one_or_none():
       student_parent_link_father = StudentParentLink(...)
   ```

#### Function: `add_admission(admission: StudentAdmissionCreate, db: AsyncSession)`

**Process Flow**:
1. **Role Validation** - Get Student and Parent role IDs
2. **Admission Number Generation** - Format: `ADM{YEAR}{SEQUENCE}`
3. **Email Validation** - Smart parent email reuse logic
4. **Student Creation** - Create student user and record
5. **Parent Management** - Reuse or create parent users/records
6. **Relationship Linking** - Create StudentParentLink associations
7. **Admission Record** - Create final admission record

**Parent Sharing Logic**:
- ✅ **Reuse existing parent** when email belongs to Parent role user
- ✅ **Create new parent** when email doesn't exist
- ❌ **Block role conflicts** when email belongs to Staff/Student/Admin
- ❌ **Prevent same email** for father and mother in single admission

**Error Handling**:
- `"Father and mother cannot have the same email address"`
- `"Email {email} is already registered to a {role}, not a parent"`
- Database transaction rollback on any failure

#### Database Relationships

**Tables Involved**:
- `users` - Authentication and role management
- `students` - Student personal information
- `parents` - Parent information
- `student_parent_links` - Many-to-many parent-child relationships
- `admissions` - Enrollment records

**Multi-Tenant Pattern**:
```python
# Follows COS360 refresh pattern
await db.flush()  # Persist to get IDs
result = await db.execute(select(...).options(selectinload(...)))
entity = result.scalar_one()  # Load with relationships
await db.commit()  # Final commit
```

#### Business Rules

1. **Parent Email Sharing**:
   - ✅ Multiple children can use same parent email
   - ✅ Existing parent accounts are reused
   - ✅ Parent information is not duplicated

2. **Data Integrity**:
   - ❌ No duplicate User records for same email
   - ❌ No duplicate Parent records for same person
   - ❌ No duplicate StudentParentLink records
   - ❌ No role conflicts (parent email used by non-parent)

3. **Security**:
   - Parent users get default password: `"parent@123"`
   - Student users get default password: `"student@123"`
   - All users assigned appropriate roles

#### Testing Scenarios

**Single Child (Existing Flow)**:
```
New parent emails → Create new users → Create new parent records → Link to student
```

**Multiple Children (New Feature)**:
```
Child 1: john@example.com → Create parent user & record
Child 2: john@example.com → Reuse parent user & record → Link to new student
```

**Error Cases**:
```
Staff email as parent → Role conflict error
Same email for father/mother → Same admission validation error
```

#### Dependencies

- `app.models.masters.parent_model.Parent`
- `app.models.student.student_model.Student`
- `app.models.auth.user_model.User`
- `app.models.auth.role_model.Role`
- `app.models.masters.student_parent_association_model.StudentParentLink`
- `app.models.masters.admission_model.Admission`

#### Recent Changes (2025-01-19)

**Modified Functions**:
- `add_admission()` - Enhanced with parent email sharing logic

**New Capabilities**:
- Parent email reuse validation
- Existing parent user detection and reuse
- Smart parent-child relationship management
- Role conflict prevention

**Backward Compatibility**: ✅ Maintained
**Database Schema Changes**: ❌ None required
**API Changes**: ❌ None required