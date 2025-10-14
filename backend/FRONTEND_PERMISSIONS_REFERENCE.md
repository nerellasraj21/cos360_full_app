# Frontend Permissions Reference Guide

**Project:** COS360 - Multi-Tenant School Management System
**Total Permissions:** 304 unique permission combinations
**Total Resources:** 67 resources
**Last Updated:** 2025-10-05

---

## Permission Structure

**Format:** `resource:action`

**Common Actions:**

- `create` - Add new records
- `read` - View record details
- `update` - Modify existing records
- `delete` - Remove records
- `list` - View list/grid of records
- `approve` - Approve records/requests
- `process` - Process transactions
- `export` - Export data
- `download` - Download files

---

## ACADEMIC MODULE

### Academic Years

| Permission               | Description                |
| ------------------------ | -------------------------- |
| `academic_years:create`  | Add new academic year      |
| `academic_years:read`    | View academic year details |
| `academic_years:update`  | Modify academic year       |
| `academic_years:delete`  | Remove academic year       |
| `academic_years:list`    | View academic years list   |
| `academic_years:approve` | Approve academic year      |

### Classes & Sections

| Permission        | Description          |
| ----------------- | -------------------- |
| `classes:create`  | Add new class        |
| `classes:read`    | View class details   |
| `classes:update`  | Modify class         |
| `classes:delete`  | Remove class         |
| `classes:list`    | View classes list    |
| `sections:create` | Add section to class |
| `sections:read`   | View section details |
| `sections:update` | Modify section       |
| `sections:delete` | Remove section       |
| `sections:list`   | View sections list   |

### Subjects

| Permission                      | Description             |
| ------------------------------- | ----------------------- |
| `subjects:create`               | Add new subject         |
| `subjects:read`                 | View subject details    |
| `subjects:update`               | Modify subject          |
| `subjects:delete`               | Remove subject          |
| `subjects:list`                 | View subjects list      |
| `subject_categories:create`     | Add subject category    |
| `subject_categories:read`       | View category details   |
| `subject_categories:update`     | Modify category         |
| `subject_categories:delete`     | Remove category         |
| `subject_categories:list`       | View categories list    |
| `class_subject_mappings:create` | Map subjects to classes |
| `class_subject_mappings:read`   | View mapping details    |
| `class_subject_mappings:update` | Modify mapping          |
| `class_subject_mappings:delete` | Remove mapping          |
| `class_subject_mappings:list`   | View mappings list      |

---

## STUDENT MODULE

### Student Admissions

| Permission                        | Description               |
| --------------------------------- | ------------------------- |
| `student_admissions:create`       | Create new admission      |
| `student_admissions:read`         | View admission details    |
| `student_admissions:update`       | Modify admission          |
| `student_admissions:delete`       | Remove admission          |
| `student_admissions:list`         | View admissions list      |
| `student_admissions:read_related` | View related student data |

### Students

| Permission              | Description                             |
| ----------------------- | --------------------------------------- |
| `students:create`       | Add student record                      |
| `students:read`         | View student details                    |
| `students:update`       | Modify student                          |
| `students:delete`       | Remove student                          |
| `students:list`         | View students list                      |
| `students:read_related` | View related data (parents, fees, etc.) |

### Student Documents

| Permission                 | Description              |
| -------------------------- | ------------------------ |
| `student_documents:create` | Upload student document  |
| `student_documents:read`   | View document            |
| `student_documents:update` | Modify document metadata |
| `student_documents:delete` | Remove document          |
| `student_documents:list`   | View documents list      |

### Student Certificates

| Permission                    | Description                   |
| ----------------------------- | ----------------------------- |
| `student_certificates:create` | Issue certificate to student  |
| `student_certificates:read`   | View certificate              |
| `student_certificates:update` | Modify certificate            |
| `student_certificates:delete` | Remove certificate            |
| `student_certificates:list`   | View certificates list        |
| `certificate_types:create`    | Add certificate type          |
| `certificate_types:read`      | View certificate type details |
| `certificate_types:update`    | Modify certificate type       |
| `certificate_types:delete`    | Remove certificate type       |
| `certificate_types:list`      | View certificate types list   |
| `certificate_types:approve`   | Approve certificate type      |

