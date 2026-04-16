# COS360 Frontend - Updates Changelog

## Recent Updates (Latest Session - Apr 7, 2026 - Part 3)

### 1. ✅ Dark Mode Icon Visibility - DatePicker & TimePicker Icons

**Files:**

- `src/components/ui/DatePicker.tsx`
- `src/components/ui/TimePicker.tsx`

**Issue:** Calendar and Clock icons in date/time pickers were nearly invisible in dark mode.

**Root Cause:**

- Icons used `opacity-50` on white foreground color (dark mode default)
- 50% opacity on white = very faint light gray on dark background = barely visible
- Light mode was fine because 50% opacity on dark text was still visible

**Solution Implemented:**

- **DatePicker.tsx** (Line 62): CalendarIcon changed from `opacity-50` to `opacity-75`
- **TimePicker.tsx** (Line 106): Clock icon changed from `opacity-50` to `opacity-75`

**Why `opacity-75`:**

- Light mode: 75% opacity on dark foreground = clearly visible ✓
- Dark mode: 75% opacity on white = much brighter than 50% ✓
- Provides good balance between visibility and "secondary icon" visual treatment

**Modules Affected (All Now Fixed):**

- Staff Enrollment (Form & Table) - `StaffEnrollmentForm.tsx`, `StaffEnrollmentTable.tsx`
- Staff Table - `StaffTable.tsx`
- Exam Management - `ExamDates.tsx` (TimePicker)
- Timetable Editor - `TimeTableEditor.tsx` (TimePicker)
- Transport Routes - `routes.tsx` (TimePicker)
- Transport Route Stops - `routeStops.tsx` (TimePicker)
- Masters Pages - `MasterPage.tsx` (TimePicker)

**Result:** All date/time picker icons are now clearly visible and consistent across light and dark modes.

---

## Recent Updates (Latest Session - Apr 7, 2026 - Part 2)

### 1. ✅ Staff Enrollment Form - Fixed Footer Buttons

**Files:**

- `src/components/staff/StaffEnrollmentForm.tsx`
- `src/components/staff/StaffEnrollmentTable.tsx`

**Issue:** Form buttons (Cancel/Save) were scrolling with form content, not staying visible at bottom.

**Solution Implemented:**
- **StaffEnrollmentForm.tsx** (standalone form):
  - Changed Card layout to `flex flex-col max-h-[90vh]`
  - CardHeader set to `flex-shrink-0` (stays at top)
  - CardContent changed to `overflow-y-auto flex-1` (scrollable content area)
  - Buttons moved to separate footer div with `flex-shrink-0 border-t px-6 py-4`
  - Buttons now stay fixed at bottom while form scrolls above

- **StaffEnrollmentTable.tsx** (dialog form):
  - DialogContent: `max-w-2xl flex flex-col max-h-[90vh] p-0`
  - DialogHeader: `flex-shrink-0 px-6 py-4 border-b`
  - Form grid wrapped in: `overflow-y-auto flex-1 px-6 py-4`
  - Footer: Replaced `DialogFooter` with custom div: `flex-shrink-0 border-t px-6 py-4 flex justify-end gap-3 bg-card`

**Result:** Users must scroll through all form fields (Basic Info → Professional Info → Work Experience → Bank Details → Salary & PF → PF Account Number/UAN Number) to reach the fixed Cancel/Save buttons at the bottom.

### 2. ✅ Sidebar - Critical Syntax Error Fix
**File:** `src/components/ui/sidebar.tsx` (Line 606)

**Issue:** Arrow function syntax error blocking app compilation
- Changed from: `hoveredPath.map((id, level) => (` (expression syntax)
- To: `hoveredPath.map((id, level) => {` (block syntax)

**Why:** Expression syntax `=> (` cannot contain variable declarations (`const`). Block syntax `=> {` allows variable declarations and explicit returns.

