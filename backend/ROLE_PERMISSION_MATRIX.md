# Role Permission Matrix - COS360 School Management System

## Overview
This document provides a comprehensive overview of the role-based permission system implemented in COS360. The system uses database-driven permissions with fallback support for secure access control.

## Permission Statistics
- **Total Permissions**: 347 permissions across 5 roles
- **Total Resources**: 31 system resources secured
- **Permission Types**: create, read, update, delete, list

## Role Summary

| Role      | Permissions | Access Level |
|-----------|-------------|--------------|
| Admin     | 130         | Full system access |
| Staff     | 71          | Administrative operations |
| Teacher   | 60          | Academic management |
| Student   | 48          | Read-only academic info |
| Parent    | 38          | Child-focused read access |

## Detailed Role Permissions

### Admin Role (130 permissions)
**Full system administrator with complete CRUD access to all resources.**

#### Academic Management
- academic_years: create, delete, list, read, update
- classes: create, delete, list, read, update
- subjects: create, delete, list, read, update
- subject_categories: create, delete, list, read, update

#### Fee Management
- fee_categories: create, delete, list, read, update
- fee_types: create, delete, list, read, update
- fee_terms: create, delete, list, read, update
- fee_class_mappings: create, delete, list, read, update
- fee_student_mappings: create, delete, list, read, update
- fee_term_amounts: create, delete, list, read, update

#### Transport Management
- routes: create, delete, list, read, update
- vehicles: create, delete, list, read, update
- route_stops: create, delete, list, read, update
- transport_trips: create, delete, list, read, update
- student_transport: create, delete, list, read, update

#### Student Management
- student_admissions: create, delete, list, read, update
- student_attendance: create, delete, list, read, update
- student_certificates: create, delete, list, read, update
- student_documents: create, delete, list, read, update

#### Administrative Functions
- staff: create, delete, list, read, update
- parent_management: create, delete, list, read, update
- holiday_management: create, delete, list, read, update
- timetable_management: create, delete, list, read, update

#### System Management
- role_management: create, delete, list, read, update
- permission_management: create, delete, list, read, update
- menu_management: create, delete, list, read, update

### Staff Role (71 permissions)
**Administrative staff with full CRUD access to operational functions.**

#### Fee Management (Full CRUD)
- fee_categories: create, delete, list, read, update
- fee_types: create, delete, list, read, update
- fee_terms: create, delete, list, read, update
- fee_class_mappings: create, delete, list, read, update
- fee_student_mappings: create, delete, list, read, update
- fee_term_amounts: create, delete, list, read, update

#### Transport Management (Full CRUD)
- transport_routes: create, delete, list, read, update
- transport_vehicles: create, delete, list, read, update
- route_stops: create, delete, list, read, update
- transport_trips: create, delete, list, read, update
- student_transport: create, delete, list, read, update

#### Administrative Functions (Full CRUD)
- parents: create, delete, list, read, update
- holidays: create, delete, list, read, update

#### Academic Information (Read Only)
- academic_years: list, read
- classes: list, read
- sections: list, read

### Teacher Role (60 permissions)
**Academic staff with enhanced teaching and student management capabilities.**

#### Academic Management (Enhanced Access)
- classes: create, delete, list, read, update
- subjects: create, delete, list, read, update
- academic_years: list, read
- subject_categories: list, read

#### Student Academic Management (Full Access)
- student_attendance: create, delete, list, read, update
- student_certificates: create, delete, list, read, update
- student_admissions: list, read
- student_documents: list, read

#### Fee Information (Read Only)
- fee_categories: list, read
- fee_types: list, read
- fee_terms: list, read
- fee_class_mappings: list, read
- fee_student_mappings: list, read
- fee_term_amounts: list, read

#### Transport & Administrative Info (Read Only)
- routes: list, read
- vehicles: list, read
- route_stops: list, read
- transport_trips: list, read
- student_transport: list, read
- staff: list, read
- parent_management: list, read
- holiday_management: list, read
- timetable_management: list, read
- menu_management: list, read

### Student Role (48 permissions)
**Student users with read-only access to relevant academic information.**