### Student Attendance

| Permission                  | Description              |
| --------------------------- | ------------------------ |
| `student_attendance:create` | Mark student attendance  |
| `student_attendance:read`   | View attendance records  |
| `student_attendance:update` | Modify attendance        |
| `student_attendance:delete` | Remove attendance record |
| `student_attendance:list`   | View attendance list     |

### Student Transport

| Permission                 | Description                     |
| -------------------------- | ------------------------------- |
| `student_transport:create` | Assign transport to student     |
| `student_transport:read`   | View transport assignment       |
| `student_transport:update` | Modify transport assignment     |
| `student_transport:delete` | Remove transport assignment     |
| `student_transport:list`   | View transport assignments list |

---

## STAFF MODULE

### Staff Management

| Permission     | Description         |
| -------------- | ------------------- |
| `staff:create` | Add staff member    |
| `staff:read`   | View staff details  |
| `staff:update` | Modify staff record |
| `staff:delete` | Remove staff member |
| `staff:list`   | View staff list     |

### Designations

| Permission            | Description              |
| --------------------- | ------------------------ |
| `designations:create` | Add new designation      |
| `designations:read`   | View designation details |
| `designations:update` | Modify designation       |
| `designations:delete` | Remove designation       |
| `designations:list`   | View designations list   |

### Staff Attendance

| Permission                | Description              |
| ------------------------- | ------------------------ |
| `staff_attendance:create` | Mark staff attendance    |
| `staff_attendance:read`   | View attendance records  |
| `staff_attendance:update` | Modify attendance        |
| `staff_attendance:delete` | Remove attendance record |
| `staff_attendance:list`   | View attendance list     |

---

## PARENT MODULE

### Parent Management

| Permission                 | Description                     |
| -------------------------- | ------------------------------- |
| `parents:create`           | Add parent record               |
| `parents:read`             | View parent details             |
| `parents:update`           | Modify parent record            |
| `parents:delete`           | Remove parent                   |
| `parents:list`             | View parents list               |
| `parent_management:create` | Create parent management record |
| `parent_management:read`   | View parent management details  |
| `parent_management:update` | Modify parent management        |
| `parent_management:delete` | Remove parent management        |
| `parent_management:list`   | View parent management list     |

### Parent Features

| Permission                | Description                      |
| ------------------------- | -------------------------------- |
| `parent_profile:children` | View list of children            |
| `children_overview:read`  | View children overview dashboard |

---

## FEE MODULE

### Fee Categories

| Permission              | Description               |
| ----------------------- | ------------------------- |
| `fee_categories:create` | Add fee category          |
| `fee_categories:read`   | View fee category details |
| `fee_categories:update` | Modify fee category       |
| `fee_categories:delete` | Remove fee category       |
| `fee_categories:list`   | View fee categories list  |

### Fee Types

| Permission         | Description           |
| ------------------ | --------------------- |
| `fee_types:create` | Add fee type          |
| `fee_types:read`   | View fee type details |
| `fee_types:update` | Modify fee type       |
| `fee_types:delete` | Remove fee type       |
| `fee_types:list`   | View fee types list   |

### Fee Terms

| Permission         | Description                         |
| ------------------ | ----------------------------------- |
| `fee_terms:create` | Add fee term (Term 1, Term 2, etc.) |
| `fee_terms:read`   | View fee term details               |
| `fee_terms:update` | Modify fee term                     |
| `fee_terms:delete` | Remove fee term                     |
| `fee_terms:list`   | View fee terms list                 |

### Fee Term Amounts

| Permission                | Description              |
| ------------------------- | ------------------------ |
| `fee_term_amounts:create` | Set term-wise fee amount |
| `fee_term_amounts:read`   | View term amount details |
| `fee_term_amounts:update` | Modify term amount       |
| `fee_term_amounts:delete` | Remove term amount       |
| `fee_term_amounts:list`   | View term amounts list   |

