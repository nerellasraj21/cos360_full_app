# COS360 Mobile App — Android Test Flows

**Last Updated:** March 2026
**App Version:** v1.8.0

---

## Test Users

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Admin / Principal | `admin@school.com` | `Welcome@123` | Full access to all modules |
| Staff (Non-Teacher) | `staff@school.com` | `Welcome@123` | No exam mark entry |
| Teacher | `teacher@school.com` | `Welcome@123` | Exam mark entry access |
| Student | `NP2025001` (Admission No.) | `student@123` | Own data only |
| Parent | `parent@school.com` | `parent@123` | Children selector + own data |

> **First-time login**: Any user logging in for the first time will be redirected to `/set-password`. Set a new password before continuing.

---

## Pre-Test Setup Checklist

- [ ] App installed on Android device
- [ ] `.env` points to correct server IP (not `localhost` for physical device)
- [ ] At least one academic year is active
- [ ] Test tenant seeded with sample data (students, staff, fees, etc.)
- [ ] Communication menu seeded: `python scripts/seed_communication_menu_test_tenant.py`
- [ ] Expense menu seeded: `python scripts/seed_expense_menu_test_tenant.py`

---

## Module 1: Authentication

### Flow 1.1 — First-Time Login (All Roles)
**User:** Any role (first time)

1. Open app → lands on Login screen
2. Enter username + password + select academic year
3. Tap **Login**
4. **Expected:** Redirected to `/set-password` (requires_password_change = true)
5. Enter new password + confirm
6. Tap **Set Password**
7. **Expected:** Redirected to Dashboard

### Flow 1.2 — Standard Login (Admin)
**User:** Admin

1. Enter `admin@school.com` / `Welcome@123`
2. Select active academic year
3. Tap **Login**
4. **Expected:** Dashboard with all 13 tabs visible in bottom nav

### Flow 1.3 — Standard Login (Student)
**User:** Student

1. Enter admission number e.g. `NP2025001` / `student@123`
2. Select academic year
3. Tap **Login**
4. **Expected:** Dashboard; limited tabs visible (Students, Fees, Exam, Communication, Profile, Settings)

### Flow 1.4 — Standard Login (Parent)
**User:** Parent

1. Enter `parent@school.com` / `parent@123`
2. Select academic year
3. Tap **Login**
4. **Expected:** Dashboard with child-selector prompt if multiple children exist

### Flow 1.5 — Forgot Password
1. Tap **Forgot Password** on login screen
2. Enter registered email
3. **Expected:** Confirmation message shown

### Flow 1.6 — Logout
1. Go to Profile tab → tap **Logout**
2. **Expected:** Redirected to Login screen; cached auth cleared

---

## Module 2: Dashboard

### Flow 2.1 — Admin Dashboard
**User:** Admin

1. Login → Dashboard (index tab)
2. **Expected:** Module cards for all available modules (Students, Fees, Staff, Transport, Exam, etc.)
3. Tap any module card → navigates to that module hub

### Flow 2.2 — Student Dashboard
**User:** Student

1. Login → Dashboard
2. **Expected:** Only student-relevant module cards shown (My Attendance, My Fees, My Marks, etc.)
3. Quick links available: My Timetable, My Certificates, My Documents

### Flow 2.3 — Parent Dashboard
**User:** Parent

1. Login → Dashboard
2. If multiple children: verify child selector is shown
3. Switch between children → verify data changes

---

## Module 3: Students

### Flow 3.1 — Admin: Admission List + Create
**User:** Admin

1. Students tab → **Admissions**
2. **Expected:** List of students with search/filter
3. Tap **+** → Create new admission (6-step wizard)
   - Step 1: Personal details (name, DOB, gender, Aadhar, APAAR)
   - Step 2: Father details
   - Step 3: Mother details
   - Step 4: Admission details (date, class, section, academic year)
   - Step 5: Address
   - Step 6: Review + Submit
4. **Expected:** Student appears in list after creation

### Flow 3.2 — Admin: Toggle Student Active/Inactive
**User:** Admin

1. Admissions → find student → tap to open profile
2. Toggle **Active** switch
3. **Expected:** Status changes; toast confirmation

