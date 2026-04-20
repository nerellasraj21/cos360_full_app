# COS360 Frontend - Updates Changelog

## Recent Updates (Latest Session - Apr 18, 2026)

### 3. ✅ Expense Module - Data Not Loading Fix

**Files Changed:**
- `src/hooks/expense/index.ts`

**Issue:** All expense pages (Categories, Types, Transactions, Approvals) showed empty state ("No categories found", "No transactions found") even though data existed in the backend and permissions were passing.

**Root Cause:**

Two compounding factors:

1. **`refetchOnMount: false` globally in `main.tsx`** — React Query skips fetching on mount if it has previously run (even if that prior run was disabled).

2. **Zustand `persist` middleware rehydrates asynchronously** — on the very first render, `permissionsMap` is empty, so `hasPermission = false` → `enabled = false` in `usePermissionProtectedQuery`. React Query registers the query as disabled. When Zustand finishes rehydrating (next render), `hasPermission = true` → `enabled = true`, but with `refetchOnMount: false` globally, React Query does not trigger a fresh fetch for that mount cycle. The query stays in a "never ran" state and returns `undefined` → components show empty.

**Confirmed from backend:** All expense list endpoints (`GET /expense/categories`, `GET /expense/types`, `GET /expense/transactions`) return plain arrays (`list[...]`), not paginated objects.

**Solution:**

Added `refetchOnMount: true` to the three expense list hooks and pending approvals hook, overriding the global `false` default:

```typescript
// src/hooks/expense/index.ts

export function useExpenseCategories(params?) {
  return usePermissionProtectedQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories', params],
    queryFn: () => expenseApi.getCategories(params),
    resource: 'expense_categories',
    action: 'list',
    staleTime: expenseCacheUtils.TTL.MEDIUM,
    refetchOnMount: true,  // ← fix: override global refetchOnMount: false
  });
}
// Same pattern applied to useExpenseTypes, useExpenseTransactions, usePendingExpenseApprovals
```

This ensures the query always fetches on mount regardless of the global QueryClient default, resolving the auth-rehydration timing race.

---

### 2. ✅ Edit Student Admission - Footer Buttons Now Stick to Bottom (Don't Scroll)

**File:**

- `src/components/students/AdmissionTable.tsx`

**Issue:** In the Edit Admission dialog, the **Cancel** and **Update Admission** buttons were scrolling along with the form content. Users had to scroll to the bottom of a long form to reach them, and on short viewports they could be clipped.

**Root Cause:**

The footer `<div>` containing Cancel + Update Admission was nested **inside** the scrollable container:

```tsx
<DialogContent className="max-w-2xl">
  <DialogHeader ... />
  <div className="overflow-y-auto px-6">   ← scrollable
    {selectedAdmission && (<div>...form fields...</div>)}
    <div className="flex justify-end gap-2 pt-4 pb-4">  ← footer (INSIDE scroll area)
      Cancel + Update Admission
    </div>
  </div>
</DialogContent>
```

No flex layout was defined on `DialogContent`, so the scrollable div expanded to include the footer, making the whole thing scroll as one block.

**Solution:**

Converted `DialogContent` into a flex column with a height cap and lifted the footer out of the scroll area:

```tsx
<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
  <DialogHeader className="... flex-shrink-0" />
  <div className="flex-1 overflow-y-auto px-6">     ← only form fields scroll
    {selectedAdmission && (<div>...form fields...</div>)}
  </div>
  <div className="flex-shrink-0 border-t px-6 py-4 flex justify-end gap-2">  ← sticky footer
    Cancel + Update Admission
  </div>
</DialogContent>
```

- `max-h-[90vh] flex flex-col` on DialogContent → creates a bounded flex column
- `flex-shrink-0` on header and footer → fixed top and bottom
- `flex-1 overflow-y-auto` on the middle div → only the form content scrolls
- `border-t` on the footer → visual separation from the scrolling form

Same layout pattern as `StaffEnrollmentForm.tsx` and `MultiStepAdmissionForm.tsx`.

---

### 1. ✅ Student Admission - Prevent Accidental Auto-Save on Multi-Step Form

**File:**

- `src/components/students/MultiStepAdmissionForm.tsx`

**Issue:** While filling in the student admission form, the record was sometimes being saved without the user clicking the "Create Admission" button — i.e. the `useCreateAdmission` mutation fired unexpectedly.