### Fee Class Mappings

| Permission                  | Description                  |
| --------------------------- | ---------------------------- |
| `fee_class_mappings:create` | Map fee structure to class   |
| `fee_class_mappings:read`   | View fee class mapping       |
| `fee_class_mappings:update` | Modify fee class mapping     |
| `fee_class_mappings:delete` | Remove fee class mapping     |
| `fee_class_mappings:list`   | View fee class mappings list |

### Fee Student Mappings

| Permission                    | Description                    |
| ----------------------------- | ------------------------------ |
| `fee_student_mappings:create` | Assign fee to student          |
| `fee_student_mappings:read`   | View student fee mapping       |
| `fee_student_mappings:update` | Modify student fee mapping     |
| `fee_student_mappings:delete` | Remove student fee mapping     |
| `fee_student_mappings:list`   | View student fee mappings list |

### Fee Transactions

| Permission                | Description              |
| ------------------------- | ------------------------ |
| `fee_transactions:create` | Record fee payment       |
| `fee_transactions:read`   | View transaction details |
| `fee_transactions:update` | Modify transaction       |
| `fee_transactions:delete` | Remove transaction       |
| `fee_transactions:list`   | View transactions list   |

### Fee Receipts

| Permission            | Description          |
| --------------------- | -------------------- |
| `fee_receipts:create` | Generate fee receipt |
| `fee_receipts:read`   | View receipt         |
| `fee_receipts:update` | Modify receipt       |
| `fee_receipts:delete` | Remove receipt       |
| `fee_receipts:list`   | View receipts list   |

### Fee Refunds

| Permission            | Description             |
| --------------------- | ----------------------- |
| `fee_refunds:create`  | Create refund request   |
| `fee_refunds:read`    | View refund details     |
| `fee_refunds:update`  | Modify refund           |
| `fee_refunds:delete`  | Remove refund           |
| `fee_refunds:list`    | View refunds list       |
| `fee_refunds:approve` | Approve refund request  |
| `fee_refunds:process` | Process approved refund |

---

## EXPENSE MODULE

### Expense Categories

| Permission                  | Description                  |
| --------------------------- | ---------------------------- |
| `expense_categories:create` | Add expense category         |
| `expense_categories:read`   | View expense category        |
| `expense_categories:update` | Modify expense category      |
| `expense_categories:delete` | Remove expense category      |
| `expense_categories:list`   | View expense categories list |

### Expense Types

| Permission             | Description             |
| ---------------------- | ----------------------- |
| `expense_types:create` | Add expense type        |
| `expense_types:read`   | View expense type       |
| `expense_types:update` | Modify expense type     |
| `expense_types:delete` | Remove expense type     |
| `expense_types:list`   | View expense types list |

### Expense Transactions

| Permission                     | Description                 |
| ------------------------------ | --------------------------- |
| `expense_transactions:create`  | Record expense transaction  |
| `expense_transactions:read`    | View transaction details    |
| `expense_transactions:update`  | Modify transaction          |
| `expense_transactions:delete`  | Remove transaction          |
| `expense_transactions:list`    | View transactions list      |
| `expense_transactions:approve` | Approve expense transaction |

### Expense Transaction Items

| Permission                         | Description          |
| ---------------------------------- | -------------------- |
| `expense_transaction_items:create` | Add transaction item |
| `expense_transaction_items:read`   | View item details    |
| `expense_transaction_items:update` | Modify item          |
| `expense_transaction_items:delete` | Remove item          |
| `expense_transaction_items:list`   | View items list      |

### Expense Attachments

| Permission                     | Description                |
| ------------------------------ | -------------------------- |
| `expense_attachments:create`   | Upload expense attachment  |
| `expense_attachments:read`     | View attachment            |
| `expense_attachments:update`   | Modify attachment metadata |
| `expense_attachments:delete`   | Remove attachment          |
| `expense_attachments:list`     | View attachments list      |
| `expense_attachments:download` | Download attachment file   |

### Expense Audit Logs