### Flow 3.3 — Admin: Staff Marks Attendance
**User:** Staff / Teacher

1. Students tab → **Attendance**
2. Select date + class + section
3. **Expected:** Student list with mark buttons (Present / Absent / Late / Leave / Half-Day)
4. Mark a few students → tap **Save All**
5. **Expected:** Toast success; marks saved

### Flow 3.4 — Student: Own Attendance View
**User:** Student

1. Students tab → **Attendance**
2. **Expected:** Own attendance calendar/list — no edit controls visible
3. Verify correct data shown

### Flow 3.5 — Parent: Child Attendance View
**User:** Parent

1. Students tab → **Attendance**
2. **Expected:** Child selector dropdown; select child → their attendance shown
3. Switch to different child → data updates

### Flow 3.6 — Admin: Documents Management
**User:** Admin

1. Students tab → **Documents**
2. View document list
3. Tap **Upload** → select file → assign to student
4. **Expected:** Document appears in list

### Flow 3.7 — Student: Own Documents View
**User:** Student

1. Students tab → **My Documents**
2. **Expected:** Only own documents shown; no admin controls

### Flow 3.8 — Admin: Certificates
**User:** Admin

1. Students tab → **Certificates**
2. View certificate types → tap **+** to create type
3. Navigate to student certificates → approve/generate certificate
4. **Expected:** Certificate downloadable (presigned S3 URL opens)

### Flow 3.9 — Student: Own Certificates
**User:** Student

1. Students tab → **My Certificates**
2. **Expected:** Own certificates with download button; tapping opens file

---

## Module 4: Fees

### Flow 4.1 — Admin: Fee Structure Setup
**User:** Admin

1. Fees tab → **Fee Types** → create a new fee type
2. Fees tab → **Fee Terms** → create a term (e.g., Term 1)
3. Fees tab → **Term Amounts** → assign amount to term
4. Fees tab → **Class Mappings** → map fee type to class
5. **Expected:** Fee structure visible in Collection view

### Flow 4.2 — Admin: Fee Collection
**User:** Admin

1. Fees tab → **Fee Collection**
2. Search for student by name/admission number
3. View fee summary (due amounts per term)
4. Select fees to pay → tap **Collect Payment**
5. Enter payment details → confirm
6. **Expected:** Receipt generated; balance updated

### Flow 4.3 — Admin: Fee Refund
**User:** Admin

1. Fees tab → **Refunds**
2. Tap **+** → select student → enter refund amount + reason
3. Submit → **Expected:** Refund in pending state
4. Approve refund via approval modal
5. **Expected:** Refund approved; toast notification

### Flow 4.4 — Student: Own Fee Summary
**User:** Student

1. Fees tab → **Fee Collection**
2. **Expected:** Own fee summary only (no student search bar)
3. Paid / pending / overdue amounts visible

### Flow 4.5 — Parent: Child Fee Summary
**User:** Parent

1. Fees tab → **Fee Collection**
2. **Expected:** Child selector; select child → their fee summary shown
3. Switch child → data updates

### Flow 4.6 — Admin: Fee Reports
**User:** Admin

1. Fees tab → **Reports**
2. **Tab 1 — Collection Summary:** filter by date range → verify totals
3. **Tab 2 — Pending Fees:** filter by class → verify pending amounts
4. **Tab 3 — Fee Structure:** verify class-wise fee breakdown
5. Tap **Export** → CSV/XLSX downloaded

---

## Module 5: Masters

### Flow 5.1 — Academic Years
**User:** Admin

1. Masters tab → **Academic Years**
2. Verify current year is active
3. Create a new academic year
4. **Expected:** New year in list (inactive by default)

### Flow 5.2 — Classes & Sections
**User:** Admin

1. Masters tab → **Classes & Sections**
2. Create a new class → add sections to it
3. **Expected:** Class + sections visible

### Flow 5.3 — Subjects
**User:** Admin

1. Masters tab → **Subjects**
2. Create a subject → assign to subject category
3. **Expected:** Subject in list

### Flow 5.4 — Class-Subject Mappings
**User:** Admin

1. Masters tab → **Class-Subject Mappings**
2. Map a subject to a class
3. **Expected:** Mapping saved; appears in list

### Flow 5.5 — Holidays
**User:** Admin

