# Role-Based Permission Guards — Implementation Summary

All changes enforce UI-level permission guards so that staff users only see actions they are authorized to perform. The backend remains the authoritative enforcer; these changes only hide/disable controls from the UI.

---

## Pattern Applied

```typescript
const { checkPermission } = usePermission();
const canCreate = checkPermission('resource', 'create');
const canUpdate = checkPermission('resource', 'update');
const canDelete = checkPermission('resource', 'delete');

// Gate buttons
{canCreate && <Button>Add</Button>}

// Gate inputs
<Input readOnly={!canWrite} />
```

---

## Files Changed

### 1. Holidays — `src/api/hooks/masters/holiday.ts`
- Removed `enabled: hasListPermission` from `useHolidays`, `useHoliday`, `useHolidaysDropdown`
- **Why:** `enabled: hasPermission` silently blocks fetches when permission key doesn't match; backend should return 403 instead

---

### 2. Exam List — `src/pages/exam/ExamList.tsx`
- Backend permissions: staff has no edit/delete on exams
- Actions column guard changed from `!isParent` → `isAdmin`
- Removed unused `isParent` variable

---

### 3. Fee Categories — `src/hooks/fee/useFeeCategories.ts`
- Removed `enabled: hasListPermission` from `useFeeCategories` and `useFeeCategory`

### Fee Category Tree — `src/components/fee/categories/FeeCategoryTree.tsx`
- Backend: `fee_categories` → `read, list` only for staff
- Separated `canViewTypes` from `canManageTypes` (`fee_types: create | update | delete`)
- `+` (Manage Fee Types) button gated on `canManageTypes`, not `canViewTypes`

---

### 4. Fee Terms — `src/components/fee/terms/FeeTermsList.tsx`
- Backend: `fee_terms` → `read, list` only
- Gated: Add New Term, Create First Term, Payment Dates, Edit, Delete, Actions column

---

### 5. Class Mappings — `src/components/fee/mappings/ClassMappingTable.tsx`
- Backend: `fee_class_mappings` → `read, list` only
- Gated: Add Mapping, Create First Mapping, Calculator, Edit, Delete, Actions column

---

### 6. Term Amount Modal — `src/components/fee/mappings/TermAmountModal.tsx`
- Backend: `fee_class_mapping_term_amounts` → `read, list` only
- Gated: Distribution buttons, amount inputs (`readOnly`), Save button

---

### 7. Fee Transactions — `src/pages/fee/FeeTransactions.tsx`
- Backend: `fee_transactions` → `create, read, list, update`
- Fixed: PermissionGuard was using `permissions={[...]}` array prop (wrong component) → changed to `resource="fee_transactions" action="list"`
- Added `canCreate` (New Transaction), `canUpdate` (Generate Receipt, Mark Completed, Cancel)

---

### 8. Fee Receipts — `src/pages/fee/Receipts.tsx`
- Fixed: Same PermissionGuard wrong-props bug → changed to `resource="fee_receipts" action="list"`
- Was causing "Access Denied" for ALL users

### Receipt Management — `src/components/fee/receipts/ReceiptManagement.tsx`
- Backend: `fee_receipts` → `create, read, list, update`
- Added `canCreate` (Generate Receipt), `canUpdate` (Reprint Receipt)

---

### 9. Concessions — `src/pages/fee/FeeCollection/ConcessionTab.tsx`
- Backend: `fee_concessions` → `create, read, update, delete`
- Gated: Save All Concessions, amount inputs (`readOnly/disabled` when !canCreate), Edit/Delete in history, Actions column

---

### 10. Old Fees — `src/pages/fee/FeeCollection/OldFeeTab.tsx`
- Backend: `fee_old` → `create, read, list, update, delete`
- Gated: Add Manual Entry, Carry Forward, Edit, Settle, Delete, Actions column

---

### 11. Expense Categories — `src/components/expense/ExpenseCategories.tsx`
- Backend: `expense_categories` → `create, read, list, update` (no delete)
- Gated: New Category, Edit; Delete button hidden (no delete permission)

---

### 12. Expense Transactions — `src/components/expense/ExpenseTransactions.tsx`
- Backend: `expense_transactions` → `create, read, list, update` (no delete)
- Gated: New Transaction (`canCreate`), Edit (`canUpdate`); Delete button hidden

---