| Permission                  | Description            |
| --------------------------- | ---------------------- |
| `expense_audit_logs:create` | Create audit log entry |
| `expense_audit_logs:read`   | View audit log         |
| `expense_audit_logs:update` | Modify audit log       |
| `expense_audit_logs:delete` | Remove audit log       |
| `expense_audit_logs:list`   | View audit logs list   |

### Expense Settings

| Permission                | Description         |
| ------------------------- | ------------------- |
| `expense_settings:create` | Add expense setting |
| `expense_settings:read`   | View setting        |
| `expense_settings:update` | Modify setting      |
| `expense_settings:delete` | Remove setting      |
| `expense_settings:list`   | View settings list  |

### Expense Reports

| Permission               | Description             |
| ------------------------ | ----------------------- |
| `expense_reports:create` | Generate expense report |
| `expense_reports:read`   | View expense report     |
| `expense_reports:update` | Modify report           |
| `expense_reports:delete` | Remove report           |
| `expense_reports:list`   | View reports list       |
| `expense_reports:export` | Export report data      |

---

## TRANSPORT MODULE

### Routes

| Permission                | Description                  |
| ------------------------- | ---------------------------- |
| `routes:create`           | Add transport route          |
| `routes:read`             | View route details           |
| `routes:update`           | Modify route                 |
| `routes:delete`           | Remove route                 |
| `routes:list`             | View routes list             |
| `transport_routes:create` | Manage transport route       |
| `transport_routes:read`   | View transport route details |
| `transport_routes:update` | Modify transport route       |
| `transport_routes:delete` | Remove transport route       |
| `transport_routes:list`   | View transport routes list   |

### Route Stops

| Permission           | Description       |
| -------------------- | ----------------- |
| `route_stops:create` | Add route stop    |
| `route_stops:read`   | View stop details |
| `route_stops:update` | Modify stop       |
| `route_stops:delete` | Remove stop       |
| `route_stops:list`   | View stops list   |

### Vehicles

| Permission                  | Description                    |
| --------------------------- | ------------------------------ |
| `vehicles:create`           | Add vehicle                    |
| `vehicles:read`             | View vehicle details           |
| `vehicles:update`           | Modify vehicle                 |
| `vehicles:delete`           | Remove vehicle                 |
| `vehicles:list`             | View vehicles list             |
| `transport_vehicles:create` | Manage transport vehicle       |
| `transport_vehicles:read`   | View transport vehicle details |
| `transport_vehicles:update` | Modify transport vehicle       |
| `transport_vehicles:delete` | Remove transport vehicle       |
| `transport_vehicles:list`   | View transport vehicles list   |

### Transport Trips

| Permission               | Description             |
| ------------------------ | ----------------------- |
| `transport_trips:create` | Schedule transport trip |
| `transport_trips:read`   | View trip details       |
| `transport_trips:update` | Modify trip             |
| `transport_trips:delete` | Remove trip             |
| `transport_trips:list`   | View trips list         |

---

## TIMETABLE MODULE

| Permission                    | Description                    |
| ----------------------------- | ------------------------------ |
| `timetables:create`           | Add timetable                  |
| `timetables:read`             | View timetable details         |
| `timetables:update`           | Modify timetable               |
| `timetables:delete`           | Remove timetable               |
| `timetables:list`             | View timetables list           |
| `timetable_management:create` | Manage timetable               |
| `timetable_management:read`   | View timetable management      |
| `timetable_management:update` | Modify timetable management    |
| `timetable_management:delete` | Remove timetable management    |
| `timetable_management:list`   | View timetable management list |

---

## HOLIDAY MODULE

| Permission                  | Description                  |
| --------------------------- | ---------------------------- |
| `holidays:create`           | Add holiday                  |
| `holidays:read`             | View holiday details         |
| `holidays:update`           | Modify holiday               |
| `holidays:delete`           | Remove holiday               |
| `holidays:list`             | View holidays list           |
| `holiday_management:create` | Manage holiday               |
| `holiday_management:read`   | View holiday management      |
| `holiday_management:update` | Modify holiday management    |
| `holiday_management:delete` | Remove holiday management    |
| `holiday_management:list`   | View holiday management list |