1. Masters tab → **Holidays**
2. Add a holiday with date + reason
3. **Expected:** Holiday appears in calendar

### Flow 5.6 — Timetable
**User:** Admin/Teacher

1. Masters tab → **Timetable**
2. Select class + section + academic year
3. Assign periods to subjects
4. Use **Repeat All for Week** → fill same schedule across days
5. **Expected:** Timetable saved; toast success

### Flow 5.7 — Student: Timetable View
**User:** Student

1. Navigate to **My Timetable** (quick link from Students tab or timetable root)
2. **Expected:** Own class timetable shown (read-only)

### Flow 5.8 — Roles & Permissions
**User:** Admin

1. Masters tab → **Roles & Permissions**
2. View existing roles
3. Edit a role's permissions → toggle a resource/action
4. **Expected:** Permission change saved

---

## Module 6: Transport

### Flow 6.1 — Admin: Routes CRUD
**User:** Admin

1. Transport tab → **Routes**
2. Create a new route (name, description)
3. **Expected:** Route in list

### Flow 6.2 — Admin: Route Stops
**User:** Admin

1. Transport tab → **Routes** → tap a route → **Stops**
2. Add a stop (name, sequence, pickup_time, drop_time)
3. **Expected:** Stop in list with times displayed

### Flow 6.3 — Admin: Vehicles
**User:** Admin

1. Transport tab → **Vehicles**
2. Create a vehicle (number plate, capacity, type)
3. **Expected:** Vehicle in list

### Flow 6.4 — Admin: Trips
**User:** Admin

1. Transport tab → **Trips**
2. Create a trip (route + vehicle + driver)
3. **Expected:** Trip in list with driver name

### Flow 6.5 — Admin: Transport Pricing
**User:** Admin

1. Transport tab → **Transport Pricing**
2. Create pricing entry (route + trip + amount)
3. **Expected:** Pricing saved; amount displayed correctly (Decimal → number conversion)

### Flow 6.6 — Admin: Student Transport Assignment
**User:** Admin

1. Transport tab → **Student Transport**
2. Assign a student to a trip + stop + pricing
3. **Expected:** Assignment in list with stop/timing details

### Flow 6.7 — Student: Own Transport View
**User:** Student

1. Students tab → **Transport** (or profile quick link)
2. **Expected:** Own bus assignment shown (stop, timing, route) — read only

### Flow 6.8 — Parent: Child Transport View
**User:** Parent

1. Navigate to child transport view
2. **Expected:** Selected child's transport assignment shown

---

## Module 7: Staff

### Flow 7.1 — Admin: Staff Enrollment
**User:** Admin

1. Staff tab → **Enrollment**
2. Tap **+** → Fill all steps:
   - Basic Info (name, email, phone, DOB, gender)
   - Work Experience
   - Qualifications (CreatableSelect for degree name)
   - Bank Details
   - Salary & PF (current_salary + last_drawn_salary as numbers)
3. Submit → **Expected:** Staff in list; toast success

### Flow 7.2 — Admin: Staff Profile View/Edit
**User:** Admin

1. Staff tab → **Staff Profile**
2. Search staff → open profile
3. Edit a field → save
4. **Expected:** Updated info shown

### Flow 7.3 — Admin: Staff Attendance Marking
**User:** Admin

1. Staff tab → **Attendance**
2. Select date
3. **Expected:** Staff list with status controls (Present/Absent/Late/Leave/Half-Day)
4. Mark attendance → **Save**
5. **Expected:** Toast success

### Flow 7.4 — Staff: Own Attendance View
**User:** Staff

1. Staff tab → **Attendance**
2. **Expected:** Own attendance summary — no marking controls

### Flow 7.5 — Admin: Designations
**User:** Admin

1. Staff tab → **Designations**
2. Create a designation (e.g., "Science Teacher")
3. **Expected:** Designation available in staff enrollment dropdown

---

## Module 8: Expense

### Flow 8.1 — Admin: Category & Type Setup
**User:** Admin

1. Expense tab → **Categories** → create category (e.g., "Office Supplies")
2. Expense tab → **Types** → create type under that category
3. **Expected:** Category and type in respective lists

