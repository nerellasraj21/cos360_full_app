# Menu Restructure Review Document

**Date:** 2025-12-28
**Status:** Pending Review
**Schema Analyzed:** test_tenant_schema

---

## 1. Database Tables Involved

### 1.1 `menus` Table (tenant schema)

| Column        | Type         | Description                    |
|---------------|--------------|--------------------------------|
| id            | UUID         | Primary key                    |
| name          | VARCHAR(50)  | Menu display name              |
| url           | VARCHAR(100) | Frontend route path            |
| level         | VARCHAR(2)   | Hierarchy level (L0, L1, L2, L3) |
| parent_id     | UUID (FK)    | Parent menu reference          |
| display_order | INTEGER      | Sort order within level        |

### 1.2 `role_menu_permissions` Table

| Column   | Type    | Description                     |
|----------|---------|---------------------------------|
| id       | UUID    | Primary key                     |
| role_id  | UUID    | Reference to roles table        |
| menu_id  | UUID    | Reference to menus table        |
| can_view | BOOLEAN | Permission to see menu item     |
| can_edit | BOOLEAN | Permission to edit (unused?)    |

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

## 3. Current Menu Structure

### L0 - Top Level Navigation

| Order | Name            | URL                  | ID (first 8 chars) |
|-------|-----------------|----------------------|--------------------|
| 00    | Dashboard       | /dashboard           | 8cb23322           |
| 01    | Masters         | /masters/routeStops  | dfd80d48           |
| 02    | Students        | /students            | fbc4bfb1           |
| 03    | Fee Management  | /fees                | 6fb61634           |
| 04    | Transport       | /transport           | b415224d           |
| 05    | Reports         | /expense/reports     | 8792498d           |
| 06    | Administration  | /admin               | e0ad58c0           |

### L1 - Sub Navigation (by parent)

#### Masters (parent: dfd80d48)

| Order | Name                   | URL                           |
|-------|------------------------|-------------------------------|
| 07    | Academic Years         | /masters/academicyears        |
| 08    | Classes & Sections     | /masters/classesandsections   |
| 10    | Staff Management       | /staff                        |
| 13    | Subject Categories     | /masters/subjectcategories    |
| 14    | Subjects               | /masters/subjects             |
| 15    | Class Subject Mappings | /masters/classsubjectmappings |
| 17    | Holidays               | /masters/holidays             |
| 19    | Timetable Management   | /TimeTable                    |

#### Students (parent: fbc4bfb1)

| Order | Name                 | URL                          |
|-------|----------------------|------------------------------|
| 20    | Student Admissions   | /students/admission          |
| 21    | Student Attendance   | /students/attendance         |
| 22    | Student Documents    | /students/studentdocuments   |
| 23    | Student Certificates | /students/studentcertificates|
| 24    | Certificate Types    | /students/certificatetypes   |
| 25    | Student Transport    | /transport/studentTransport  |

#### Fee Management (parent: 6fb61634)

| Order | Name             | URL                |
|-------|------------------|--------------------|
| 26    | Fee Categories   | /fee/categories    |
| 27    | Fee Types        | /fee/types         |
| 28    | Fee Terms        | /fee/terms         |
| 30    | Fee Mappings     | /fee/mappings      |
| 31    | Fee Term Amounts | /fee/term-amounts  |
| 32    | Fee Collection   | /fee/transactions  |
| 33    | Fee Receipts     | /fee/receipts      |
| 34    | Fee Refunds      | /fee/refunds       |

#### Transport (parent: b415224d)

| Order | Name            | URL                   |
|-------|-----------------|-----------------------|
| 35    | Routes          | /transport/routes     |
| 36    | Route Stops     | /transport/routeStops |
| 37    | Vehicles        | /transport/vehicles   |
| 39    | Transport Trips | /masters/trips        |

#### Reports (parent: 8792498d)

| Order | Name             | URL                |
|-------|------------------|--------------------|
| 40    | Student Reports  | /reports/students  |
| 41    | Fee Reports      | /fee/reports       |
| 42    | Staff Reports    | /reports/staff     |
| 43    | Transport Reports| /reports/transport |
| 44    | Academic Reports | /reports/academic  |

#### Administration (parent: e0ad58c0)

| Order | Name                  | URL               |
|-------|-----------------------|-------------------|
| 45    | User Management       | /admin/users      |
| 46    | Role Management       | /admin/roles      |
| 47    | Permission Management | /admin/permissions|
| 48    | Menu Management       | /admin/menus      |

---

## 4. Issues & Observations

### 4.1 Display Order Gaps
Missing orders: 09, 11, 12, 16, 18, 29, 38

### 4.2 Inconsistent L0 URLs
| Menu           | Current URL          | Expected URL   |
|----------------|----------------------|----------------|
| Masters        | /masters/routeStops  | /masters       |
| Reports        | /expense/reports     | /reports       |

