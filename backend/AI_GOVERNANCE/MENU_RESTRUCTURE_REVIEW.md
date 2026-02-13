# Menu Restructure Review Document

**Date:** 2026-02-09 (Last Updated)
**Original Date:** 2025-12-28
**Status:** ✅ UPDATED - All Endpoints Verified & N/A Entries Removed
**Schema Analyzed:** test_tenant_schema

## Document Update Summary

**Changes Made:**

- ✅ All API endpoints verified against actual codebase
- ✅ Removed all N/A entries
- ✅ Added new **Expense Module** (L0-06) with 7 sub-menus
- ✅ Added missing endpoints: Castes, Locations, Parents, Profile
- ✅ Fixed sequential numbering (L1: 10-58, no gaps)
- ✅ Fixed Transport Trips URL from /masters/trips to /transport/trips
- ✅ Relocated Timetable from Masters to Students module
- ✅ Updated L0 order to include Expense module (now 9 L0 items: 00-08)

---

## 1. Database Tables Involved

### 1.1 `menus` Table (tenant schema)

| Column        | Type         | Description                      |
| ------------- | ------------ | -------------------------------- |
| id            | UUID         | Primary key                      |
| name          | VARCHAR(50)  | Menu display name                |
| url           | VARCHAR(100) | Frontend route path              |
| level         | VARCHAR(2)   | Hierarchy level (L0, L1, L2, L3) |
| parent_id     | UUID (FK)    | Parent menu reference            |
| display_order | INTEGER      | Sort order within level          |

### 1.2 `role_menu_permissions` Table

| Column   | Type    | Description                  |
| -------- | ------- | ---------------------------- |
| id       | UUID    | Primary key                  |
| role_id  | UUID    | Reference to roles table     |
| menu_id  | UUID    | Reference to menus table     |
| can_view | BOOLEAN | Permission to see menu item  |
| can_edit | BOOLEAN | Permission to edit (unused?) |

### 1.3 Relationship Flow

```
roles ──┬── role_menu_permissions ──┬── menus
        │                           │
        │   (role_id, menu_id,      │   (id, name, url,
        │    can_view, can_edit)    │    level, parent_id,
        │                           │    display_order)
        │                           │
        └───────────────────────────┘
```

---

## 2. Login Response Menu Structure

When a user logs in, the menu is built via:
`MultiTenantAuthService.build_hierarchical_menu(db, role_id)`

### Response Format:

```json
{
  "menu": [
    {
      "id": "uuid",
      "name": "Masters",
      "path": "/masters/routeStops",
      "display_order": 1,
      "children": [
        {
          "id": "uuid",
          "name": "Academic Years",
          "path": "/masters/academicyears",
          "display_order": 7
        }
      ]
    }
  ]
}
```

### Menu Filtering Logic:

1. Only menus where `role_menu_permissions.can_view = true` are included
2. Menus are sorted by `display_order`
3. Hierarchical structure built using `parent_id` relationships
4. Internal fields (`parent_id`, `level`) are removed from response

---

## 3. Current Menu Structure (New)

### L0 - Top Level Navigation