### Flow 8.2 — Admin: Create Transaction
**User:** Admin

1. Expense tab → **Transactions** → tap **+**
2. Select category, type, amount, date, description
3. Submit → **Expected:** Transaction in list with "Pending" status

### Flow 8.3 — Admin: Approve Transaction
**User:** Admin (with EXPENSE_APPROVALS permission)

1. Expense tab → **Pending Approvals**
2. Find the created transaction
3. Tap **Approve** → confirm
4. **Expected:** Status changes to "Approved"; moved out of pending list

### Flow 8.4 — Admin: Expense Summary
**User:** Admin

1. Expense tab → **Summary**
2. **Expected:** Hierarchical breakdown: Category → Type → Entries
3. Tap a category to expand → verify amounts roll up correctly

### Flow 8.5 — Admin: Audit Log
**User:** Admin

1. Expense tab → **Audit Trail**
2. Apply filters (date range, category, status)
3. **Expected:** Filtered audit entries shown with action badges

### Flow 8.6 — Admin: Reports
**User:** Admin

1. Expense tab → **Reports**
2. Filter by date range + category
3. **Expected:** Report data displayed; export option available

---

## Module 9: Exam

### Flow 9.1 — Admin: Create Exam
**User:** Admin

1. Exam tab → **Exams** → tap **+**
2. Fill exam details (name, class, academic year, exam type)
3. Add exam dates per subject
4. **Expected:** Exam in list

### Flow 9.2 — Teacher: Mark Entry
**User:** Teacher

1. Exam tab → **Marks**
2. Select exam → subject → section
3. **Expected:** Student list with mark entry fields
4. Enter marks for each student → tap **Save**
5. **Expected:** Marks saved; toast success

### Flow 9.3 — Admin: Exam Results (Publish)
**User:** Admin

1. Exam tab → **Results**
2. Select exam + class + section
3. View computed results
4. Tap **Publish** → confirm
5. **Expected:** Results published; students can now view

### Flow 9.4 — Student: View Own Marks
**User:** Student

1. Exam tab → **My Marks**
2. Select exam from list
3. **Expected:** Own marks per subject + component breakdown shown
4. Absent/not-entered states displayed correctly

### Flow 9.5 — Parent: View Child Marks
**User:** Parent

1. Exam tab → **My Marks**
2. Select child → select exam
3. **Expected:** Child's marks shown

### Flow 9.6 — Admin: Hall Tickets
**User:** Admin

1. Exam tab → **Hall Tickets**
2. Select exam → tap **Compute** (not Generate)
3. **Expected:** Hall tickets generated for eligible students

### Flow 9.7 — Admin: Grade Schemes
**User:** Admin

1. Exam tab → **Grading** → **Grade Schemes**
2. Create a scheme (e.g., A=90-100, B=80-89)
3. **Expected:** Scheme saved; available for exam assignment

### Flow 9.8 — Admin: Remark Sets
**User:** Admin

1. Exam tab → **Grading** → **Remarks**
2. Create a remark set with grade-wise remarks
3. **Expected:** Remark set saved

### Flow 9.9 — Admin: Exam Permissions
**User:** Admin

1. Exam tab → **Permissions**
2. Grant mark entry permission to a teacher
3. **Expected:** Teacher can now access mark entry for that exam

---

## Module 10: Communication

### Flow 10.1 — Admin: Compose Message
**User:** Admin

1. Communication tab
2. Select **Compose** tab
3. Choose channel (SMS / WhatsApp / Email)
4. Select recipient (class/section/all)
5. Type message or use template
6. Tap **Send**
7. **Expected:** Message sent; appears in Logs

### Flow 10.2 — Admin: Template Management
**User:** Admin

1. Communication tab → **Templates** tab
2. Create a new template (name, channel, body)
3. **Expected:** Template in list; available in Compose

### Flow 10.3 — Admin: Communication Logs
**User:** Admin

1. Communication tab → **Logs** tab
2. Filter by date/channel/status
3. **Expected:** Sent messages listed with status (Sent / Failed)

---

## Module 11: Reports

### Flow 11.1 — Academic Reports
**User:** Admin

1. Reports tab → **Academic Reports**
2. Select filter criteria
3. **Expected:** Report data rendered

