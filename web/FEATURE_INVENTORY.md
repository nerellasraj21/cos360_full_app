# COS360 Frontend — Feature Inventory

Complete listing of every visible UI feature across all modules.

---

## Table of Contents

1. [Students Module](#1-students-module)
2. [Staff Module](#2-staff-module)
3. [Fee Module](#3-fee-module)
4. [Expense Module](#4-expense-module)
5. [Exam Module](#5-exam-module)
6. [Masters Module](#6-masters-module)
7. [Communication Module](#7-communication-module)
8. [Reports Module](#8-reports-module)
9. [Admin Module](#9-admin-module)
10. [Global Layout & Navigation](#10-global-layout--navigation)

---

## 1. Students Module

### 1.1 Students Dashboard (`/_app/students/`)
- "Coming Soon" banner with GraduationCap icon
- Clickable section cards grid (Admission, Attendance, Documents, Certificates, Transport, Profile, etc.)
- Dynamic icon & color per card (10-color cycle)
- Disabled (opacity-70) cards for sections without a path
- Navigation on card click

---

### 1.2 Admission (`/_app/students/admission`)
**Actions**
- "New Admission" button (gated: `student_admissions:create`)
- View button (Eye icon) per row
- Edit button per row
- Activate / Deactivate toggle per row
- Upload Photo / Delete Photo (inside edit dialog)

**Filters & Search**
- Search box (student name / admission number) with clear button
- Pagination controls
- Page size selector

**Table Columns**
- S.No., Admission Number, Student Name, Class, Section, Academic Year, Admission Date, Status badge, Actions

**New Admission — 6-Step Wizard**
- Step 1 Academic Details: Admission Date, Admission Type, Admitted Class, Admitted Section, Sync Current Class/Section checkbox, Current Class, Current Section
- Step 2 Student Details: First Name, Last Name, Date of Birth, Gender, Primary Status, Nationality, Mother Tongue, Aadhar Number, APAAR Number, Caste (cascades to Sub-Caste), Community, Identification Marks
- Step 3 Parent & Guardian: Father (Name, Email, Phone — auto-search by phone, Occupation, Aadhar, Gender, Salary Range, Relation); Mother (same); Guardian (same, optional)
- Step 4 Address: Line 1, Line 2, City, State → District → Mandal cascade, Pincode
- Step 5 Previous School: toggle checkbox; Previous School Name, Previous Class, Remark (conditional)
- Step 6 Review & Submit: summary of all data + Submit button

**Dialogs**
- New Admission multi-step dialog
- Edit Admission dialog (full form)
- View Admission read-only dialog (all fields displayed; Caste/Sub-Caste, Academic Year resolved by name)
- Delete Confirmation dialog
- Activate/Deactivate Confirmation dialog
- Photo Upload / Delete dialogs

**Role Gates**
- `student_admissions:list/list_own/list_related`, `read/read_own/read_related`, `create`, `update`

**Special Features**
- Cascading dropdowns (Class→Section, State→District→Mandal, Caste→Sub-Caste)
- Phone-based parent auto-fill
- Sync Current / Admitted class-section checkbox
- Photo upload with base64 preview; circular photo in View dialog
- Sticky "Close" button in scrollable View dialog (min-h-0 pattern)

---

### 1.3 Admission Detail (`/_app/students/admission/$admissionId`)
- Back to List button
- Read-only two-column key-value display of all admission fields
- All UUID fields resolved to display names (Class, Section, State, District, Mandal, Caste, Sub-Caste, Academic Year)
- Guardian section shown only if guardian exists
- Previous School section shown only if `is_previous_school = true`

---

### 1.4 Attendance (`/_app/students/attendance`)

**Student View**
- Date range pickers (From / To, default: 1st of month → today)
- Summary cards: Total Days, Present (green), Absent (red), Late (yellow)
- Attendance records list: Date, Remarks, Status badge (color-coded)
- Records sorted newest-first

**Parent View**
- Child selector dropdown (auto-selects first child)
- Same date range pickers & summary cards as student view
- Attendance list per selected child

**Staff / Admin / Teacher View**
- Class dropdown → Section dropdown cascade (required)
- Date input (default today)
- "Unsaved Changes" badge (shown when rows modified)
- Refresh button with spinner
- Save Attendance button (gated: `staff_attendance:create/update`)
- Search box (by student name or roll number) with clear button + result count "X of Y"
- Student rows: row number, name, roll number, status dropdown (Present / Absent / Late), border color by status
- Attendance Analysis panel: percentage present, stat boxes (Present / Absent / Late with counts), horizontal stacked progress bar, color legend
- Success box (green, auto-dismiss) / Error box (red) after save

**Role Gates**
- Student → own view; Parent → children view; Staff/Admin/Teacher → marking view

---

### 1.5 Student Profile (`/_app/students/profile`)
- Circular profile photo (fallback User icon)
- Personal Information card (read-only): First Name, Last Name, Phone, DOB, Address, Emergency Contact, Blood Group, Email
- Academic Information card (read-only): Admission Number, Roll Number, Class, Section, Academic Year
- "Edit Email" small button
- Edit Email dialog: Email input with validation, Update button with loading state

---

### 1.6 Certificates (role-routed)

**My Certificates — Student View (`/_app/students/mycertificates`)**
- Table: S.No., Certificate Type (FileText icon), Issue Date, Remarks (truncated), File badge, Download button (conditional)
- Empty state with icon and message
- Loading spinner

**Parent View (`/_app/students/certificates`)**
- Child selector dropdown (if multiple children)
- Same certificate table per child
- Empty states: "No children linked" / "No certificates found"

**Teacher/Admin — Student Certificates (`/_app/students/studentcertificates`)**
- Student selector dropdown + Clear button
- Certificate table (after student selected)
- "Please select a student" empty state

**Admin — Certificate Upload/Issue (`/_app/students/certificatesupload`)**
- Cascade selector: Search by name/admission number, Class dropdown, Section dropdown ("All sections" option), Student dropdown
- Selected student display (User icon + name + admission number)
- Tabs after student selected:
  - Received Document tab: Certificate Type dropdown, File input (PDF/JPG/PNG/DOCX, max 10 MB), Remarks textarea, Upload + Reset buttons
  - Issue Certificate tab with 2 sub-tabs:
    - Upload Certificate File: Type, Issue Date, File, Remarks, Issue button
    - Generate Issuable: Template selector, Logo URL input (localStorage-persisted), Placeholder editor, Live iframe preview, Print button, Save button
- Certificates table: S.No., Type, Issue Date, Remarks (truncated), File badge, Download + Delete buttons
- Delete confirmation dialog

**Role Gates**
- `student_certificates:list`, `issuable_certificates:create`

---

### 1.7 Certificate Types (`/_app/students/certificatetypes`)
- "Add New Certificate Type" button
- Search box (name/description)
- Sort by Name, Description (asc/desc/none with chevron icons)
- Table: S.No., Name, Description, Actions (Edit, Delete)
- Create/Edit dialog: Name (required), Description (optional)
- Delete confirmation dialog
- Empty state; loading spinner

---

### 1.8 Certificate Templates (`/_app/students/certificatetemplates`)
- "Create New Template" button
- "Load Default Templates" seed button
- Template cards: name, color theme badge, preview thumbnail, Edit / Preview / Delete buttons
- Create/Edit dialog: Name, Color Theme dropdown (blue/green/red/orange), HTML Template (CertificateEditor)
- CertificateEditor: HTML editor with placeholder tags ({{student_name}}, {{admission_number}}, etc.)
- Preview dialog: iframe render of template HTML
- Delete confirmation dialog
- Empty state

---

### 1.9 Documents Upload (`/_app/students/documentsupload`)
- Student selector dropdown (required)
- Collapsible upload section (chevron toggle)
- Document Type text input, File picker (PDF/JPG/PNG/DOC/DOCX), Upload + Reset buttons
- Table: Document Type (FileText icon), Uploaded At, Actions (View in new tab, Download, Delete)
- Delete confirmation dialog

---

### 1.10 My Documents — Student View (`/_app/students/mydocuments`)
- "Upload Document" header button (toggles collapsible upload section)
- Upload section: Document Type dropdown (Birth Certificate, Marksheet, Aadhar Card, Passport, Medical Certificate, Other), File input, Upload + Cancel buttons
- Documents table: Type, Upload Date, Download button
- Empty state with icon

---

### 1.11 Student Transport (`/_app/students/studenttransport`)

**Admin/Staff View**
- "Assign Transport" button (Plus icon)
- Search box (name / route / stop) with result count + clear
- Table: S.No., Student (sortable), Trip (sortable), Route (sortable, start→end stops), Stop (sortable, name + number), Pricing (cycle + ₹ amount), Fee/Term (sortable), Edit + Delete buttons
- Sortable columns (ChevronsUpDown / ChevronUp / ChevronDown icons)
- Assign/Edit dialog: Student dropdown (ReactSelect), Trip dropdown, Stop dropdown, Pricing Plan dropdown, Fee per Term input (₹)
- Delete confirmation dialog
- `modal={false}` + `menuPortalTarget={document.body}` + `pointerEvents: 'auto'` on react-select menus inside dialog

**Student Own View (read-only)**
- "My Transport" card per assignment
- Bus icon + Trip #X header
- Route section: name, start→end stops
- Timings: start–end time
- Vehicle: registration, type
- Pickup Stop: name, stop #
- Pickup Time / Drop Time
- Pricing Plan: cycle name + ₹ amount
- Fee per Term: ₹ amount

**Parent View**
- Child selector dropdown
- Same transport card per child (read-only)

---

## 2. Staff Module

### 2.1 Staff Home (`/_app/staff/`)
- PageHeader: "Staff Management" with Briefcase icon
- 3-column card grid (desktop) / 1-column (mobile)
- Cards: Staff Enrollment, Staff Attendance, Staff Designations, Staff Portal Access (info-only)
- "Manage …" buttons on each card (permission-gated)
- Role gates: `staff:list`, `staff_attendance:read`, `designations:list`

---

### 2.2 Staff Enrollment (`/_app/staff/enrollment`)
**Actions**
- "Add Staff" button (gated: `staff:create`)
- "Columns" dropdown (column visibility toggle with Select All / Deselect All)
- "Export" dropdown: CSV, Excel

**Filters**
- Search box (name / designation / department / email) with clear button

**Table Columns**
- S.No., Name (gender badge, sortable), Contact (email + phone with icons), Designation (with qualification, sortable), Department (sortable), Status badge, Actions (View, Edit, Delete)

**Pagination**
- Previous/Next, page size selector (5/10/20/50), range indicator (e.g., "1-5 of 50")

**Create/Edit Staff Dialog — Sections**
- Basic Information: First Name*, Last Name, Email (validation), Phone (max 10 digits, inline error), Gender, DOB, Joining Date*, Qualification, Experience (max 50 yrs), Address
- Qualifications (multi-entry): Level dropdown, Degree/Course (CreatableSelect — custom entries allowed), Pass-out Year, Percentage/CGPA, University/Board; Add/Remove per entry
- Professional: Designation (InfiniteScrollDropdown), Department, Role (InfiniteScrollDropdown)
- Account: Active Staff Member checkbox
- Work Experience: Previous Org, Subjects Dealt, From/To dates, Remarks
- Bank Details: Bank Name, Branch, Account Number, IFSC (auto-uppercase), Account Holder Name, Account Type (Savings/Current)
- Salary & PF: Last Drawn Salary (₹, max 1Cr), Current Salary (₹, max 1Cr), PF Account Number (format validation), UAN (exactly 12 digits)
- Photo: upload (max 2 MB, JPG/PNG/WebP), circular preview, X remove button

**View Staff Dialog**
- Photo, Basic Info, Contact, Professional, Account & Status, Qualifications, Work Experience, Bank Details, Salary & PF, Recent Attendance summary
- Close button; Edit button (gated: `staff:update`)

**Delete Confirmation**
- Warning with staff name; note about cascading attendance deletion

**Inline Validation Messages**
- Phone (10 digits), Email format, Experience (max 50), Salary (max ₹1Cr), PF format, UAN (12 digits)

**Special Features**
- Dirty-state guard (discard confirmation on close)
- Gender badge inline with name in table
- CreatableSelect allows on-the-fly custom degrees
- Photo upload deferred for new staff, immediate for existing

---

### 2.3 Staff Attendance (`/_app/staff/attendance`)
**Controls**
- Date picker
- Refresh button with spinner
- Save Attendance button (gated: `staff_attendance:create/update`)
- Column visibility toggle (Eye/EyeOff) with count

**Filters**
- Search box (name / email / department) + clear button + result count "X of Y"

**Table Columns**
- S.No., Staff Name (fixed/cannot hide), Email, Department, Status (dropdown if write permission, read-only text otherwise), Modified badge

**Status Options**
- Present, Absent, Late, Half Day

**Analysis Panel**
- Attendance % header
- 4 stat boxes: Present (green), Absent (red), Late (yellow), Half Day (blue)
- Horizontal stacked progress bar
- Color legend

**Status Indicators**
- "Unsaved Changes" badge when rows modified
- Green success box / red error box after save (auto-dismiss 3-5 s)

**Special Features**
- Default status = Present on page load
- Modified flag tracked per row; revert to Present un-marks modification
- All create/update/delete ops batched in parallel

---

### 2.4 Staff Designations (`/_app/staff/designations`)
- "Add Designation" button (gated: `designations:create`)
- Search box
- Table: S.No., Title (Briefcase icon, sortable), Staff Count (sortable, pluralized), Created Date (sortable)
- Sort: click header → asc → desc → off (chevron icons)
- Create/Edit dialog: Title* field
- Delete confirmation with dependency note
- Empty state + "Create First Designation" button

---

### 2.5 Staff Profile (`/_app/staff/profile`)
- Circular profile photo (fallback User icon)
- Personal Info card (read-only): First Name, Last Name, Designation, Employee ID, Date of Joining, Status, Email, Phone
- "edit email & phone" button (gated: `profile:update_own`)
- Edit dialog: Email (regex validation), Phone (exactly 10 digits, strict)
- Dirty-state guard

---

## 3. Fee Module

### 3.1 Fee Dashboard (`/_app/fee/`)
- Role-based landing: Admin sees full management dashboard; Student/Parent sees "My Fees" + "My Receipts" cards
- Permission guard with access-denied fallback

---

### 3.2 Fee Collection — Student Search (`/_app/fee/collection/`)
- Student search bar
- Search results list → navigate to student fee detail

---

### 3.3 Fee Collection — Student Detail (`/_app/fee/collection/$studentId`)

**Tabs**
- Fee Summary | Fee Payment | Concessions | Old Fees | Fee History
- Desktop tab bar; mobile bottom navigation

**Student Info Card**
- Profile icon, name, admission number badge, Back button

**Fee Summary Tab**
- Sortable table: S.No., Fee Type, Actual Amount, Payable Amount, Paid, Due (red/green), Last Paid Date, Receipt #, Remarks
- Grand Total row
- "Old Fee Pending" clickable badge (navigates to Old Fees tab if > 0)
- "Send SMS" button → SMS confirmation dialog (phone + parent name + message preview + Confirm & Send)

**Fee Payment Tab**
- Total Due display card (red/green)
- Terms Due date picker (calendar icon, filters terms as-of date)
- Current Month Terms table + Overdue Terms table (Fee Type, Term, Due Date, Term Amount, Paid, Pending in red)
- Grand Total Pending card with "Pay [amount]" button (auto-fills payment form)
- Payment Form: Amount to Pay, Payment Method (Cash/UPI/Cheque/DD/Bank Transfer), conditional fields per method (UPI Ref; Cheque/DD #, Bank, Date; Bank Ref), Remarks, Send SMS toggle, Print Duplicate toggle
- Confirm Payment dialog → Success dialog after payment (Transaction #, Receipt #, Amount, Method, SMS Status, Items Paid table, Download Receipt PDF button)

**Concessions Tab**
- Editable rows: S.No., Fee Type, Assigned, Due Amount, Due Date, Settled badge, Concession Amount (inline input), Reason (min 5 chars), Approved By (Owner/Principal/Management/Correspondent)
- Save All Concessions button (active when ≥1 valid row)
- Grand Total row with "After Concession" amount
- Concession History collapsible card (toggle arrow): Date, Fee Type, Amount, Reason, Approver, Recorded By, Edit + Delete buttons
- Edit Concession dialog

**Old Fees Tab**
- Arrear fees from previous academic years

**Fee History Tab**
- Timeline of all transactions; lazy-loaded on tab activation

---

### 3.4 Fee Categories (`/_app/fee/categories`)
- Hierarchical tree view with expand/collapse per category
- Per category node: S.No., Name, Status badge, Fee Type count
- On hover: Edit, Delete, "Add Fee Type" (+) buttons
- Create New Category button
- Search / filter by name
- Create/Edit dialog: Category Name, Status dropdown
- Active/Inactive status filter (client-side)

---

### 3.5 Fee Types (`/_app/fee/types`)
- Search input (by type name)
- "Add New Fee Type" button
- Sortable table: S.No., Type Name, Category, Status, Actions (Edit, Delete)
- Create/Edit dialog: Type Name, Category dropdown, Status, Description textarea
- Delete confirmation dialog

---

### 3.6 Fee Terms (`/_app/fee/terms`)
- Academic Year Context card (title, date range, "Active Year" badge)
- Search input + "Add New Term" button
- Sortable table: S.No., Term Name, # of Payment Dates, Status, Actions (Edit, Delete, Manage Payment Dates)
- Create/Edit dialog: Term Name, # of Terms (numeric), Status
- Payment Date Manager modal: Add/Edit/Delete payment due dates per term with calendar date picker

---

### 3.7 Fee Mappings (`/_app/fee/mappings`)
- Tabs: Student Mappings | Class Mappings
- **Student Mappings**: Search, Class/Section/Fee Type dropdowns, "Add New Student Mapping" + "Bulk Upload" buttons; Table: S.No., Student Name, Admission #, Class, Section, Fee Type, Total Fee, Actions; Create/Edit dialog; Bulk CSV upload dialog
- **Class Mappings**: Search, Class/Section/Fee Type/Academic Year filters, "Add New Class Mapping" + "Bulk Upload"; Table: S.No., Class, Section, Fee Type, Term Amount, Status, Actions; TermAmountModal for breakdown by term

---

### 3.8 Fee Receipts (`/_app/fee/receipts`)
- Search (receipt #, student name, transaction #), Status filter, Date Range pickers
- Table: S.No., Receipt #, Student, Transaction #, Amount, Issued Date, Status, View + Download PDF buttons
- Pagination (first/prev/page/next/last + total)
- Generate Receipt dialog (select academic year + transaction → auto-fill student + amount)
- Reprint Receipt dialog
- Receipt Detail view: header, student info, transaction info, fee breakdown, totals, Download + Print buttons
- QR code verification view

---

### 3.9 Fee Refunds (`/_app/fee/refunds`)
- "Create Refund" button
- Stats cards: Total Refund Amount, Pending, Processed, Rejected counts
- Filters: Student dropdown, Status dropdown, Reason text, Requested Date From/To, Clear All + Apply
- Sortable table: S.No., Refund #, Student Admission #, Amount, Reason, Status, Requested Date, Actions
- Pagination (prev/next/page info/total)
- Create Refund dialog: Student dropdown, Fee Transaction dropdown (transaction #, amount, method, date, fee types), Refund Amount, Reason dropdown (Fee Adjustment/Student Withdrawal/Excess Payment/Other), Detailed Reason textarea
- View Refund dialog: Refund # + status badge, Amount, Reason, Student Info, Transaction Info, dates, Reference Number, Approval Remarks
- Approve/Reject dialog: Action dropdown (Approve/Reject), Rejection Reason textarea (if reject)
- Process Refund dialog: Reference Number input

---

### 3.10 Fee Transactions (`/_app/fee/transactions`)
- "Create Transaction" button
- Filters: Student, Payment Method, Status, Date From/To, Apply + Clear All
- Outstanding Fees card (if student selected): total, count, View History button
- Sortable table: S.No., Transaction #, Student + Admission #, Amount, Payment Method badge, Status badge, Date, View Details
- Create dialog: Student, Admission # (auto-fill), Payment Method + conditional fields, Transaction Items (repeatable: Fee Type, Term, Payment Date, Due Amount, Paid Amount, Description, Remove), Remarks
- View Transaction dialog: status badge, Amount, Method, Student, Transaction #, Date, Collected By, Approved By, Remarks, payment-method-specific fields, Generate Receipt + Mark Completed / Cancel Transaction buttons
- Transaction History dialog: Summary cards (count, total paid, completed), Payment Timeline (chronological: icon, Transaction #, Status badge, Date, Amount, Method, Receipt status)

---

### 3.11 Fee Reports (`/_app/fee/reports`)
- Export format selector: CSV / Excel (default) / PDF; Export button
- Filters: Class, Section, Fee Category, Date From/To, Payment Method, Status; Clear Filters
- Tabs: Collection Summary | Pending Fees | Fee Structure
- **Collection Summary**: Stats cards (Total Collected, Total Due, Collection %, Method counts); data table with pagination
- **Pending Fees**: Stats (Total Pending, Overdue, Students with Pending, Avg Overdue Days); table with Days Overdue (red if > 0)
- **Fee Structure**: Stats (Types, Categories, Terms, Avg Fee); table

---

### 3.12 My Fees — Student View (`/_app/fee/my-fees`)
- Student name, Class-Section, Academic Year info row
- Read-only table: S.No., Fee Type, Assigned (₹), After Concession (₹), Paid (₹), Due (₹ color-coded), Last Paid Date, Receipt #
- Grand Total row

---

## 4. Expense Module

### 4.1 Expense Dashboard (`/_app/expense/`)
- Permission guard: `expense_categories.list` or `expense_transactions.list`
- Summary stat cards: Categories count, Types count, Total Transactions count
- 4 navigation cards: Categories, Types, Transactions, Summary (each with icon, description, "Open" button)

---

### 4.2 Expense Categories (`/_app/expense/categories`)
- Hierarchical tree view of categories
- CRUD: Create, Edit, Delete per category
- Nested types shown under each category
- Status management

---

### 4.3 Expense Types (`/_app/expense/types`)
- CRUD list: Create, Edit, Delete
- Budget limit configuration per type
- Status management

---

### 4.4 Expense Transactions (`/_app/expense/transactions`)
- "Create Transaction" button
- Filters: Status (pending/approved/paid), Expense Type, Date From/To, Vendor Name
- Table: S.No., Description, Expense Type, Amount, Payment Method, Status badge, Date, Actions (View/Edit/Delete/Approve)
- Create/Edit dialog: Expense Type, Amount, Transaction Date (default today), Description, Reference Number, Payment Method, Vendor Name, Attachment upload (drag-drop)
- Approval dialog: Approve / Reject dropdown, Comment textarea
- Attachment management: upload receipt/docs, view + delete per file

---

### 4.5 Expense Approvals (`/_app/expense/approvals`)
- Summary cards: Pending count, Total Pending Amount (₹)
- Search box (description / payment method / status)
- Sortable table: S.No., Description, Amount, Vendor, Status, Date, Actions (View + Approve/Reject)
- View detail dialog: header + status badge, overview cards, attachments with download buttons
- Approval/Rejection dialog: Action, Comment textarea

---

### 4.6 Expense Summary (`/_app/expense/summary`)
- Academic Year filter dropdown
- Collapsible category rows: name, total ₹, entry count
- Expanded → nested type rows: name, description, count, type total ₹
- Expanded type → entries table: Description, Date, Vendor, Payment Method, Status badge, Amount
- Responsive: Date/Vendor/Method/Status hidden on mobile
- Grand Total card

---

### 4.7 Expense Audit (`/_app/expense/audit`)
- Audit log of all expense changes
- Filterable by transaction, user, action type
- Timestamps + user info per entry

---

### 4.8 Expense Reports (`/_app/expense/reports`)
- Report types: Category-wise, Type-wise, Monthly/Quarterly trends, Payment method analysis
- Filters: Date range, Category, Type, Status, Academic Year
- Export: CSV, Excel, PDF
- Data tables with pagination

---

### 4.9 Expense Settings (`/_app/expense/settings`)
- Budget limits (global, per category, per type)
- Approval workflow settings
- Payment method configurations
- Notification settings
- Document retention policy

---

## 5. Exam Module

### 5.1 Exam Dashboard (`/_app/exam/`)
- "New Exam" button (admin-only)
- 5-tile quick-links grid: All Exams, Mark Entry, Results, Hall Tickets, Settings
- Search box (exam name)
- 4 summary stat cards: Draft / Active / Locked / Published counts
- Exam cards (grouped Active, Draft): name, status badge, board badge, nature badge, type badge, subject badges (up to 4 + "+N more"), mark entry deadline
- Empty state with "Create First Exam" button (admin only)

---

### 5.2 Exam List (`/_app/exam/exams/`)
- "Create Exam" button (admin, disabled if no grading schemes)
- Grading requirement warning banner (amber, with "Go to Grade Schemes" link)
- Search box
- Status filter dropdown (All / Draft / Active / Published / Locked / Finalized)
- Nature filter dropdown (All / Formative / Summative / Cumulative / Custom)
- Sortable table: S.No., Exam Name, Board, Type, Subjects (badges up to 3 + "+N"), Level, Nature, Status, Deadline, Actions (Edit)
- Row click → navigate to exam detail
- Edit dialog: Exam Name, Mark Entry Deadline, Min Attendance %, Attendance From/To, Term, Publish Rank checkbox
- Delete dialog (draft status only): warning with exam name
- Empty state + "Create First Exam" button

---

### 5.3 Create Exam (`/_app/exam/exams/create`)
- 5-step accordion wizard; full-page spinner overlay during submit
- Bottom bar: Cancel, validation issues count (red), Create Exam button (disabled if issues)

**Section 1 — Exam Details**
- Exam Name*, Board* (CBSE/ICSE/State/BTech/Custom), Custom Board Name (if Custom), Level*, Exam Type*, Nature*, Academic Year*, Grade Scheme, Mark Entry Deadline, Min Attendance %, Attendance From/To, Internal Exam checkbox, Publish Rank checkbox
- "Next: Class & Sections" button

**Section 2 — Class & Sections**
- ClassSectionSelector: checkboxes per class + section; "X/Y selected" badge; indeterminate state
- "Next: Subject Config" button (disabled if nothing selected)

**Section 3 — Subject Configuration**
- Per class-section accordion: subject list with per-subject config
  - Subject Grade Scheme selector
  - Internal/External Split checkbox
  - Components table: name, entry_type, max_marks, min_pass_marks, include_in_total
  - Add/Remove Component buttons
  - Credit Hours, Remark Grade Set
- Grand Total Marks summary box

**Section 4 — Exam Dates (Optional)**
- Inline add form (dashed border): Class-Section dropdown, Subject dropdown, Date, Start Time, End Time, Venue, Add button
- Dates table: Subject, Class-Section, Date, Start, End, Venue, Delete button per row

**Section 5 — Review & Submit**
- Missing fields alert (red) with links to fix
- Summary cards per section with Edit button
- Section 1: key-value grid; Section 2: class-section badges; Section 3: subject badges + component/marks count; Section 4: dates table

---

### 5.4 Exam Detail (`/_app/exam/exams/$id/`)
- Title, Status badge, Board · Level · Type · Nature subtitle
- Admin buttons: Edit (draft/active), Clone (always), Delete (draft only)
- Clone dialog: name input (pre-filled "{original} (Copy)"), Clone button
- Delete dialog: warning with name

**Tabs**
- **Overview**: Info cards (Academic Year, Deadline, Hall Ticket Attendance %, Attendance Period, Hall Ticket Status, Publish Rank / Internal Exam options); Configured Subjects (grouped by class-section)
- **Dates**: "Manage Dates" / "View All Dates" button; dates table (Subject, Class, Date, Time, Venue); empty state + "Add Dates" button
- **Marks**: "Go to Mark Entry" button
- **Permissions** (admin): "Manage Permissions" button
- **Audit** (admin): "View Audit Log" button

---

### 5.5 Exam Dates Management (`/_app/exam/exams/$id/dates`)
- Back button
- Search box, Sort dropdown + direction indicators
- Add Date form (admin): Class-Section, Subject, Date, Start Time, End Time, Venue, Add button
- Sortable dates table: Subject, Class-Section, Date, Start, End, Venue, Edit + Delete buttons
- Edit dialog (same fields); Delete confirmation

---

### 5.6 Mark Entry — Exam List (`/_app/exam/marks/`)
- Search box
- Sort by: Exam Name, Board, Type, Nature, Status, Deadline
- Table: S.No., Exam Name, Board, Type, Nature, Status, Deadline, row click → summary
- Empty state

---

### 5.7 Mark Entry — Summary (`/_app/exam/marks/$examId/summary`)
- Back button; Exam name + board + type subtitle
- Backend error alert (yellow, lists missing endpoints)
- Empty state if no class-sections
- Per class-section group: header with section name + subject count badge
- Per subject: Subject, Components, Max Marks, "Enter Marks" button → mark grid

---

### 5.8 Mark Entry — Grid (`/_app/exam/marks/$examId/$classId/$sectionId/$subjectConfigId`)
- Back button; subject + class-section title
- Toolbar: Download Template (CSV), Upload Marks (file input), Save All button, Export icon
- Upload dialog: CSV file input, preview, Upload button
- Grid table (paginated): Roll No., Admission No., Student Name, per-component editable inputs (validated against max marks), Absent checkbox (clears all marks when checked)
- Dirty state indicator (count of unsaved students)
- Page Previous/Next controls
- Toast notifications for save success/error

---

### 5.9 My Marks — Student/Parent (`/_app/exam/my-marks/$examId`)
- Back button; exam name + student name subtitle
- Per-subject cards: subject name, Total Marks (obtained/max), green ≥35% / red <35% color
- Per component rows: name, marks/max, remark grade badge, "Not entered" / "Absent" badge
- Empty state

---

### 5.10 Results — Exam List (`/_app/exam/results/`)
- Search box + sort controls
- Table: S.No., Exam Name, Board, Type, Nature, Status, row click → results detail
- Empty state

---

### 5.11 Results Publish — Admin (`/_app/exam/exams/$id/results`)
- Back button; exam name + status badge
- Step 1 — Compute Aggregates: description + "Run Compute" button + success checkmark
- Step 2 — Publish Results: description + "Publish Results" button + confirmation dialog + success checkmark

---

### 5.12 Student Results (`/_app/exam/results/$id`)
- Back button; exam name subtitle
- Result Summary card: Pass/Fail badge (green/red), Overall grade
- 4-stat grid: Total Marks, Percentage, GPA, Rank (if published)
- Subject Breakdown table: Subject, Marks (or "Absent" badge), %, Grade, Result (Pass/Fail)
- Export to Excel button (admin/parent)

---

### 5.13 Hall Tickets — Exam List (`/_app/exam/hall-tickets/`)
- Search box + sort controls
- Table: S.No., Exam Name, Board, Type, Nature, Status, row click → eligibility
- Empty state

---

### 5.14 Hall Ticket Eligibility (`/_app/exam/hall-tickets/$examId`)

**Admin View**
- Back button; "Hall Ticket Eligibility — {exam}" title
- Tabs: Eligible Students | Ineligible Students
- Eligible tab: table (Roll No., Admission No., Student Name, Class, Attendance %, Status, Preview + Download buttons); Bulk actions: "Download All", "Publish Hall Tickets" button
- Ineligible tab: same table + Reason column (Fee Pending / Low Attendance / Both)
- Eligibility Requirement card (min attendance %, fee requirement)
- "Compute Eligibility" button with confirmation dialog
- Search + sort on both tabs

**Student/Parent View**
- Eligible / Not Eligible status card (CheckCircle / XCircle icon + reason if ineligible)
- "Download Hall Ticket" button (if eligible)
- Exam dates/times/venues + instructions (if eligible)

---

### 5.15 Hall Ticket Download (`/_app/exam/hall-tickets/$examId/download`)
- Back button; exam name + subtitle
- Exam Info card
- Search box + sort controls
- Per-student card: name, admission #, class, attendance %, Preview button (HallTicketCard modal), Download button
- HallTicketCard preview modal: formatted hall ticket, exam details, student info, instructions, Close button
- "Download All" bulk button (ZIP/merged PDF)
- Empty state

---

### 5.16 Grading Dashboard (`/_app/exam/grading/`)
- 3 stat cards: Exam Grade Schemes, Subject Grade Schemes, Remark Grade Sets counts
- 3 navigation cards: Exam Grade Schemes, Subject Grade Schemes, Remark Grade Sets

---

### 5.17 Exam Grade Schemes (`/_app/exam/grading/exam-schemes`)
- "+ New Scheme" button
- Search box + sort controls
- Schemes list (accordion): name, band count, is_default badge; expand → grade bands table (From %, To %, Grade, GPA, Remarks, Pass?, drag handle, delete)
- Create/Edit dialog: Scheme Name, Description, Is Default checkbox, GradeBandEditor (drag-to-reorder, Add/Delete Band per row)
- Delete confirmation

---

### 5.18 Subject Grade Schemes (`/_app/exam/grading/subject-schemes`)
- Same layout and features as Exam Grade Schemes (subject-specific grading)

---

### 5.19 Remark Grade Sets (`/_app/exam/grading/remarks`)
- "+ New Set" button
- Search + sort
- Sets list (accordion): name, option count; expand → options table (Grade Letter, Label, Sort Order, drag handle, Delete)
- Create/Edit dialog: Set Name, Options FieldArray (Grade Letter, Label, Sort Order; drag handles, Add/Remove per option)
- Delete confirmation

---

### 5.20 Board Patterns (`/_app/exam/board-patterns`)
- "+ New Pattern" button
- Search + sort
- Patterns list (accordion): Board, Level, is_active badge, exam type count; expand → Exam Types table (Type Name, Nature, Weightage %, Count/Year, Sort Order, drag + edit + delete)
- Create/Edit dialog: Board, Custom Board Name (if Custom), Level, Is Active, Exam Types FieldArray (Name, Nature, Weightage %, Count/Year, Sort Order; Add/Remove)
- Delete confirmation

---

### 5.21 Exam Settings (`/_app/exam/settings`)
- Board Configuration card: Default Board, Custom Board Name
- Hall Ticket card: Min Attendance %
- Grace Marks card: Max Grace per Subject, Max Grace Subjects, Auto-Apply Grace checkbox
- Reconduct card: Max Failed Subjects for Reconduct
- Save button (disabled until dirty + valid); loading state

---

### 5.22 Mark Entry Permissions (`/_app/exam/exams/$id/permissions`)
- Back button; exam name subtitle
- Info box (blue): teachers auto-have access for assigned subjects; this panel is for Clerk/CA staff
- Grant Permission form: User ID/Email input + "Grant Permission" button
- Search + sort controls
- Permissions list: User name, Role, Granted By, Granted At, Revoke button (confirmation dialog)
- Empty state

---

### 5.23 Exam Notifications (`/_app/exam/exams/$id/notify`)
- Back button; exam name subtitle
- Target Audience card: All Students / Failed Students / Hall Ticket Eligible / Ineligible (radio/segmented)
- Channels card: SMS / WhatsApp / Push Notification checkboxes (min 1)
- Message card: textarea (required, min 10 chars), character count
- Message preview
- "Send Notification" button (disabled until valid); loading state; success/error toast

---

### 5.24 Audit Log — Exam List (`/_app/exam/audit`)
- Search + sort
- Table: S.No., Exam Name, Board, Status, row click → audit detail

---

### 5.25 Audit Log — Detail (`/_app/exam/exams/$id/audit`)
- Back button; Refresh button
- Search box (action / description / actor)
- Timeline/table: Action badge (color-coded), Actor name + role, Description, Timestamp, Metadata (expandable)
- Pagination (Previous/Next)
- Empty state

---

## 6. Masters Module

### 6.1 Academic Years (`/_app/masters/academicyears`)
- Table: ID, Title (inline editable), Start Date (inline editable date), End Date (inline editable date), Active (inline checkbox/StatusBadge), Actions
- "Add Academic Year" button (permission-gated)
- Search box (client-side, all columns)
- Column visibility selector (toggle columns)
- Export dropdown: CSV / Excel / JSON
- Pagination: page number, page size (5/10/25)
- Create/Edit dialog: Title*, Start Date*, End Date*, Is Active
- Delete button per row
- Role gates: `academic_years:list/read/create/update/delete`

---

### 6.2 Classes & Sections (`/_app/masters/classesandsections`)
- Hierarchical tree: Class → Sections with expand/collapse
- "Add Class" button (gated: `classes:create`)
- Per class: inline "Add Section" button, Edit + Delete buttons
- Bulk section creation dialog (comma-separated names)
- Edit Class modal: class name, is_active
- Edit/Add Section modal: name, is_active, bulk entry
- Delete dialogs with dependency warnings (student admissions / fee mappings / subject mappings)
- Duplicate section name detection
- Academic Year context filter
- Search (class/section names)

---

### 6.3 Class-Subject Mappings (`/_app/masters/classsubjectmappings`)
- Table: Class, Section, Subject, Exclude from Marks (inline checkbox), Order (inline number), Active (inline checkbox/StatusBadge)
- Bulk add modal: Class dropdown, multi-subject CreatableSelect (dark mode compatible), Exclude from Marks, Order
- Column visibility selector
- Pagination with page/pageSize
- Academic Year filter (global navbar)
- Role gates: `class_subject_mappings:list/create/update/delete`

---

### 6.4 Subjects (`/_app/masters/subjects`)
- Table: Name (inline editable), Category (inline dropdown with inline Create Category popover), Short Code (inline editable), Active (inline checkbox/StatusBadge)
- "Add Subject" button
- Search box; Column visibility selector; Pagination
- Create/Edit dialog: Name*, Subject Category (dropdown with inline create), Short Code, Is Active
- SubjectCategoriesInfiniteDropdown with CreateCategoryPopover
- Role gates: `subjects:list/read/create/update/delete`

---

### 6.5 Subject Categories (`/_app/masters/subjectcategories`)
- Simple flat table: Name (inline editable)
- "Add Subject Categories" button; Edit + Delete per row
- Column visibility selector; Pagination

---

### 6.6 Holidays / Calendar (`/_app/masters/holidays` & `/_app/Calender`)
- View switcher: Month | Week | Day | Year | All
- **Month View**: Day-cell grid with holiday names overlaid; drag holiday to reschedule (react-dnd)
- **Week View**: 7-column layout; draggable holidays between days
- **Day View**: Single-day event list
- **All View**: Paginated table (Name, Start Date, End Date, Description, Color indicator) + Search + Sort (Name, Start Date, End Date; asc/desc)
- Month navigation: Previous / Next / Today button
- "Add Holiday" button (date selection → dialog)
- Add/Edit Holiday dialog: Name*, Start Date*, End Date*, Description (optional), Color picker (hex, default #2563eb)
- Delete per holiday (confirmation)
- Academic Year context; ISO date format; color per holiday

---

### 6.7 Parents (`/_app/masters/parents`)
- Table: Name, Email, Phone, Occupation, Aadhar Number, Gender, Relation to Student, Actions (Edit, Delete)
- "Add Parent" button (gated: `parent_management:create`)
- Search bar (name / email / phone / occupation / relation)
- Sortable columns (asc/desc/none)
- Create/Edit dialog: Name*, Email, Phone, Occupation, Aadhar, Gender, Relation to Student, User ID (required)
- Delete confirmation dialog
- Parent Portal Access info banner

---

### 6.8 Transport Routes (`/_app/masters/routes`)
- Table (inline editable): Route Name, Starting Stop, Ending Stop, Number of Stops, Route Type (CreatableSelect), Trip Type (CreatableSelect), Start Time (TimePicker), End Time (TimePicker), Active (StatusBadge)
- "Add Route" button; Column visibility selector
- Create form: all fields above (required: route_name, starting/ending stop, number_of_stops)
- Time display: 12-hr format in read mode; 24-hr in edit
- Role gates: `routes:list/create/update/delete`

---

### 6.9 Route Stops (`/_app/masters/routeStops`)
- Table (inline editable): ID, Route (dropdown), Stop Name, Stop Number, Pickup Time (TimePicker), Drop Time (TimePicker), Reaching Time (TimePicker), Active (StatusBadge)
- "Add Route Stop" button
- Cascading: select Route → filters its stops
- Create form: Route*, Name*, Number (default 1), Reaching Time (required, default "08:30:00"), Pickup Time, Drop Time, Is Active
- Time stored as HH:MM:SS; displayed as HH:MM

---

### 6.10 Vehicles (`/_app/masters/vehicles`)
- Table (inline editable): ID, Vehicle Name, Registration Number, Fees (₹ inline number), Vehicle Type (dropdown), Last Inspected (date), Pollution Renewal (date), Active (StatusBadge)
- "Add Vehicle" button
- Create form: Name*, Registration Number*, Fees, Vehicle Type, Last Inspected Date, Pollution Renewal Date, Is Active
- Fees shown with ₹ symbol; dates shown as locale string or "N/A"

---

### 6.11 Trips (`/_app/masters/trips`)
- Search bar + sort controls
- Table: Trip Number, Vehicle, Route, Driver, Status/Type, Edit + Delete buttons
- Refresh button
- Create/Edit dialog: Trip Number (number), Vehicle (dropdown), Route (dropdown), Driver (async dropdown with spinner), optional Status/Type
- Delete confirmation dialog
- Toast notifications for all CRUD ops

---

### 6.12 Roles & Permissions (`/_app/masters/rolespermissions`)
- Two tabs: **Roles** | **Permissions**
- **Roles tab**: Table (Role Name, Description, Is Active, Edit + Delete); Create/Edit dialog (Name, Description, Is Active); Delete with dependency warning
- **Permissions tab**:
  - Matrix view: Resource × Role checkboxes (create/read/update/delete)
  - Table view: Resource, Action, Role, Is Granted, Edit + Delete
  - "Add Permission" button; "Bulk Create" button (CSV / multi-select grid); "Apply Template" button (Admin/Teacher/Student/Staff/Parent presets)
  - Column selector
  - Create/Edit dialog: Resource dropdown, Role dropdown, Action dropdown (list/read/create/update/delete), Is Granted checkbox
  - Template selection dialog with Apply button

---

### 6.13 Timetable (`/_app/TimeTable`)
- Class selector → Section selector (react-select, cascading)
- Edit / Save toggle button (gated: `timetable_management:update`)
- Export dropdown (when not editing): Save as PNG, Save as CSV, Save as Excel
- "Include Saturday" checkbox (adds/removes Saturday column)
- "Add Subject Row" button (new period row)
- "Add Special Row" button (SNACKS / LUNCH / DISPERSAL or custom event)
- "Repeat All for Week" button → dialog: select source day → apply to all days
- "Repeat One Subject" button → dialog: select subject → repeat across all periods
- Grid table columns: Time | Mon | Tue | Wed | Thu | Fri | [Sat] | Actions
- Time column (edit mode): Start + End TimePicker (24-hr)
- Day columns: subject rows → subject dropdown (class-mapped only); special rows → CreatableSelect (mapped subjects + predefined events + free text)
- Custom event creation via CreatableSelect (1-50 alphanumeric + spaces; uppercase_underscore stored; duplicate prevention toast)
- Delete row button (trash icon, edit mode only)
- Empty state: "Please select a class and section"
- Loading spinner; error state
- Dark mode custom select styles; keyboard navigation support

---

## 7. Communication Module

### 7.1 Communication Dashboard (`/_app/communication/`)
- 3 cards: Compose (Send icon, blue), Templates (FileText, green), Logs (ScrollText, purple)
- Gradient backgrounds, hover shadow, click navigation

---

### 7.2 Compose (`/_app/communication/compose`)
- 4-step wizard; mobile step progress bar

**Step 1 — Channel**: SMS / WhatsApp / Email radio group (color-coded)

**Step 2 — Recipients**
- Target Type dropdown: Individual Parent/Student/Staff, Class+Section (Parents/Students), All Parents/Students/Staff, All Users, Fee Defaulters, Role-Based
- Conditional selectors: Class, Section, Individual (Student/Parent/Staff dropdown), Role
- "Estimated X recipients" preview count

**Step 3 — Template**
- Template dropdown (filtered by channel)
- Template body preview with {{variable}} highlighted
- "Custom Message" skip option

**Step 4 — Extra Variables**
- Dynamic text inputs for non-system variables (name, parent_name, student_name, etc. auto-resolved)
- Live preview with substitutions

- "Send Notification" button (gated: `communications:create`)
- Send Confirmation dialog: channel, target, recipient count, message preview; Confirm/Cancel
- Redirect to Logs on success

---

### 7.3 Templates (`/_app/communication/templates`)
- Channel filter dropdown (SMS / WhatsApp / Email / All)
- Search box (template name)
- Table: Template Name, Channel (icon + label), Message Preview (truncated), Variables (comma-separated), Status badge, Edit + Deactivate/Reactivate + Delete buttons
- "New Template" button
- Template Form modal: Name (required), Channel radio (create mode only), Subject field (email only), Body textarea (required), Variable Insertion popover (click to insert {{variable_name}} at cursor), auto-detected variables display, Preview section (variables replaced as [var_name]), Character count
- Validation: Name + Body required; email subject recommended
- Delete confirmation dialog

---

### 7.4 Logs (`/_app/communication/logs`)
- Channel filter, Status filter, Date From/To pickers
- Table: Recipient Name, Channel (icon+label), Phone, Email, Status badge (color+icon), Sent At, View button (Eye icon)
- Pagination (page numbers, page size, record count)
- Status icons: Sent ✅ / Delivered ✅ / Failed ❌ / Queued ⏳
- Detail modal: Recipient info, Status badge, Provider Message ID, Triggered By, Target Group, Sent At, Message Preview (monospace), Error Message (red alert if failed)
- Empty state; Loading spinner

---

## 8. Reports Module

### 8.1 Reports Dashboard (`/_app/reports/`)
- "Coming Soon" banner (BarChart2 icon, indigo)
- Message: module-specific reports available in each module section
- Report cards grid (3-col desktop, 2 tablet, 1 mobile): Student Reports, Fee Reports, Academic Reports, Expense Reports, Transport Reports, Staff Reports, Export & Downloads
- Cards: icon, title, description; click navigates if path exists; grayed out (opacity-70) if no path
- Reads available report items from authStore menu

---

## 9. Admin Module

### 9.1 Admin Dashboard (`/_app/admin/`)
- "Coming Soon" banner (ShieldCheck icon, slate)
- Admin sections grid: User Management, Roles & Permissions, Menu Management, API Keys, Audit Logs, Profile Settings, Notifications, System Settings
- Same card layout as Reports (3-col, 8-color cycle, click navigation)

---

### 9.2 User Management (`/_app/admin/users`)
- "Add User" button (gated: `user_management:create`)
- Search box (username/email), Role filter, Status filter (Active/Inactive), Entity Type filter (Student/Staff/Parent/All)
- Sortable table: Username, Email, Role badge (color-coded), Status badge, Entity Type, Entity Name, Actions (View, Edit, Reset Password)
- Pagination + page size selector
- View dialog: read-only (Username, Email, Role, Status, Entity Type/Name, Created Date)
- Edit dialog: Username, Email, Is Active toggle
- Reset Password dialog: Current Password, New Password, Confirm Password (validation: new = confirm)
- Create dialog: Username, Email, Role dropdown, Entity Type → Entity Picker, Is Active
- Role badges: Admin=purple, Teacher=blue, Staff=green, Student=yellow, Parent=orange

---

### 9.3 Admin Profile (`/_app/admin/profile`)
- Profile card (read-only): Username, Email, Role, Department, Join Date
- "Edit Email" button → dialog (Email input, validation, Save/Cancel)
- "Change Password" button → dialog (Current Password, New Password, Confirm Password, validation)
- Loading spinner; error message if fetch fails

---

## 10. Global Layout & Navigation

### 10.1 Sidebar
- Open / Collapsed toggle (hamburger icon rotates)
- Mobile responsive (overlay on small screens)
- Recursive menu tree: icon + label (truncated when collapsed) + chevron (parent items) + active indicator
- Expand/collapse parent items on click; navigate on leaf item click
- Mobile: clicking item closes sidebar
- 100+ icon mappings (BookOpen, School, Bus, Truck, Send, BarChart2, Banknote, ClipboardList, etc.)
- Active route detection (handles URL variations: lowercase, underscore vs dash)
- ARIA labels; keyboard navigation (Tab, Enter, Arrow keys)
- Smooth expand/collapse animations; fade hover effects
- Dark mode support

---

### 10.2 Navbar
- Hamburger button (toggles sidebar)
- **Student Selector** (parent-only, Wrapper component): dropdown of parent's children, "Managing: {name}" context
- **Academic Year Dropdown**: pill-shaped badge with CalendarIcon; click to open year picker
- **Fullscreen Toggle**: icon changes by state; `requestFullscreen` on click
- **Theme Toggle**: Sun (light) / Moon (dark); updates `useThemeStore`
- **User Profile Dropdown**: Avatar + Username (hidden on mobile) + arrow → User info header, Profile link, Logout (red text, `logoutMutation`)

---

### 10.3 Main Layout
- Sticky header bar (z-50, border-b, backdrop blur)
- "COS360" brand link (navigates to /)
- Student Selector in header (parent role, if `showStudentSelector=true`)
- User info display: username or parent profile name; "Managing: {student}" context
- Logout button (ghost, icon-only, tooltip)
- `<Outlet>` for child routes
- Auth-guard: renders Outlet only if not authenticated (login page)

---

### 10.4 Auth Layout
- Full-height centered container (gray background)
- Max-width 384px
- Outlet renders login / forgot-password / set-password pages

---

## Cross-Cutting Features (All Modules)

### Permissions
- `PermissionGuard` component wraps any gated content
- `checkPermission(resource, action)` hook (returns boolean)
- Format: `resource:action` (e.g., `academic_years:create`)
- Actions: `list`, `list_own`, `list_related`, `read`, `read_own`, `read_related`, `create`, `update`, `delete`, `activate`, `deactivate`
- Fallback: "Access Denied" card for unprivileged users

### Tables
- Sortable columns (click header → asc → desc → off)
- Sort icons: ChevronUp / ChevronDown / ChevronsUpDown
- Row hover highlight; row click navigation (when applicable)
- Row numbers (S.No.)
- Sticky headers on scroll
- Responsive (horizontal scroll or stacked on mobile)

### Pagination
- Previous / Next buttons
- Page size dropdown (typically 5 / 10 / 25 / 50)
- Record count display ("1-20 of 500")
- First / Last page controls (on some pages)

### Inline Editing
- Editable cells: text, number, checkbox, dropdown (Select/ReactSelect), date picker, time picker
- Edit mode toggle per row or table-wide
- Save / Cancel inline or via modal
- Validation: required fields, type checks, format checks

### Search & Filter
- Text search boxes (client-side substring, case-insensitive)
- Dropdown filters (Status, Channel, Role, Entity Type, etc.)
- Date range pickers (From / To)
- Real-time filtering as user types

### Dialogs & Modals
- Create / Edit / View / Delete Confirmation dialogs
- Bulk operations dialogs (multi-select, CSV upload, matrix)
- Dirty-state guard (discard confirmation if form changed)
- Radix UI Dialog; accessible; centered with backdrop

### Status Badges
- `StatusBadge` component: Active (green) / Inactive (gray/red)
- Role badges (color-coded per role)
- Notification status icons (✅ Sent, ❌ Failed, ⏳ Queued)
- Exam status badges (draft=gray, active=blue, published=green, locked=amber, finalized=purple)

### Loading States
- `Loader2` icon with `animate-spin`
- Skeleton placeholders (navbar Student Selector)
- Buttons disabled during mutation (`isPending`)
- Loading text ("Loading...", "Saving...", "Creating exam...")

### Toast Notifications
- Sonner library; auto-dismiss 3-5 s; top-right placement
- Success (green), Error (red), Info (blue)
- Common: "Successfully created", "Failed to update", "Please fill all required fields"

### Export
- **CSV**: table data with quoted fields
- **Excel (.xlsx)**: workbook via `xlsx` library
- **JSON**: full dataset with metadata
- **PNG**: timetable grid via `html-to-image`
- **PDF**: fee receipts, hall tickets, results
- Exports respect column visibility

### Column Visibility Selector
- Dropdown with checkboxes per column
- Select All / Deselect All
- At least 1 column must remain visible

### Academic Year Context
- `useAcademicYearStore` (Zustand); stored in navbar pill badge
- `AcademicYearDropdown` selector
- Many API endpoints filtered by `academic_year_id`
- Auto-initialized on page load

### Dark Mode
- Theme toggle in navbar (Sun / Moon)
- `useThemeStore` (Zustand)
- Tailwind `dark:` prefix throughout
- Custom CSS for react-select dark backgrounds
- All icon opacities use `opacity-75` or `text-muted-foreground` for dark-mode visibility

### Responsive Design
- Breakpoints: `sm:` 640px, `md:` 768px, `lg:` 1024px
- Mobile: single-column grids, horizontal-scroll tables, stacked buttons, collapsible sections
- Bottom tab navigation (Fee Collection student detail on mobile)

### Accessibility
- Form labels associated with inputs
- ARIA labels on icon-only buttons
- Keyboard navigation (Tab, Enter, Arrow keys, Escape)
- Focus states on all interactive elements
- Semantic HTML (button, nav, section, etc.)
- Color is never the sole indicator (text labels always present)