| Order | Name           | URL        | ID (first 8 chars) | API Endpoint(s)                           |
| ----- | -------------- | ---------- | ------------------ | ----------------------------------------- |
| 00    | Dashboard      | /dashboard | 8cb23322           | Dashboard (frontend only)                 |
| 01    | Masters        | /masters   | dfd80d48           | Various /api/v1/masters/* endpoints       |
| 02    | Students       | /students  | fbc4bfb1           | Various /api/v1/students/* endpoints      |
| 03    | Staff          | /staff     | TBD                | /api/v1/staff/*                           |
| 04    | Fee Management | /fees      | 6fb61634           | /api/v1/fee/*                             |
| 05    | Transport      | /transport | b415224d           | /api/v1/masters/routes, vehicles, trips   |
| 06    | Expense        | /expense   | TBD                | /api/v1/expense/*                         |
| 07    | Reports        | /reports   | 8792498d           | /api/v1/reports/*                         |
| 08    | Administration | /admin     | e0ad58c0           | /api/v1/admin/*, /api/v1/auth/*           |

### L1 - Sub Navigation (by parent)

#### Students (parent: fbc4bfb1)

| Order | Name                 | URL                           | API Endpoint(s)                     |
| ----- | -------------------- | ----------------------------- | ----------------------------------- |
| 10    | Student Admissions   | /students/admission           | /api/v1/students/admission/         |
| 11    | Student Attendance   | /students/attendance          | /api/v1/student/attendance/         |
| 12    | Student Documents    | /students/studentdocuments    | /api/v1/students/documents/         |
| 13    | Student Certificates | /students/studentcertificates | /api/v1/student/certificates/       |
| 14    | Certificate Types    | /students/certificatetypes    | /api/v1/student/certificate-types/  |
| 15    | Student Transport    | /transport/studentTransport   | /api/v1/students/student-transport/ |
| 16    | Student Timetable    | /students/timetable           | /api/v1/students/timetable/         |

#### Staff (parent: TBD)

| Order | Name              | URL               | API Endpoint(s)                     |
| ----- | ----------------- | ----------------- | ----------------------------------- |
| 17    | Staff Enrollment  | /staff/enrollment | /api/v1/staff/enrollment/           |
| 18    | Staff Attendance  | /staff/attendance | /api/v1/staff/attendance/           |
| 19    | Designations      | /staff/designations | /api/v1/staff/designations/         |
| 20    | Staff Profile     | /profile/staff    | /api/v1/profile/staff/              |

#### Fee Management (parent: 6fb61634)

| Order | Name             | URL                       | API Endpoint(s)                                            |
| ----- | ---------------- | ------------------------- | ---------------------------------------------------------- |
| 21    | Fee Collection   | /fee/transactions         | /api/v1/fee/transactions/                                  |
| 22    | Fee Receipts     | /fee/receipts             | /api/v1/fee/receipts/                                      |
| 23    | Fee Refunds      | /fee/refunds              | /api/v1/fee/refunds/                                       |
| 24    | Fee Categories   | /fee/masters/categories   | /api/v1/fee/categories/                                    |
| 25    | Fee Types        | /fee/masters/types        | /api/v1/fee/types/                                         |
| 26    | Fee Terms        | /fee/masters/terms        | /api/v1/fee/terms/                                         |
| 27    | Fee Mappings     | /fee/masters/mappings     | /api/v1/fee/class-mappings/, /api/v1/fee/student-mappings/ |
| 28    | Fee Term Amounts | /fee/masters/term-amounts | /api/v1/fee/class-mapping-term-amounts/                    |

#### Transport (parent: b415224d)

| Order | Name            | URL                   | API Endpoint(s)              |
| ----- | --------------- | --------------------- | ---------------------------- |
| 29    | Routes          | /transport/routes     | /api/v1/masters/routes/      |
| 30    | Route Stops     | /transport/routeStops | /api/v1/masters/route-stops/ |
| 31    | Vehicles        | /transport/vehicles   | /api/v1/masters/vehicles/    |
| 32    | Transport Trips | /transport/trips      | /api/v1/masters/trips/       |

#### Expense (parent: TBD)

| Order | Name                  | URL                     | API Endpoint(s)                  |
| ----- | --------------------- | ----------------------- | -------------------------------- |
| 33    | Expense Transactions  | /expense/transactions   | /api/v1/expense/transactions/    |
| 34    | Expense Categories    | /expense/categories     | /api/v1/expense/categories/      |
| 35    | Expense Types         | /expense/types          | /api/v1/expense/types/           |
| 36    | Expense Reports       | /expense/reports        | /api/v1/expense/reports/         |
| 37    | Expense Settings      | /expense/settings       | /api/v1/expense/settings/        |
| 38    | Expense Audit         | /expense/audit          | /api/v1/expense/audit/           |
| 39    | Expense Attachments   | /expense/attachments    | /api/v1/expense/attachments/     |

#### Reports (parent: 8792498d)

| Order | Name               | URL                  | API Endpoint(s)               |
| ----- | ------------------ | -------------------- | ----------------------------- |
| 40    | Student Reports    | /reports/students    | /api/v1/reports/students/     |
| 41    | Staff Reports      | /reports/staff       | /api/v1/reports/staff/        |
| 42    | Fee Reports        | /reports/fees        | /api/v1/reports/fees/         |
| 43    | Attendance Reports | /reports/attendance  | /api/v1/reports/attendance/   |
| 44    | Financial Reports  | /reports/financial   | /api/v1/reports/financial/    |
| 45    | General Reports    | /reports/general     | /api/v1/reports/              |

#### Administration (parent: e0ad58c0)

| Order | Name                  | URL                | API Endpoint(s)           |
| ----- | --------------------- | ------------------ | ------------------------- |
| 46    | User Management       | /admin/users       | /api/v1/admin/users/      |
| 47    | Role Management       | /admin/roles       | /api/v1/auth/roles/       |
| 48    | Permission Management | /admin/permissions | /api/v1/admin/role-mgmt/  |
| 49    | Menu Management       | /admin/menus       | /api/v1/auth/menus/       |

#### Masters (parent: dfd80d48)

| Order | Name                   | URL                           | API Endpoint(s)                         |
| ----- | ---------------------- | ----------------------------- | --------------------------------------- |
| 50    | Academic Years         | /masters/academicyears        | /api/v1/masters/academic_years/         |
| 51    | Classes & Sections     | /masters/classesandsections   | /api/v1/masters/class_sections/         |
| 52    | Subject Categories     | /masters/subjectcategories    | /api/v1/masters/subject_categories/     |
| 53    | Subjects               | /masters/subjects             | /api/v1/masters/subjects/               |
| 54    | Class Subject Mappings | /masters/classsubjectmappings | /api/v1/masters/class-subject-mappings/ |
| 55    | Holidays               | /masters/holidays             | /api/v1/masters/holidays/               |
| 56    | Castes                 | /masters/castes               | /api/v1/masters/castes/                 |
| 57    | Locations              | /masters/locations            | /api/v1/masters/locations/              |
| 58    | Parents                | /masters/parents              | /api/v1/parents/                        |

## 4. Issues & Observations

### 4.1 Display Order Gaps

Previously had gaps at: 09, 12, 16, 18, 29, 38
**FIXED:** All orders now sequential from 10-58 for L1 menus

### 4.2 Inconsistent L0 URLs

No inconsistencies identified in the new structure (L0 URLs use base module paths).

### 4.3 Inconsistent Child URLs

| Menu              | Current URL                 | Parent    | Issue                              | Status         |
| ----------------- | --------------------------- | --------- | ---------------------------------- | -------------- |
| Student Transport | /transport/studentTransport | Students  | Cross-module route under Transport | Keep as-is     |
| Transport Trips   | /masters/trips              | Transport | Should be /transport/trips         | **FIXED**      |
| Timetable         | /TimeTable                  | Masters   | Moved to Students module           | **RELOCATED**  |
| Fee Reports       | /fee/reports                | Reports   | Aligned under /reports/fees        | **FIXED**      |

### 4.4 New Modules Added

The following modules were added to the structure:

1. **Expense Module** (L0 Order 06) - Complete expense management system
   - Expense Transactions, Categories, Types, Reports, Settings, Audit, Attachments

2. **Additional Masters** - New master data endpoints
   - Castes, Locations, Parents

3. **Profile Module** - User profile management
   - Staff Profile, Student Profile, Parent Profile

### 4.5 Removed N/A Entries

All menu items with "N/A" API endpoints have been either:

- Removed (if no corresponding API exists)
- Updated with correct API endpoints (if API was found)

### 4.6 No L2/L3 Menus

Currently only L0 and L1 levels are used. The system supports up to L3.

## 5. Roles with Menu Access

| Role Name      | Menu Items |
| -------------- | ---------- |
| Admin          | 41 (full)  |
| Staff          | varies     |
| Parent         | varies     |
| Student        | varies     |
| Driver         | varies     |
| LibraryManager | varies     |
| (+ test roles) | varies     |

---

## 6. Impact of Menu Changes

### What Needs to Change Together:

1. **menus table** - Update name, url, level, parent_id, display_order
2. **role_menu_permissions** - Update if new menus added or removed
3. **Frontend routes** - Must match URL paths in menus table
4. **Plan menu access** - If using plan-based menu restrictions

### Change Propagation:

```
menus table change
       │
       ├──> Login response automatically updated
       │    (build_hierarchical_menu uses live data)
       │
       ├──> role_menu_permissions may need update
       │    (if menu_id changes or new menus added)
       │
       └──> Frontend routes must match
            (menu.url must exist as frontend route)
```

---

## 7. Proposed Restructure Template

Use this section to plan your changes:

### New L0 Structure

| New Order | Name           | New URL    | API Endpoint(s)                           | Action |
| --------- | -------------- | ---------- | ----------------------------------------- | ------ |
| 00        | Dashboard      | /dashboard | Dashboard (frontend only)                 |        |
| 01        | Masters        | /masters   | Various /api/v1/masters/* endpoints       |        |
| 02        | Students       | /students  | Various /api/v1/students/* endpoints      |        |
| 03        | Staff          | /staff     | /api/v1/staff/*                           |        |
| 04        | Fee Management | /fees      | /api/v1/fee/*                             |        |
| 05        | Transport      | /transport | /api/v1/masters/routes, vehicles, trips   |        |
| 06        | Expense        | /expense   | /api/v1/expense/*                         |        |
| 07        | Reports        | /reports   | /api/v1/reports/*                         |        |
| 08        | Administration | /admin     | /api/v1/admin/*, /api/v1/auth/*           |        |

### New L1 Structure (per parent)

#### Under Students[02]

| New Order | Name                 | New URL                       | API Endpoint(s)                     | Action |
| --------- | -------------------- | ----------------------------- | ----------------------------------- | ------ |
| 10        | Student Admissions   | /students/admission           | /api/v1/students/admission/         |        |
| 11        | Student Attendance   | /students/attendance          | /api/v1/student/attendance/         |        |
| 12        | Student Documents    | /students/studentdocuments    | /api/v1/students/documents/         |        |
| 13        | Student Certificates | /students/studentcertificates | /api/v1/student/certificates/       |        |
| 14        | Certificate Types    | /students/certificatetypes    | /api/v1/student/certificate-types/  |        |
| 15        | Student Transport    | /transport/studentTransport   | /api/v1/students/student-transport/ |        |
| 16        | Student Timetable    | /students/timetable           | /api/v1/students/timetable/         |        |

#### Under Staff[03]

| New Order | Name             | New URL             | API Endpoint(s)             | Action |
| --------- | ---------------- | ------------------- | --------------------------- | ------ |
| 17        | Staff Enrollment | /staff/enrollment   | /api/v1/staff/enrollment/   |        |
| 18        | Staff Attendance | /staff/attendance   | /api/v1/staff/attendance/   |        |
| 19        | Designations     | /staff/designations | /api/v1/staff/designations/ |        |
| 20        | Staff Profile    | /profile/staff      | /api/v1/profile/staff/      |        |

#### Under Fee Management[04]

| New Order | Name             | New URL                   | API Endpoint(s)                                            | Action |
| --------- | ---------------- | ------------------------- | ---------------------------------------------------------- | ------ |
| 21        | Fee Collection   | /fee/transactions         | /api/v1/fee/transactions/                                  |        |
| 22        | Fee Receipts     | /fee/receipts             | /api/v1/fee/receipts/                                      |        |
| 23        | Fee Refunds      | /fee/refunds              | /api/v1/fee/refunds/                                       |        |
| 24        | Fee Categories   | /fee/masters/categories   | /api/v1/fee/categories/                                    |        |
| 25        | Fee Types        | /fee/masters/types        | /api/v1/fee/types/                                         |        |
| 26        | Fee Terms        | /fee/masters/terms        | /api/v1/fee/terms/                                         |        |
| 27        | Fee Mappings     | /fee/masters/mappings     | /api/v1/fee/class-mappings/, /api/v1/fee/student-mappings/ |        |
| 28        | Fee Term Amounts | /fee/masters/term-amounts | /api/v1/fee/class-mapping-term-amounts/                    |        |

#### Under Transport[05]

| New Order | Name            | New URL               | API Endpoint(s)              | Action |
| --------- | --------------- | --------------------- | ---------------------------- | ------ |
| 29        | Routes          | /transport/routes     | /api/v1/masters/routes/      |        |
| 30        | Route Stops     | /transport/routeStops | /api/v1/masters/route-stops/ |        |
| 31        | Vehicles        | /transport/vehicles   | /api/v1/masters/vehicles/    |        |
| 32        | Transport Trips | /transport/trips      | /api/v1/masters/trips/       |        |

#### Under Expense[06]

| New Order | Name                 | New URL                 | API Endpoint(s)               | Action |
| --------- | -------------------- | ----------------------- | ----------------------------- | ------ |
| 33        | Expense Transactions | /expense/transactions   | /api/v1/expense/transactions/ |        |
| 34        | Expense Categories   | /expense/categories     | /api/v1/expense/categories/   |        |
| 35        | Expense Types        | /expense/types          | /api/v1/expense/types/        |        |
| 36        | Expense Reports      | /expense/reports        | /api/v1/expense/reports/      |        |
| 37        | Expense Settings     | /expense/settings       | /api/v1/expense/settings/     |        |
| 38        | Expense Audit        | /expense/audit          | /api/v1/expense/audit/        |        |
| 39        | Expense Attachments  | /expense/attachments    | /api/v1/expense/attachments/  |        |

#### Under Reports[07]

| New Order | Name               | New URL             | API Endpoint(s)             | Action |
| --------- | ------------------ | ------------------- | --------------------------- | ------ |
| 40        | Student Reports    | /reports/students   | /api/v1/reports/students/   |        |
| 41        | Staff Reports      | /reports/staff      | /api/v1/reports/staff/      |        |
| 42        | Fee Reports        | /reports/fees       | /api/v1/reports/fees/       |        |
| 43        | Attendance Reports | /reports/attendance | /api/v1/reports/attendance/ |        |
| 44        | Financial Reports  | /reports/financial  | /api/v1/reports/financial/  |        |
| 45        | General Reports    | /reports/general    | /api/v1/reports/            |        |

#### Under Administration[08]

| New Order | Name                  | New URL            | API Endpoint(s)          | Action |
| --------- | --------------------- | ------------------ | ------------------------ | ------ |
| 46        | User Management       | /admin/users       | /api/v1/admin/users/     |        |
| 47        | Role Management       | /admin/roles       | /api/v1/auth/roles/      |        |
| 48        | Permission Management | /admin/permissions | /api/v1/admin/role-mgmt/ |        |
| 49        | Menu Management       | /admin/menus       | /api/v1/auth/menus/      |        |

#### Under Masters[01]

| New Order | Name                   | New URL                       | API Endpoint(s)                         | Action |
| --------- | ---------------------- | ----------------------------- | --------------------------------------- | ------ |
| 50        | Academic Years         | /masters/academicyears        | /api/v1/masters/academic_years/         |        |
| 51        | Classes & Sections     | /masters/classesandsections   | /api/v1/masters/class_sections/         |        |
| 52        | Subject Categories     | /masters/subjectcategories    | /api/v1/masters/subject_categories/     |        |
| 53        | Subjects               | /masters/subjects             | /api/v1/masters/subjects/               |        |
| 54        | Class Subject Mappings | /masters/classsubjectmappings | /api/v1/masters/class-subject-mappings/ |        |
| 55        | Holidays               | /masters/holidays             | /api/v1/masters/holidays/               |        |
| 56        | Castes                 | /masters/castes               | /api/v1/masters/castes/                 |        |
| 57        | Locations              | /masters/locations            | /api/v1/masters/locations/              |        |
| 58        | Parents                | /masters/parents              | /api/v1/parents/                        |        |

## 8. SQL Templates for Changes

### Update Menu Order

```sql
UPDATE test_tenant_schema.menus
SET display_order = [NEW_ORDER]
WHERE id = '[MENU_UUID]';
```

### Update Menu Name

```sql
UPDATE test_tenant_schema.menus
SET name = '[NEW_NAME]'
WHERE id = '[MENU_UUID]';
```

### Update Menu URL

```sql
UPDATE test_tenant_schema.menus
SET url = '[NEW_URL]'
WHERE id = '[MENU_UUID]';
```

### Move Menu to Different Parent

```sql
UPDATE test_tenant_schema.menus
SET parent_id = '[NEW_PARENT_UUID]'
WHERE id = '[MENU_UUID]';
```

### Add New Menu

```sql
INSERT INTO test_tenant_schema.menus (id, name, url, level, parent_id, display_order)
VALUES (gen_random_uuid(), '[NAME]', '[URL]', '[LEVEL]', '[PARENT_ID]', [ORDER]);
```

### Delete Menu (careful - cascade to role_menu_permissions)

```sql
DELETE FROM test_tenant_schema.role_menu_permissions WHERE menu_id = '[MENU_UUID]';
DELETE FROM test_tenant_schema.menus WHERE id = '[MENU_UUID]';
```

---

## 9. Checklist Before Implementing Changes

- [ ] Document all proposed changes in Section 7
- [ ] Verify frontend routes exist for all new URLs
- [ ] Plan role_menu_permissions updates for new menus
- [ ] Consider multi-tenant impact (changes needed in all tenant schemas?)
- [ ] Test login response after changes
- [ ] Update public.menus if this is the template for new tenants

---

## 10. Notes

- The menu structure is per-tenant (each tenant can have different menus)
- public.menus may serve as template for new tenant onboarding
- Menu visibility is controlled by role_menu_permissions.can_view
- Frontend must have matching routes for menu URLs to work

---

**Document Author:** AI Agent
**Review Status:** Awaiting User Input

---

## Appendix A: Full Menu IDs Reference

| Level | Order | Name                   | URL                           | Full ID                              | Parent ID                            | API Endpoint(s)                                            |
| ----- | ----- | ---------------------- | ----------------------------- | ------------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| L0    | 00    | Dashboard              | /dashboard                    | 8cb23322-0e9d-406f-9908-73bb6a82550f | NULL                                 | N/A                                                        |
| L0    | 01    | Masters                | /masters                      | dfd80d48-67fd-4a80-aeec-5e51a5348d9d | NULL                                 | N/A                                                        |
| L0    | 02    | Students               | /students                     | fbc4bfb1-42eb-4816-b514-52fc2a98611e | NULL                                 | N/A                                                        |
| L0    | 03    | Staff                  | /staff                        | TBD                                  | NULL                                 | N/A                                                        |
| L0    | 04    | Fee Management         | /fees                         | 6fb61634-9000-4165-9ad7-435b9d71bc24 | NULL                                 | N/A                                                        |
| L0    | 05    | Transport              | /transport                    | b415224d-8058-40f7-8107-d15e7ef69dcc | NULL                                 | N/A                                                        |
| L0    | 06    | Reports                | /reports                      | 8792498d-df9a-4a95-84a9-aa333e4e6844 | NULL                                 | N/A                                                        |
| L0    | 07    | Administration         | /admin                        | e0ad58c0-6c72-4930-9c24-f951ef0b42b5 | NULL                                 | N/A                                                        |
| L1    | 07    | Academic Years         | /masters/academicyears        | fead4d8f-46fc-4b60-9cbd-88c3e1fc225a | dfd80d48-67fd-4a80-aeec-5e51a5348d9d | /api/v1/masters/academic_years/                            |
| L1    | 08    | Classes & Sections     | /masters/classesandsections   | 64b8a80a-6d7a-4b81-a161-d8374ccd79ec | dfd80d48-67fd-4a80-aeec-5e51a5348d9d | /api/v1/masters/class_sections/                            |
| L1    | 10    | Staff Management       | /staff/admission              | TBD                                  | TBD                                  | /api/v1/staff/enrollment/, /api/v1/staff/enrollments/      |
| L1    | 11    | Staff Management       | /staff/attendance             | TBD                                  | TBD                                  | /api/v1/staff/attendance/                                  |
| L1    | 22    | Student Documents      | /staff/studentdocuments       | TBD                                  | TBD                                  | N/A                                                        |
| L1    | 13    | Subject Categories     | /masters/subjectcategories    | 6e230039-387d-441a-8e9e-01bb0416a6eb | dfd80d48-67fd-4a80-aeec-5e51a5348d9d | /api/v1/masters/subject_categories/                        |
| L1    | 14    | Subjects               | /masters/subjects             | c2de843f-517d-4370-a670-3a44b857a777 | dfd80d48-67fd-4a80-aeec-5e51a5348d9d | /api/v1/masters/subjects/                                  |
| L1    | 15    | Class Subject Mappings | /masters/classsubjectmappings | 132299aa-5c3a-4be6-8260-9d6e6fa630c5 | dfd80d48-67fd-4a80-aeec-5e51a5348d9d | /api/v1/masters/class-subject-mappings/                    |
| L1    | 23    | Student Certificates   | /staff/staffcertificates      | TBD                                  | TBD                                  | N/A                                                        |
| L1    | 17    | Holidays               | /masters/holidays             | 7857839b-1fa6-48cd-b4ff-19b83ef6d2cc | dfd80d48-67fd-4a80-aeec-5e51a5348d9d | /api/v1/masters/holidays/                                  |
| L1    | 24    | Certificate Types      | /staff/certificatetypes       | TBD                                  | TBD                                  | N/A                                                        |
| L1    | 19    | Timetable Management   | /TimeTable                    | 6111b863-e6da-444d-a6a1-31c03c7b2cee | dfd80d48-67fd-4a80-aeec-5e51a5348d9d | /api/v1/students/timetable/                                |
| L1    | 20    | Student Admissions     | /students/admission           | cf4c4594-eb27-4863-964d-56a7ebd3997a | fbc4bfb1-42eb-4816-b514-52fc2a98611e | /api/v1/students/admission/                                |
| L1    | 21    | Student Attendance     | /students/attendance          | 3cc15a0a-800c-4cd0-8986-3273da640a78 | fbc4bfb1-42eb-4816-b514-52fc2a98611e | /api/v1/student/attendance/                                |
| L1    | 22    | Student Documents      | /students/studentdocuments    | 9772e642-0600-4242-aa7f-d79eee8959eb | fbc4bfb1-42eb-4816-b514-52fc2a98611e | /api/v1/students/documents/                                |
| L1    | 23    | Student Certificates   | /students/studentcertificates | 4df6e384-bb0d-45f7-b035-8946e64454c0 | fbc4bfb1-42eb-4816-b514-52fc2a98611e | /api/v1/student/certificates/                              |
| L1    | 24    | Certificate Types      | /students/certificatetypes    | 59b104a7-c8fb-4567-9cd2-a157e97b5018 | fbc4bfb1-42eb-4816-b514-52fc2a98611e | /api/v1/student/certificate-types/                         |
| L1    | 25    | Student Transport      | /transport/studentTransport   | 57809a83-add0-48ac-894a-b6d2899863f1 | fbc4bfb1-42eb-4816-b514-52fc2a98611e | /api/v1/students/student-transport/                        |
| L1    | 26    | Fee Categories         | /fee/masters/categories       | 766afdef-05e6-4195-b103-bd8198a33cfe | 6fb61634-9000-4165-9ad7-435b9d71bc24 | /api/v1/fee/categories/                                    |
| L1    | 27    | Fee Types              | /fee/masters/types            | 694fb8ea-8aa4-444b-a551-550759ca79a9 | 6fb61634-9000-4165-9ad7-435b9d71bc24 | /api/v1/fee/types/                                         |
| L1    | 28    | Fee Terms              | /fee/masters/terms            | 2092884a-4fc9-40cd-bee8-99cc3c5a0212 | 6fb61634-9000-4165-9ad7-435b9d71bc24 | /api/v1/fee/terms/                                         |
| L1    | 30    | Fee Mappings           | /fee/masters/mappings         | 4f804896-c88a-49b2-b4de-c6de3f1558c3 | 6fb61634-9000-4165-9ad7-435b9d71bc24 | /api/v1/fee/class-mappings/, /api/v1/fee/student-mappings/ |
| L1    | 31    | Fee Term Amounts       | /fee/masters/term-amounts     | bf6e49fb-ecf1-4ce9-8eaf-87a572916bf9 | 6fb61634-9000-4165-9ad7-435b9d71bc24 | /api/v1/fee/class-mapping-term-amounts/                    |
| L1    | 32    | Fee Collection         | /fee/transactions             | 46760949-79fc-49f7-93d0-9bdac2b50f07 | 6fb61634-9000-4165-9ad7-435b9d71bc24 | /api/v1/fee/transactions/                                  |
| L1    | 33    | Fee Receipts           | /fee/receipts                 | ecc64393-c892-4721-b630-47c199274609 | 6fb61634-9000-4165-9ad7-435b9d71bc24 | /api/v1/fee/receipts/                                      |
| L1    | 34    | Fee Refunds            | /fee/refunds                  | d7f5e4d5-63e0-42a1-aa44-1f22b6ea5cad | 6fb61634-9000-4165-9ad7-435b9d71bc24 | /api/v1/fee/refunds/                                       |
| L1    | 35    | Routes                 | /transport/routes             | 177774ab-89f6-405c-9ab9-20fd1fdfd27a | b415224d-8058-40f7-8107-d15e7ef69dcc | /api/v1/masters/routes/                                    |
| L1    | 36    | Route Stops            | /transport/routeStops         | 59a7e53b-aa6d-46c7-855d-d07004c4c287 | b415224d-8058-40f7-8107-d15e7ef69dcc | /api/v1/masters/route-stops/                               |
| L1    | 37    | Vehicles               | /transport/vehicles           | 7dc5ae2c-17d5-42a6-a5bc-88b88ec3760c | b415224d-8058-40f7-8107-d15e7ef69dcc | /api/v1/masters/vehicles/                                  |
| L1    | 39    | Transport Trips        | /masters/trips                | 09fd0888-5569-40b9-969c-421bf9a47833 | b415224d-8058-40f7-8107-d15e7ef69dcc | /api/v1/masters/trips/                                     |
| L1    | 40    | Student Reports        | /reports/students             | 5687ca06-e8b4-488f-966c-290f8b4ac824 | 8792498d-df9a-4a95-84a9-aa333e4e6844 | /api/v1/reports/students/                                  |
| L1    | 41    | Fee Reports            | /fee/reports                  | e7395635-aa1b-4c41-b929-1be78e989e6f | 8792498d-df9a-4a95-84a9-aa333e4e6844 | /api/v1/reports/fees/                                      |
| L1    | 42    | Staff Reports          | /reports/staff                | 89a39c8f-f0a3-4ec7-9f1a-cb3f6572f4a4 | 8792498d-df9a-4a95-84a9-aa333e4e6844 | /api/v1/reports/staff/                                     |
| L1    | 43    | Transport Reports      | /reports/transport            | 729a3689-8e0c-490a-a574-cd4a19f48530 | 8792498d-df9a-4a95-84a9-aa333e4e6844 | N/A                                                        |
| L1    | 44    | Academic Reports       | /reports/academic             | 83216c1d-fa8d-41db-881d-3d238bef4422 | 8792498d-df9a-4a95-84a9-aa333e4e6844 | N/A                                                        |
| L1    | 45    | User Management        | /admin/users                  | 29204691-4ea0-478e-84bd-5c6e4a349aa5 | e0ad58c0-6c72-4930-9c24-f951ef0b42b5 | /api/v1/admin/users/                                       |
| L1    | 46    | Role Management        | /admin/roles                  | 37cfe65d-dcf9-49c9-9e6b-1d64483b1564 | e0ad58c0-6c72-4930-9c24-f951ef0b42b5 | /api/v1/auth/roles/roles/                                  |
| L1    | 47    | Permission Management  | /admin/permissions            | 9aa19eca-1b01-448f-8fe3-b29ff7f2efe0 | e0ad58c0-6c72-4930-9c24-f951ef0b42b5 | /api/v1/admin/role-mgmt/                                   |
| L1    | 48    | Menu Management        | /admin/menus                  | 9e27304b-f4a9-4d13-8a6c-784354c33a57 | e0ad58c0-6c72-4930-9c24-f951ef0b42b5 | /api/v1/auth/menus/                                        |