### Flow 11.2 — Fee Reports
**User:** Admin

1. Reports tab → **Fee Reports**
2. Select date range
3. **Expected:** Collection/pending data shown

### Flow 11.3 — Staff Reports
**User:** Admin

1. Reports tab → **Staff Reports**
2. **Expected:** Staff attendance/enrollment summary

### Flow 11.4 — Student Reports
**User:** Admin

1. Reports tab → **Student Reports**
2. **Expected:** Enrollment/attendance/performance summary

### Flow 11.5 — Transport Reports
**User:** Admin

1. Reports tab → **Transport Reports**
2. **Expected:** Route/student assignment summary

---

## Module 12: Administration

> Only visible to users with `users`, `roles`, `permissions`, or `menu` permissions.

### Flow 12.1 — User Management
**User:** Admin

1. Admin tab → **Users**
2. **Expected:** Hub showing counts: Staff users, Student users
3. Navigate to user detail → view access info

### Flow 12.2 — Roles Management
**User:** Admin

1. Admin tab → **Roles** (redirects to Masters → Roles & Permissions)
2. Create a new role
3. Assign permissions to it
4. **Expected:** Role saved; assignable to staff

### Flow 12.3 — Menu Management
**User:** Admin

1. Admin tab → **Menu**
2. View/edit menu items
3. Toggle a menu item active/inactive
4. **Expected:** Change reflected in sidebar/navigation

---

## Module 13: Profile & Settings

### Flow 13.1 — Admin Profile
**User:** Admin

1. Profile tab
2. **Expected:** Admin user details shown (name, email, role)

### Flow 13.2 — Staff Profile
**User:** Staff

1. Profile tab
2. **Expected:** Own staff profile (name, designation, bank details masked)
3. Tap **Edit** → update phone number → save
4. **Expected:** Updated info shown

### Flow 13.3 — Student Profile
**User:** Student

1. Profile tab
2. **Expected:** Own student profile (name, class, section, admission no.)

### Flow 13.4 — Parent Profile
**User:** Parent

1. Profile tab
2. **Expected:** Parent details + linked children shown
3. Tap a child → switch student context

### Flow 13.5 — Settings
**User:** Any

1. Settings tab
2. Toggle **Dark Mode** → verify theme changes
3. Change **Academic Year** → verify data reloads in modules
4. **Expected:** Preferences persisted across app restart

---

## Permission Boundary Tests

These tests verify that role-based access control is enforced.

| Test | User | Action | Expected |
|------|------|--------|----------|
| Student cannot access staff attendance | Student | Navigate to Staff tab | Tab not visible or shows no content |
| Student cannot collect fees | Student | Fees → Fee Collection | Shows own summary only; no student search |
| Parent cannot create admissions | Parent | Students → Admissions | No create button visible |
| Teacher cannot access admin tab | Teacher | Admin tab | Tab hidden or shows Access Denied |
| Staff cannot approve expenses (if not granted) | Staff | Expense → Approvals | Approvals section hidden |
| Student cannot view other students' marks | Student | Exam → My Marks | Only own marks shown |
| Parent child switch isolates data | Parent | Switch between children | All data (fees, marks, attendance) reloads for new child |

---

## Known Limitations / Not Tested on Mobile

| Feature | Notes |
|---------|-------|
| Expense Departments | Placeholder screen ("Not Available") — backend endpoint missing |
| Certificate PDF generation | Requires S3 setup on server |
| SMS/WhatsApp sending | Requires provider credentials configured |
| Push notifications | Not yet implemented |

---

## Regression Checklist (Run After Any Update)

- [ ] Login works for all 5 user types
- [ ] Tab visibility matches permissions
- [ ] Student attendance: staff can mark, student sees own
- [ ] Fee collection: admin can collect, student/parent sees own
- [ ] Transport hub: all 6 sections visible (Routes, Stops, Vehicles, Trips, Pricing, Student Transport)
- [ ] Fees hub: all 9 sections visible including Fee Reports
- [ ] Exam marks entry → publish → student view flow end-to-end
- [ ] Parent can switch between children and data isolates correctly
- [ ] First-login set-password flow for each role
- [ ] Dark mode toggle persists
- [ ] Academic year switch reloads data