**Root Cause:**

- The wrapper was a `<form>` with a `type="submit"` Create Admission button and an `onSubmit` handler that called `onSubmit(methods.getValues())`.
- HTML fires `onSubmit` on many paths that are **not** a click on the submit button:
  - Pressing Enter inside any text input (implicit form submission)
  - Browser/password-manager autofill completing with a synthesized Enter
  - Mobile on-screen keyboard "Go" / "Done" / "Send" key
  - Lingering keypress during the Next → Create Admission button swap on Step 5 (Summary)
- A first-pass attempt tried gating on `e.nativeEvent.submitter.id`, but that property is set by the browser to the **default submit button** for implicit submissions too — so Enter / autofill / mobile Go all passed the check. Submitter-identity cannot distinguish a real click from implicit submission.

**Solution:**

Remove form submission from the flow entirely. If there is no submit button and no form submission path, the browser has no way to implicitly submit anything — the only way to save is to click the button.

1. **Wrapper changed from `<form>` to `<div>`** — the layout/flex structure is identical, but the element no longer participates in HTML form submission semantics.
2. **Create Admission button is now `type="button"` with an `onClick` handler** (`handleCreateAdmissionClick`) that invokes the existing validation + mutation flow directly. A genuine click is the only activation path.
3. **Defense-in-depth `onKeyDown` blocker** on the wrapper: if Enter is pressed inside an `<INPUT>`, `e.preventDefault()` is called. Kept so that any future re-introduction of a form element, or stray submit buttons, doesn't resurrect the bug.

**Rules that remain unchanged (still run only after the click passes the gates above):**

- Summary-step guard
- Academic year presence check
- 13 required-field check (academic year, admission date, student first/last/DOB/gender, father name+email, mother name+email, address line 1, city, state)
- Father vs mother email uniqueness
- Flat → nested payload reshape (empty strings → `undefined`)
- `createAdmission.mutateAsync(cleanedData)`
- 500 ms wait → `onComplete()` on success
- Detailed toast on failure from `error.response.data.detail`

---

## Recent Updates (Previous Session - Apr 17, 2026)

### 1. ✅ Holidays Calendar - Date Pickers Now Work in Add/Edit Dialogs

**File:**

- `src/components/calendar/Calendar.tsx`

**Issue:** Clicking the date inputs in the Add Event / Edit Event dialogs did nothing — the native date picker did not open, especially in dark mode where the calendar icon was invisible.

**Root Cause:**

- Raw `<input type="date">` used with minimal styling (`border rounded px-2 py-1`)
- No `color-scheme` CSS → the browser's calendar-icon indicator rendered white-on-white in dark mode
- Inconsistent with the rest of the app, which uses shadcn `<Input type="date">` (as in Student Admission)

**Solution:**

- Replaced all 4 raw `<input type="date">` elements (2 in Add dialog, 2 in Edit dialog) with the shadcn `<Input type="date">` component
- Matches the proven pattern used in `src/components/students/admission-steps/AcademicStepForm.tsx`
- Calendar icon is now visible and clickable in both light and dark themes

---

### 2. ✅ Holidays Calendar - Month/Year Quick Select in Header

**File:**

- `src/components/calendar/Calendar.tsx`

**Issue:** The month view header only had `<` and `>` buttons that stepped one month at a time. Users could not jump directly to a different year (e.g. jumping from April 2026 to April 2023 required 36 clicks).

**Solution:**

- Turned the "April 2026" header text into two click-to-change controls (month + year)
- Implementation uses an **invisible `<select>` overlaid on the visible text**:
  - Visible text keeps the original `font-semibold text-base` styling (no visual change from before)
  - A transparent `<select>` is absolutely positioned over each label (`absolute inset-0 opacity-0 cursor-pointer`)
  - Clicking opens the native OS dropdown; hover tints the text with `hover:text-primary` as an affordance
- Year range: current year ±10 (21 options)
- Month options: January – December
- `<` / `>` buttons remain for month-by-month stepping

**Why the overlay pattern:**

- Native `<select>` (even with `appearance: none`) reserves internal width for its dropdown-arrow area, sized to the widest option (e.g. "September"), producing a visible gap between month and year
- Overlaying an invisible select on plain text gives pixel-perfect sizing identical to the original `<span>` layout while remaining clickable

---

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