---

## USER & ROLE MANAGEMENT

### User Management

| Permission               | Description       |
| ------------------------ | ----------------- |
| `user_management:list`   | View users list   |
| `user_management:read`   | View user details |
| `user_management:update` | Modify user       |

### Role Management

| Permission               | Description       |
| ------------------------ | ----------------- |
| `role_management:create` | Add role          |
| `role_management:read`   | View role details |
| `role_management:update` | Modify role       |
| `role_management:delete` | Remove role       |
| `role_management:list`   | View roles list   |

### Permission Management

| Permission                     | Description           |
| ------------------------------ | --------------------- |
| `permission_management:create` | Add permission        |
| `permission_management:read`   | View permission       |
| `permission_management:update` | Modify permission     |
| `permission_management:delete` | Remove permission     |
| `permission_management:list`   | View permissions list |

### Resource Permission Management

| Permission                              | Description                    |
| --------------------------------------- | ------------------------------ |
| `resource_permission_management:create` | Add resource permission        |
| `resource_permission_management:read`   | View resource permission       |
| `resource_permission_management:update` | Modify resource permission     |
| `resource_permission_management:delete` | Remove resource permission     |
| `resource_permission_management:list`   | View resource permissions list |

---

## MENU & SYSTEM

| Permission               | Description       |
| ------------------------ | ----------------- |
| `menu_management:create` | Add menu item     |
| `menu_management:read`   | View menu details |
| `menu_management:update` | Modify menu       |
| `menu_management:delete` | Remove menu       |
| `menu_management:list`   | View menus list   |

---

## REPORTS MODULE

| Permission             | Description          |
| ---------------------- | -------------------- |
| `fee_reports:read`     | View fee reports     |
| `staff_reports:read`   | View staff reports   |
| `student_reports:read` | View student reports |

---

## DASHBOARD & PROFILE

| Permission               | Description            |
| ------------------------ | ---------------------- |
| `parent_dashboard:read`  | View parent dashboard  |
| `staff_dashboard:read`   | View staff dashboard   |
| `student_profile:read`   | View student profile   |
| `student_profile:update` | Update student profile |
| `profile:read_own`       | View own profile       |
| `profile:update_own`     | Update own profile     |

---

## Frontend Integration Examples

### React/Next.js Integration

```javascript
// 1. Store permissions from login response
const handleLogin = async (credentials) => {
  const response = await loginAPI(credentials);
  // Response includes: { token, user, permissions }
  localStorage.setItem("permissions", JSON.stringify(response.permissions));
};

// 2. Create permission checker utility
const hasPermission = (resource, action) => {
  const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
  return permissions[resource]?.includes(action) || false;
};

// 3. Use in components - Button visibility
const StudentListPage = () => {
  const canCreate = hasPermission("students", "create");
  const canDelete = hasPermission("students", "delete");

  return (
    <div>
      {canCreate && <Button>Add Student</Button>}
      {canDelete && <Button>Delete Student</Button>}
    </div>
  );
};

// 4. Use in components - Menu items
const MenuItems = () => {
  const canViewFees = hasPermission("fee_categories", "list");
  const canViewStudents = hasPermission("students", "list");

  return (
    <Menu>
      {canViewStudents && <MenuItem>Students</MenuItem>}
      {canViewFees && <MenuItem>Fee Management</MenuItem>}
    </Menu>
  );
};

// 5. Use in components - Field-level access
const FeeForm = () => {
  const canApprove = hasPermission("fee_refunds", "approve");

  return (
    <Form>
      <Input name="amount" />
      {canApprove && <Button>Approve Refund</Button>}
    </Form>
  );
};

// 6. Route protection
const ProtectedRoute = ({ resource, action, children }) => {
  if (!hasPermission(resource, action)) {
    return <Navigate to="/unauthorized" />;
  }
  return children;
};

// Usage
<ProtectedRoute resource="students" action="list">
  <StudentListPage />
</ProtectedRoute>;
```