**Impact:** 
- Vite dev server was failing to compile with: "[vite] Failed to reload /@fs/.../sidebar.tsx"
- Fix restored app compilation and development server functionality

### 3. ✅ Sidebar - React Duplicate Key Warnings
**File:** `src/components/ui/sidebar.tsx`

**Issue:** Backend returns menu items with duplicate IDs, causing React reconciliation errors:
- Error: "Encountered two children with the same key, `8`"

**Solution:** Created composite keys using index/level parameters:
- **Line 355** (recursive submenus): `key={`${child.id}-${index}`}`
- **Line 586** (main menu items): `key={`${item.id}-${index}`}`
- **Line 620, 653, 667** (floating submenu portal):
  - `key={`submenu-${id}-${level}`}` (single item)
  - `key={`submenu-children-${id}-${level}`}` (with children)
  - `key={`submenu-${id}-${child.id}-${childIndex}`}` (child items)
  - Line 689: Added `.filter(Boolean)` to remove null items from portal

**Result:** React now correctly identifies and tracks menu items even with duplicate IDs from backend.

### 4. ✅ Fee Payment Form - Dark Mode & Data Fixes
**Files:**
- `src/pages/fee/FeeCollection/FeePaymentTab.tsx`
- `src/components/fee/categories/FeeCategoryTree.tsx`

**Issues Fixed:**
1. **Dark Mode Contrast:** Text was invisible on dark backgrounds
   - Changed from hardcoded colors: `text-gray-900`, `text-gray-500`, `text-gray-600`, `border-gray-200`, `hover:bg-gray-50`
   - To theme utilities: `text-foreground`, `text-muted-foreground`, `border-border`, `hover:bg-muted`
   - Applied across both components

2. **Form Data Cleaning:** Optional fields were sending `undefined` values to API
   - Added conditional inclusion of optional fields (lines 140-145)
   - Only sends: `upi_reference`, `bank_reference`, `cheque_number`, `cheque_bank`, `cheque_date`, `remarks` if they have values
   - Prevents validation errors on backend for empty optional fields

3. **Form Validation:** Enhanced disabled state on submit button
   - Button disabled when: `isPending || !amountToPay || amountToPay <= 0 || Object.keys(errors).length > 0`

**Result:**
- Fee form is now visible and usable in dark mode
- Payment submission succeeds by only sending populated fields
- User-friendly error display with inline validation messages

---

## Previous Updates (Earlier Session)

### 1. ✅ Exam Management - Inline Actions
**File:** `src/pages/exam/ExamList.tsx`
- Changed exam list actions from dropdown menu to inline icon buttons
- **Edit button** (pencil icon) - Always visible, allows editing exam details
- **Delete button** (trash icon) - Visible for all exams (removed status restriction)
- Made Actions column sticky on the right for better UX with horizontal scroll
- Enabled horizontal scrolling when table is wider than container
- Removed Clone Exam functionality completely
- Removed MoreHorizontal dropdown menu component

**Changes:**
- Removed imports: `Copy`, `MoreHorizontal`, `useCloneExam`, `DropdownMenu` components
- Replaced dropdown menu with inline flex container with two buttons
- Added sticky positioning to Actions column header and cells
- Changed table wrapper from `overflow-hidden` to `overflow-x-auto`

### 2. ✅ Student Admission - Guardian Details
**Files:** 
- `src/types/admission.ts`
- `src/components/students/admission-steps/ParentsStepForm.tsx`
- `src/components/students/MultiStepAdmissionForm.tsx`

**Features Added:**
- Optional "Guardian's Information" section in Parents step
- Fields included:
  - Guardian Name (optional)
  - Guardian Email (optional)
  - Guardian Phone (optional)
  - Guardian Occupation (optional)
  - Guardian Salary Range (optional)
  - Guardian Aadhar Number (optional)
  - Guardian Gender (optional)
  - Guardian Relation to Student (optional)