### 4.3 Inconsistent Child URLs
| Menu            | Current URL          | Parent  | Issue                    |
|-----------------|----------------------|---------|--------------------------|
| Staff Management| /staff               | Masters | Should be /masters/staff |
| Student Transport| /transport/studentTransport | Students | Should be /students/transport |
| Transport Trips | /masters/trips       | Transport | Should be /transport/trips |
| Timetable      | /TimeTable           | Masters | Inconsistent casing      |

### 4.4 No L2/L3 Menus
Currently only L0 and L1 levels are used. The system supports up to L3.

---

## 5. Roles with Menu Access

| Role Name          | Menu Items |
|--------------------|------------|
| Admin              | 41 (full)  |
| Staff              | varies     |
| Parent             | varies     |
| Student            | varies     |
| Driver             | varies     |
| LibraryManager     | varies     |
| (+ test roles)     | varies     |

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

| New Order | Name | New URL | Action |
|-----------|------|---------|--------|
| 00 | | | |
| 01 | | | |
| 02 | | | |
| ... | | | |

### New L1 Structure (per parent)

#### Under [Parent Name]

| New Order | Name | New URL | Action |
|-----------|------|---------|--------|
| | | | |

---

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

| Level | Order | Name | URL | Full ID | Parent ID |
|-------|-------|------|-----|---------|-----------|
| L0 | 00 | Dashboard | /dashboard | 8cb23322-0e9d-406f-9908-73bb6a82550f | NULL |
| L0 | 01 | Masters | /masters/routeStops | dfd80d48-67fd-4a80-aeec-5e51a5348d9d | NULL |
| L0 | 02 | Students | /students | fbc4bfb1-42eb-4816-b514-52fc2a98611e | NULL |
| L0 | 03 | Fee Management | /fees | 6fb61634-9000-4165-9ad7-435b9d71bc24 | NULL |
| L0 | 04 | Transport | /transport | b415224d-8058-40f7-8107-d15e7ef69dcc | NULL |
| L0 | 05 | Reports | /expense/reports | 8792498d-df9a-4a95-84a9-aa333e4e6844 | NULL |
| L0 | 06 | Administration | /admin | e0ad58c0-6c72-4930-9c24-f951ef0b42b5 | NULL |
| L1 | 07 | Academic Years | /masters/academicyears | fead4d8f-46fc-4b60-9cbd-88c3e1fc225a | dfd80d48-67fd-4a80-aeec-5e51a5348d9d |
| L1 | 08 | Classes & Sections | /masters/classesandsections | 64b8a80a-6d7a-4b81-a161-d8374ccd79ec | dfd80d48-67fd-4a80-aeec-5e51a5348d9d |
| L1 | 10 | Staff Management | /staff | bb2f9ca7-80fc-44c4-957e-ffa84dc1c181 | dfd80d48-67fd-4a80-aeec-5e51a5348d9d |
| L1 | 13 | Subject Categories | /masters/subjectcategories | 6e230039-387d-441a-8e9e-01bb0416a6eb | dfd80d48-67fd-4a80-aeec-5e51a5348d9d |
| L1 | 14 | Subjects | /masters/subjects | c2de843f-517d-4370-a670-3a44b857a777 | dfd80d48-67fd-4a80-aeec-5e51a5348d9d |
| L1 | 15 | Class Subject Mappings | /masters/classsubjectmappings | 132299aa-5c3a-4be6-8260-9d6e6fa630c5 | dfd80d48-67fd-4a80-aeec-5e51a5348d9d |
| L1 | 17 | Holidays | /masters/holidays | 7857839b-1fa6-48cd-b4ff-19b83ef6d2cc | dfd80d48-67fd-4a80-aeec-5e51a5348d9d |
| L1 | 19 | Timetable Management | /TimeTable | 6111b863-e6da-444d-a6a1-31c03c7b2cee | dfd80d48-67fd-4a80-aeec-5e51a5348d9d |
| L1 | 20 | Student Admissions | /students/admission | cf4c4594-eb27-4863-964d-56a7ebd3997a | fbc4bfb1-42eb-4816-b514-52fc2a98611e |
| L1 | 21 | Student Attendance | /students/attendance | 3cc15a0a-800c-4cd0-8986-3273da640a78 | fbc4bfb1-42eb-4816-b514-52fc2a98611e |
| L1 | 22 | Student Documents | /students/studentdocuments | 9772e642-0600-4242-aa7f-d79eee8959eb | fbc4bfb1-42eb-4816-b514-52fc2a98611e |
| L1 | 23 | Student Certificates | /students/studentcertificates | 4df6e384-bb0d-45f7-b035-8946e64454c0 | fbc4bfb1-42eb-4816-b514-52fc2a98611e |
| L1 | 24 | Certificate Types | /students/certificatetypes | 59b104a7-c8fb-4567-9cd2-a157e97b5018 | fbc4bfb1-42eb-4816-b514-52fc2a98611e |
| L1 | 25 | Student Transport | /transport/studentTransport | 57809a83-add0-48ac-894a-b6d2899863f1 | fbc4bfb1-42eb-4816-b514-52fc2a98611e |
| L1 | 26 | Fee Categories | /fee/categories | 766afdef-05e6-4195-b103-bd8198a33cfe | 6fb61634-9000-4165-9ad7-435b9d71bc24 |
| L1 | 27 | Fee Types | /fee/types | 694fb8ea-8aa4-444b-a551-550759ca79a9 | 6fb61634-9000-4165-9ad7-435b9d71bc24 |
| L1 | 28 | Fee Terms | /fee/terms | 2092884a-4fc9-40cd-bee8-99cc3c5a0212 | 6fb61634-9000-4165-9ad7-435b9d71bc24 |
| L1 | 30 | Fee Mappings | /fee/mappings | 4f804896-c88a-49b2-b4de-c6de3f1558c3 | 6fb61634-9000-4165-9ad7-435b9d71bc24 |
| L1 | 31 | Fee Term Amounts | /fee/term-amounts | bf6e49fb-ecf1-4ce9-8eaf-87a572916bf9 | 6fb61634-9000-4165-9ad7-435b9d71bc24 |
| L1 | 32 | Fee Collection | /fee/transactions | 46760949-79fc-49f7-93d0-9bdac2b50f07 | 6fb61634-9000-4165-9ad7-435b9d71bc24 |
| L1 | 33 | Fee Receipts | /fee/receipts | ecc64393-c892-4721-b630-47c199274609 | 6fb61634-9000-4165-9ad7-435b9d71bc24 |
| L1 | 34 | Fee Refunds | /fee/refunds | d7f5e4d5-63e0-42a1-aa44-1f22b6ea5cad | 6fb61634-9000-4165-9ad7-435b9d71bc24 |
| L1 | 35 | Routes | /transport/routes | 177774ab-89f6-405c-9ab9-20fd1fdfd27a | b415224d-8058-40f7-8107-d15e7ef69dcc |
| L1 | 36 | Route Stops | /transport/routeStops | 59a7e53b-aa6d-46c7-855d-d07004c4c287 | b415224d-8058-40f7-8107-d15e7ef69dcc |
| L1 | 37 | Vehicles | /transport/vehicles | 7dc5ae2c-17d5-42a6-a5bc-88b88ec3760c | b415224d-8058-40f7-8107-d15e7ef69dcc |
| L1 | 39 | Transport Trips | /masters/trips | 09fd0888-5569-40b9-969c-421bf9a47833 | b415224d-8058-40f7-8107-d15e7ef69dcc |
| L1 | 40 | Student Reports | /reports/students | 5687ca06-e8b4-488f-966c-290f8b4ac824 | 8792498d-df9a-4a95-84a9-aa333e4e6844 |
| L1 | 41 | Fee Reports | /fee/reports | e7395635-aa1b-4c41-b929-1be78e989e6f | 8792498d-df9a-4a95-84a9-aa333e4e6844 |
| L1 | 42 | Staff Reports | /reports/staff | 89a39c8f-f0a3-4ec7-9f1a-cb3f6572f4a4 | 8792498d-df9a-4a95-84a9-aa333e4e6844 |
| L1 | 43 | Transport Reports | /reports/transport | 729a3689-8e0c-490a-a574-cd4a19f48530 | 8792498d-df9a-4a95-84a9-aa333e4e6844 |
| L1 | 44 | Academic Reports | /reports/academic | 83216c1d-fa8d-41db-881d-3d238bef4422 | 8792498d-df9a-4a95-84a9-aa333e4e6844 |
| L1 | 45 | User Management | /admin/users | 29204691-4ea0-478e-84bd-5c6e4a349aa5 | e0ad58c0-6c72-4930-9c24-f951ef0b42b5 |
| L1 | 46 | Role Management | /admin/roles | 37cfe65d-dcf9-49c9-9e6b-1d64483b1564 | e0ad58c0-6c72-4930-9c24-f951ef0b42b5 |
| L1 | 47 | Permission Management | /admin/permissions | 9aa19eca-1b01-448f-8fe3-b29ff7f2efe0 | e0ad58c0-6c72-4930-9c24-f951ef0b42b5 |
| L1 | 48 | Menu Management | /admin/menus | 9e27304b-f4a9-4d13-8a6c-784354c33a57 | e0ad58c0-6c72-4930-9c24-f951ef0b42b5 |