#### Academic Information (Read Only)
- academic_years: list, read
- classes: list, read
- subjects: list, read
- subject_categories: list, read

#### Own Academic Records (Read Only)
- student_attendance: list, read
- student_certificates: list, read
- student_admissions: list, read
- student_documents: list, read

#### Fee Information (Read Only)
- fee_categories: list, read
- fee_types: list, read
- fee_terms: list, read
- fee_class_mappings: list, read
- fee_student_mappings: list, read
- fee_term_amounts: list, read

#### Transport & School Information (Read Only)
- routes: list, read
- vehicles: list, read
- route_stops: list, read
- transport_trips: list, read
- student_transport: list, read
- holiday_management: list, read
- timetable_management: list, read
- staff: list, read
- parent_management: list, read
- menu_management: list, read

### Parent Role (38 permissions)
**Parent users with read-only access focused on their child's education.**

#### Child's Academic Information (Read Only)
- academic_years: list, read
- classes: list, read
- subjects: list, read
- student_admissions: list, read
- student_attendance: list, read
- student_certificates: list, read
- student_documents: list, read

#### Fee Information (Read Only for Payment Purposes)
- fee_categories: list, read
- fee_types: list, read
- fee_terms: list, read
- fee_class_mappings: list, read
- fee_student_mappings: list, read
- fee_term_amounts: list, read

#### Transport Information (Read Only for Child's Transport)
- transport_routes: list, read
- transport_vehicles: list, read
- route_stops: list, read
- transport_trips: list, read
- student_transport: list, read

#### School Information (Read Only)
- holidays: list, read

## Security Architecture

### Database-First Approach
1. **Primary**: Database-driven permissions via `resource_permissions` table
2. **Fallback**: Hardcoded permissions in `ROLE_PERMISSIONS` mapping
3. **Validation**: JWT token verification with role-based access control

### Permission Check Flow
1. Extract JWT token from Authorization header
2. Get user role from token payload
3. Check database for specific resource:action permission
4. If database check fails, use fallback hardcoded permissions
5. Grant or deny access based on permission result

### Resource Naming Convention
- **Academic**: `academic_years`, `classes`, `subjects`, `subject_categories`
- **Fee**: `fee_categories`, `fee_types`, `fee_terms`, `fee_class_mappings`, `fee_student_mappings`, `fee_term_amounts`
- **Transport**: `transport_routes`, `transport_vehicles`, `route_stops`, `transport_trips`, `student_transport`
- **Student**: `student_admissions`, `student_attendance`, `student_certificates`, `student_documents`
- **Administrative**: `parents`, `holidays`, `staff`, `timetables`
- **System**: `role_management`, `permission_management`, `menu_management`

### Action Types
- **create**: Create new records
- **read**: View individual records
- **update**: Modify existing records
- **delete**: Remove records
- **list**: View multiple records/lists

## Implementation Notes

### Multi-Tenant Support
- Each tenant has isolated permission sets
- Schema-based isolation ensures tenant data security
- Permissions are tenant-specific and managed per tenant database

### Performance Considerations
- Database permissions cached at application level
- Fallback permissions provide fail-safe mechanism
- Efficient permission checking with minimal database queries

### Endpoint Protection
All API endpoints are protected using the `check_role_permission()` function:
```python
current_user = await get_current_user_token(request)
role = current_user.get('role')
has_permission = await check_role_permission(db, role, 'resource_name', 'action')
if not has_permission:
    raise HTTPException(status_code=403, detail="Insufficient permissions")
```

## Maintenance

### Adding New Resources
1. Add permissions to database via `ResourcePermission` model
2. Update fallback `ROLE_PERMISSIONS` mapping
3. Apply permission checks to new endpoints
4. Update this documentation

### Role Management
- Roles are managed through the Auth module endpoints
- Permission assignments can be modified via Admin interface
- Changes take effect immediately for new requests

---

**Last Updated**: September 2025  
**Version**: 2.0  
**Total Secured Endpoints**: 150+  
**Permission Coverage**: Complete across all modules