**Implementation:**
- Added `guardian_*` fields to `StudentAdmissionCreate` type
- Created separate card section for guardian details
- Follows same pattern as parent details (Father/Mother/Guardian)

### 3. ✅ Card Components - Merged Without Gaps
**Files Updated:**
- `src/components/fee/mappings/StudentMappingTable.tsx`
- `src/components/fee/receipts/ReceiptManagement.tsx`
- `src/pages/fee/FeeRefunds.tsx`
- `src/pages/fee/FeeTerms.tsx`

**Changes:**
- Removed multiple separate Card components
- Merged into single Card with `Separator` components between sections
- Eliminated gaps between related content
- Improved visual consistency and layout

**Pattern Used:**
```
<Card>
  <CardHeader>Filter Title</CardHeader>
  <CardContent className="pb-4">Filter Content</CardContent>
  <Separator />
  <CardHeader>Table Title</CardHeader>
  <CardContent className="pt-4">Table Content</CardContent>
</Card>
```

### 4. ✅ Grading Dashboard - Removed Cards
**File:** `src/pages/exam/GradingDashboard.tsx`

**Changes:**
- Removed "Mark Entry" card (PenLine icon)
- Removed "Hall Tickets" card (Ticket icon)
- Now displays only 3 cards:
  1. Exam Grade Schemes
  2. Subject Grade Schemes
  3. Remark Grade Sets
- Updated subtitle and navigation items

### 5. ✅ Class Subject Mappings - Multiple Sections Support
**File:** `src/components/masters/classsubjectmappings/AddBulkClassSubjectMappingsModal.tsx`

**Features Added:**
- Changed section selector from single-select to multi-select
- Can now add mappings to multiple sections simultaneously
- "All Sections" option still available (mutually exclusive)
- Form creates separate mappings for each selected section

**UI/UX Improvements:**
- Multi-select dropdown for section selection
- Info message shows number of affected sections
- Warning message when "All Sections" is selected
- `closeMenuOnSelect={false}` for better multi-select experience

**How It Works:**
1. Select Class
2. Select multiple Sections (or "All Sections")
3. Select Subjects with settings
4. Submit creates mappings for all selected sections at once

---

## Technical Details

### Dependencies Added/Modified:
- No new dependencies added
- Used existing UI components: `Select` (react-select), `Card`, `Separator`, etc.

### Breaking Changes:
- Clone Exam functionality removed (intentional feature removal)
- Delete button now available for all exam statuses (changed from draft-only)

### Performance Considerations:
- Sticky Actions column uses CSS `position: sticky` for better performance
- No database changes required
- All changes are frontend-only

---

## Testing Recommendations

1. **Exam List:**
   - Verify Edit button opens dialog
   - Verify Delete button works for all statuses
   - Test horizontal scroll on wide tables
   - Confirm sticky Actions column moves with scroll

2. **Student Admission:**
   - Fill guardian details in admission form
   - Verify optional fields don't prevent submission
   - Check data saves correctly

3. **Card Components:**
   - Verify no visual gaps between card sections
   - Check Separator lines display correctly
   - Test responsive behavior on mobile

4. **Grading Dashboard:**
   - Confirm only 3 cards display
   - Verify navigation links work

5. **Class Subject Mappings:**
   - Select multiple sections at once
   - Verify "All Sections" prevents other selections
   - Confirm mappings created for each section
   - Test with different subject combinations

---

## Files Modified Summary

Total files modified: **10+**
- ExamList.tsx
- ParentsStepForm.tsx
- MultiStepAdmissionForm.tsx
- admission.ts (types)
- StudentMappingTable.tsx
- ReceiptManagement.tsx
- FeeRefunds.tsx
- FeeTerms.tsx
- GradingDashboard.tsx
- AddBulkClassSubjectMappingsModal.tsx

---

## Backend Status

**Note:** All changes are frontend-only. No backend modifications required.
Backend API endpoints remain unchanged.

---

Generated: April 7, 2026