### 13. Staff Attendance Table — `src/components/staff/StaffAttendanceTable.tsx`
- Backend: `staff_attendance` → `create, read, update` (no delete)
- Gated: Record Attendance button, Present/Absent quick-mark (`canCreate`), Edit (`canUpdate`); Delete hidden

---

### 14. Parents Table — `src/components/masters/parents/ParentsTable.tsx`
- Backend: `parent_management` → `create, read, list, update` (no delete)
- Gated: Add Parent, Create First Parent Profile, Edit; Delete button hidden

---

### 15. Staff Landing Page — `src/pages/staff/staff.tsx`
- Staff Attendance card PermissionGuard changed from `action="list"` → `action="read"`
- **Why:** Staff role has `staff_attendance: create, read, update` — no `list` action, so the card was hidden

---

### 16. Staff Attendance Page — `src/pages/staff/attendance.tsx`

#### Save mechanism rewrite (matching student attendance pattern)
- Replaced mutation hooks (`useCreateStaffAttendance`, `useUpdateStaffAttendance`, `useDeleteStaffAttendance`) with direct API function imports
- `handleSave` now calls `createStaffAttendance`, `updateStaffAttendance`, `deleteStaffAttendance` directly in parallel
- After save, manually updates `existingAttendances` state so React Query auto-refetch doesn't wipe saved data
- Also patches `staffAttendances` Map in-place for immediate UI update

#### Permission guards added
- Backend: `staff_attendance` → `create, read, update`
- `canWrite = canCreate || canUpdate`
- Status dropdowns shown as interactive `<Select>` when `canWrite`, plain text when read-only
- "Save Attendance" button hidden when `!canWrite`

---

### 17. Staff Profile — `src/pages/staff/StaffProfile.tsx`
- Backend: `profile` → `read_own, update_own`
- "edit email & phone" button and edit Dialog wrapped in `canUpdateOwn` (`profile:update_own`)

---

### 18. Communications — `src/pages/Communication/index.tsx`
- Backend: `communications` → `create, read, list, update`
- "New Template" header button gated on `communications:create`

### ComposeTab — `src/pages/Communication/ComposeTab.tsx`
- "Send Now" block and "Confirm & Send" button gated on `communications:create`

### TemplatesTab — `src/pages/Communication/TemplatesTab.tsx`
- "+ New Template" button gated on `communications:create`
- Edit button gated on `communications:update`
- Deactivate button gated on `communications:update` (deactivate = set is_active=false, maps to update)
- Applied to both desktop table and mobile card layout

---

### 19. Certificate Upload Page — `src/pages/students/CertificateUploadPage.tsx`
- Backend: `issuable_certificates` → `create, read, list` (no delete)
- Entire upload card (Received Document + Issue Certificate) shown only when `canCreate`
- Delete button and confirm dialog **removed** from certificates table (no delete permission)
- Download button remains accessible (read)

---

### 20. Timetable Editor — `src/pages/masters/TimeTableEditor.tsx`
- Backend: `timetable_management` → `read, update`
- Edit/Save toggle button gated on `canUpdate`
- Saturday toggle gated on `canUpdate`
- Add Subject Row, Add Special Row, Repeat All for Week, Repeat One Subject — all gated on `canUpdate`
- Per-row Delete button gated on `canUpdate`
- `isEditing` auto-initializes to `false` (not `true`) when no timetable exists and user has no update permission

---

## Bug Fixes

### PermissionGuard Wrong Props Bug
`src/components/common/PermissionGuard.tsx` only accepts `resource` and `action` as separate string props.
Several files were mistakenly using `permissions={[["resource","action"],...]}` array syntax (from a different, advanced PermissionGuard component). This caused `resource` and `action` to be `undefined`, making `checkPermission(undefined, undefined)` always return `false` → Access Denied for everyone.

**Fixed in:** `FeeTransactions.tsx`, `Receipts.tsx`

### Permission Gate on React Query Hooks Bug
Using `enabled: hasListPermission` in `useQuery` silently blocks data fetching when the permission key doesn't match the stored permissions format. The fetch never fires, data is always `undefined`, and no error is shown to the user.

**Rule:** Never use `enabled: hasPermission` in read hooks. Always let the query fire; let the backend return 403 if unauthorized.

**Fixed in:** `holiday.ts`, `useFeeCategories.ts`