### Vue.js Integration

```javascript
// Permission plugin
const permissionPlugin = {
  install(app) {
    app.config.globalProperties.$hasPermission = (resource, action) => {
      const permissions = JSON.parse(
        localStorage.getItem("permissions") || "{}"
      );
      return permissions[resource]?.includes(action) || false;
    };
  },
};

// In components
<template>
  <div>
    <button v-if="$hasPermission('students', 'create')">Add Student</button>
  </div>
</template>;
```

### Angular Integration

```typescript
// Permission service
@Injectable({ providedIn: "root" })
export class PermissionService {
  private permissions: { [key: string]: string[] } = {};

  setPermissions(permissions: any) {
    this.permissions = permissions;
  }

  hasPermission(resource: string, action: string): boolean {
    return this.permissions[resource]?.includes(action) || false;
  }
}

// In components
export class StudentComponent {
  constructor(private permissionService: PermissionService) {}

  get canCreate() {
    return this.permissionService.hasPermission("students", "create");
  }
}
```

---

## Permission Response Format

When a user logs in, the API returns permissions in this format:

```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@school.com",
    "role": "Admin"
  },
  "permissions": {
    "students": ["create", "read", "update", "delete", "list", "read_related"],
    "fee_categories": ["create", "read", "update", "delete", "list"],
    "fee_transactions": ["create", "read", "update", "delete", "list"],
    "academic_years": ["create", "read", "update", "delete", "list", "approve"],
    "student_reports": ["read"],
    "fee_reports": ["read"]
  }
}
```

---

## Common Permission Patterns

### Menu Visibility

- Use `list` or `read` permission to show menu items
- Hide entire menu sections if user has no permissions for that module

### CRUD Operations

- **Create Button:** Check `create` permission
- **Edit Button:** Check `update` permission
- **Delete Button:** Check `delete` permission
- **View Details:** Check `read` permission
- **List/Grid View:** Check `list` permission

### Approval Workflows

- **Submit for Approval:** Check `create` permission
- **Approve/Reject:** Check `approve` permission
- **Process:** Check `process` permission

### Reports & Exports

- **View Report:** Check `read` permission
- **Export Data:** Check `export` permission
- **Download Files:** Check `download` permission

---

## Best Practices

1. **Cache Permissions:** Store permissions in local storage/state after login
2. **Logout Cleanup:** Clear permissions on logout
3. **Graceful Degradation:** Hide features instead of showing disabled buttons when possible
4. **Consistent Checking:** Use a centralized permission checker function
5. **Real-time Updates:** Refresh permissions if user role changes during session
6. **Error Handling:** Handle 403 Forbidden errors gracefully
7. **Loading States:** Show loading indicators while checking permissions
8. **Fallback UI:** Show appropriate messages when user lacks permissions

---

## Database Query Reference

To get all permissions for a role:

```sql
SELECT resource, action
FROM test_tenant_schema.resource_permissions
WHERE role_id = 'role-uuid-here'
  AND is_granted = true
ORDER BY resource, action;
```

To check if a user has a specific permission:

```sql
SELECT EXISTS (
  SELECT 1
  FROM test_tenant_schema.resource_permissions rp
  JOIN test_tenant_schema.users u ON u.role_id = rp.role_id
  WHERE u.id = 'user-uuid-here'
    AND rp.resource = 'students'
    AND rp.action = 'create'
    AND rp.is_granted = true
);
```

---

## Notes

- **Total Resources:** 67
- **Total Permission Combinations:** 304
- **SuperAdmin:** Bypasses all permission checks (has ultimate access)
- **Permission Inheritance:** Permissions are role-based, not user-specific
- **Multi-tenant:** Permissions are tenant-specific (stored in tenant schema)
- **Plan-based Access:** Higher-level plan restrictions apply before role permissions

---

## Support

For questions or issues with permissions:

- Check `context_guide.json` for authentication details
- Review `app/tools/enhanced_permissions.py` for permission decorator implementation
- Consult `app/service/auth/multi_tenant_auth_service.py` for permission retrieval logic
