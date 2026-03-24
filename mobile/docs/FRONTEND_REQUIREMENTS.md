# COS360 Mobile App — Requirements Document

**Version:** 2.1
**Date:** 2026-03-24
**Platform:** React Native (Expo) — Android & iOS
**Project Path:** `cos360_mobile/cos360_mobile_app`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Requirements](#3-architecture-requirements)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Implementation Status & Gaps](#5-implementation-status--gaps)
6. [Modules — Screen Requirements](#6-modules--screen-requirements)
   - 6.1 [Dashboard](#61-dashboard--home-tab)
   - 6.2 [Students Module](#62-students-module)
   - 6.3 [Staff Module](#63-staff-module)
   - 6.4 [Fee Module](#64-fee-module)
   - 6.5 [Expense Module](#65-expense-module)
   - 6.6 [Exam Module](#66-exam-module)
   - 6.7 [Transport Module](#67-transport-module)
   - 6.8 [Masters Module](#68-masters-module)
   - 6.9 [Communication Module](#69-communication-module--fully-built)
7. [Cross-Cutting UI Requirements](#7-cross-cutting-ui-requirements)
8. [API Integration Contract](#8-api-integration-contract)
9. [Environment & Build](#9-environment--build)
10. [Role & Permission Matrix](#10-role--permission-matrix)

---

## 1. Project Overview

COS360 is a **multi-tenant school management system**. The mobile app mirrors the web frontend feature-set and must support five user roles with role-specific views.

### Supported Roles

| Role | Description |
|---|---|
| Admin | Full school-level CRUD access |
| Staff | Operational access (attendance, expenses) |
| Teacher | Marks entry and class management |
| Student | Read-only access to own data |
| Parent | Read-only access to child data, can switch between children |

### Multi-Tenancy

- Tenant slug stored in AsyncStorage after login
- Every API request includes a `cschema` header identifying the tenant
- Env var: `EXPO_PUBLIC_API_URL`

---

## 2. Technology Stack

| Category | Library | Version |
|---|---|---|
| Framework | React Native | 0.81.4 |
| Language | TypeScript | 5.9.2 |
| Platform | Expo SDK | 54 |
| Routing | Expo Router (file-based) | v6 |
| Server State | TanStack React Query v5 | 5.87.x |
| Global State | React Context + Zustand | — |
| HTTP Client | Axios | 1.11.x |
| Validation | Zod | 3.25.x |
| Icons | @expo/vector-icons (Ionicons) | 15.x |
| Storage | @react-native-async-storage | 2.x |
| Dropdowns | react-native-element-dropdown | 2.x |
| Date Picker | @react-native-community/datetimepicker | 8.x |
| File Picker | expo-document-picker | 14.x |
| Gesture/Anim | react-native-gesture-handler + reanimated | — |

### Key UI Conventions (Mobile)

- Icons: use `Ionicons` from `@expo/vector-icons` (NOT lucide-react)
- Loading: use `ActivityIndicator` (NOT Loader2)
- Lists: use `FlatList` with `keyExtractor`
- Forms: inline `TextInput` + `CustomDropdown` (`components/ui/dropdown.tsx`)
- Modals: React Native `Modal` with `animationType="slide"`
- Styling: `StyleSheet.create()` (NOT Tailwind)
- Toasts: `useToastContext()` from `components/ToastProvider.tsx`
- Layout wrapper: `<AppLayout title="...">` from `components/AppLayout.tsx`
- Themed text/view: `<ThemedText>` / `<ThemedView>` for dark/light support

---

## 3. Architecture Requirements

### 3.1 State Management

```
Server State  → TanStack React Query (all API data)
Global State  → React Context (AuthContext, ThemeContext, AcademicYearContext)
Extra State   → Zustand (src/stores/mobileAuthStore.ts)
Persistence   → AsyncStorage (tokens, permissions cache, tenant slug)
Form State    → React useState + Zod validation
```

### 3.2 Context Providers (required, already in place)

| Context | File | Responsibility |
|---|---|---|
| `AuthContext` | `contexts/AuthContext.tsx` | User, role, permissions, login/logout, student switcher |
| `ThemeContext` | `contexts/ThemeContext.tsx` | Dark / light mode |
| `AcademicYearContext` | `contexts/AcademicYearContext.tsx` | Active academic year |

### 3.3 Data Fetching Pattern

All API calls go through React Query hooks. Never call `apiClient` directly in screens.

```typescript
// Query example
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['students', academicYearId],
  queryFn: () => studentAdmissionsApi.getAdmissions(academicYearId),
});

// Mutation example
const mutation = useMutation({
  mutationFn: studentAdmissionsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
    showSuccess('Created successfully');
  },
  onError: (err) => showError('Failed', err.message),
});
```

### 3.4 Routing (Expo Router v6 file-based)

```
app/
├── _layout.tsx            Root layout — wraps all providers
├── index.tsx              Auth redirect / splash
├── login.tsx              Login screen
├── (tabs)/
│   ├── _layout.tsx        Tab bar + permission gating
│   ├── index.tsx          Home / dashboard
│   ├── students.tsx       Students hub
│   ├── fees.tsx           Fees hub
│   ├── masters.tsx        Masters hub
│   ├── transport.tsx      Transport hub
│   ├── staff.tsx          Staff hub
│   ├── expense.tsx        Expense hub
│   ├── exam.tsx           Exam hub
│   ├── communication.tsx  Communication hub  ✅ EXISTS
│   ├── profile.tsx        User profile
│   └── settings.tsx       Settings
├── students/              Student sub-screens
├── fees/                  Fee sub-screens
├── staff/                 Staff sub-screens
├── transport/             Transport sub-screens
├── exam/                  Exam sub-screens
├── expense/               Expense sub-screens
├── masters/               Masters sub-screens
└── communication/         Communication sub-screens  ✅ EXISTS
```

### 3.5 API Client

File: `src/api/client.ts` — Axios instance with:
- `baseURL` from `EXPO_PUBLIC_API_URL`
- `cschema` header from AsyncStorage
- `Authorization: Bearer {token}` on every request
- 401 interceptor → token refresh → retry → logout on failure
- Student context headers for parents: `X-Student-ID`, `X-Academic-Year-ID`, `X-Class-ID`

### 3.6 Permission Guard Components

Use the existing guards from `components/PermissionGuards.tsx`:

```tsx
<ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.STUDENTS}>
  {/* list content */}
</ReadOrListPermissionGuard>

<CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENTS}>
  <TouchableOpacity onPress={handleCreate}>...</TouchableOpacity>
</CreatePermissionGuard>

<UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENTS}>...</UpdatePermissionGuard>
<DeletePermissionGuard resource={PERMISSION_RESOURCES.STUDENTS}>...</DeletePermissionGuard>
```

### 3.7 Decimal / Money Fields

Backend returns Decimal fields as **strings** (e.g., `"12500.00"`). Always use `Number(val)` before display or arithmetic.

---

## 4. Authentication & Authorization

### 4.1 Login Screen (`app/login.tsx`) — ✅ EXISTS

- `POST /auth/login` with `{ username, password, academic_year_id }`
- Username by role: Staff/Teacher → email | Student → Admission Number | Parent → email
- Academic year dropdown populated from `GET /masters/academic-years/`
- On success: store token + permissions in AsyncStorage + AuthContext
- Admin login also calls `PUT /masters/academic_years/{id}` to activate the year

### 4.2 First-Login Password Change — ✅ EXISTS

- `requires_password_change: true` in login response → redirect to set-password screen
- Endpoint: `POST /auth/staff/set-password` (unified for all roles)

### 4.3 Tab Permission Gating — ✅ EXISTS

`app/(tabs)/_layout.tsx` uses `TAB_CONFIGS` array. Each tab lists `moduleResources`. Tab only shows if user has at least one permission for those resources.

**✅ Done:** Communication tab added to `TAB_CONFIGS`:

```typescript
{
  name: 'communication',
  moduleResources: ['communication', 'communication_templates', 'communication_logs'],
  requireAll: false,
},
```

### 4.4 Parent → Child Context Switching — ✅ EXISTS

- `GET /parents/{entityId}/children` → list of children
- `StudentSelector` component (`components/StudentSelector.tsx`) renders the picker
- Selected child stored in AuthContext, injected as `X-Student-ID` header

---

## 5. Implementation Status & Gaps

### 5.1 Summary

| Module | Status | Notes |
|---|---|---|
| Auth / Login | ✅ Complete | — |
| Dashboard (Home) | ✅ Complete | — |
| Students — Admission | ⚠️ Incomplete | Missing extended fields (see §6.2.1) |
| Students — Attendance | ✅ Complete | — |
| Students — Certificates | ✅ Complete | Verify presigned URL download |
| Students — Documents | ✅ Complete | — |
| Staff — Enrollment | ⚠️ Incomplete | Missing Work Experience, Bank, Salary, Qualifications (see §6.3.1) |
| Staff — Attendance | ✅ Complete | — |
| Fee — Masters (categories/types/terms) | ✅ Complete | — |
| Fee — Transactions (admin) | ✅ Complete | — |
| Fee — Collection (role-aware) | ✅ Complete | `app/fees/collection.tsx` — admin 4-tab + student/parent views |
| Fee — Reports | ✅ Complete | `app/fees/reports.tsx` — Collection, Pending, Structure tabs |
| Expense — All screens | ✅ Complete | — |
| Exam — List / Create / Detail | ✅ Complete | — |
| Exam — Mark Entry | ✅ Complete | — |
| Exam — My Marks (student/parent) | ✅ Complete | `app/exam/my-marks/[examId].tsx` |
| Exam — Grading Dashboard | ✅ Complete | `app/exam/grading.tsx` — hub linking to marks, results, hall tickets |
| Exam — Hall Tickets | ✅ Complete | Endpoint fixed to `/compute`; datatable layout |
| Transport — Hub (4 sections) | ✅ Complete | Routes · Route Stops · Vehicles · Transport Trips (matches web) |
| Transport — Routes | ✅ Complete | — |
| Transport — Route Stops | ✅ Complete | `pickup_time` / `drop_time` fields added with time pickers |
| Transport — Vehicles / Trips | ✅ Complete | — |
| Transport — Pricing | ✅ Complete | `app/transport/pricing.tsx` — full CRUD (standalone, not in hub) |
| Transport — Student Transport | ✅ Complete | Rewritten: correct API schema from `students.ts`; form: Student → Trip → Stop → `fee_per_term` (standalone, not in hub) |
| Masters — All screens | ✅ Complete | — |
| Communication | ✅ Complete | Tab + hub + compose + templates + logs — all built |
| Profile | ✅ Complete | — |
| Settings | ✅ Complete | — |

### 5.2 Build Status

**Phase 2/3 screens — ✅ All Built:**
1. `app/communication/compose.tsx` — ✅ Built
2. `app/communication/templates.tsx` — ✅ Built
3. `app/communication/logs.tsx` — ✅ Built
4. `app/(tabs)/communication.tsx` (hub) — ✅ Built
5. `app/transport/pricing.tsx` — ✅ Built
6. `app/fees/reports.tsx` — ✅ Built
7. `app/exam/my-marks/[examId].tsx` — ✅ Built
8. `app/exam/grading.tsx` — ✅ Built

**Phase 2/3 screen updates — ✅ All Applied:**
1. `app/transport/route-stops.tsx` — `pickup_time` / `drop_time` added ✅
2. `app/transport/student-transport.tsx` — complete rewrite: correct API from `students.ts`, form: Student → Trip → Stop → `fee_per_term` ✅
3. `app/exam/hall-tickets.tsx` — endpoint fixed to `/hall-tickets/compute` ✅
4. `app/(tabs)/_layout.tsx` — communication tab added to `TAB_CONFIGS` ✅

**v1.4.0 fixes — ✅ All Applied:**
1. `src/api/hooks/students/transport.ts` — import fixed from `masters.ts` → `students.ts`; uses `listStudentTransport()` and `StudentTransportOut` ✅
2. `app/expense/audit.tsx` — full audit screen implemented (was placeholder) ✅
3. `src/api/expense.ts` — global `getGlobalAuditLogs()` added; `GET /expense/audit/logs` ✅
4. `src/api/index.ts` — `staffProfileApi` now exported ✅

**Phase 4 screens — ⏳ Not yet built:**
1. `app/students/admission.tsx` — extended fields (Aadhar, caste, photo, address cascade)
2. `app/staff/enrollment.tsx` — Work Experience, Bank, Salary, Qualifications sections

---

## 6. Modules — Screen Requirements

### 6.1 Dashboard / Home Tab

**File:** `app/(tabs)/index.tsx` — ✅ EXISTS

Role-aware landing page. Render module cards from the menu items returned by auth. Only show cards the user has permission for.

---

### 6.2 Students Module

#### 6.2.1 Admission (`app/students/admission.tsx`) — ⚠️ NEEDS EXTENDED FIELDS

**Existing:** Basic CRUD with name, class, section.

**Missing fields to add:**

*Student Info:*
- Aadhar Number (text input, numeric)
- APAAR ID (text input)
- Caste (dropdown → `GET /masters/castes/`)
- Sub-Caste (dropdown → cascades from Caste, resets when Caste changes)
- Community (text input)
- Profile Photo (expo-image-picker)

*Father Details:*
- Name, Email, Phone (already may exist)
- Occupation (text input)
- Aadhar Number
- Gender (dropdown: Male/Female/Other)
- Salary Range (dropdown → `GET /masters/salary-ranges/`)

*Mother Details:* Same fields as Father

*Address:*
- Street (text input)
- State (dropdown → `GET /masters/states/`)
- District (dropdown → cascades from State, `GET /masters/districts/?state_id=`)
- Mandal (dropdown → cascades from District, `GET /masters/mandals/?district_id=`)
- Pincode (numeric text input)

*Admission Info:*
- Admission Date (DateTimePicker)
- Admission Type (dropdown — loaded from `GET /students/admission/admission-types/dropdown`; values: `primary` / `non_primary`; default: `non_primary`)
- Academic Year (dropdown, already exists)
- Admitted Class (dropdown → `GET /masters/classes/`)
- Admitted Section (dropdown → cascades from Class, `GET /masters/sections/?class_id=`)

**Role behavior:**
- Admin / Staff: Full CRUD — all fields editable
- Student / Parent: Read-only card view of own record

#### 6.2.2 Attendance (`app/students/attendance.tsx`) — ✅ EXISTS

- Admin / Staff / Teacher: Date picker + class/section filter → FlatList with mark buttons per student
- Student: Own attendance history (calendar or list view)
- Parent: Child selector → child attendance view

#### 6.2.3 Certificates (`app/students/certificates.tsx` / `mycertificates.tsx` / `studentcertificates.tsx`) — ✅ EXISTS

Role-router based on auth role:
- Admin: list all + issue + upload (`app/students/certificateupload.tsx`)
- Student: `GET /certificates/my` → list + download
- Parent: child selector → `GET /certificates/my-child/{childId}` → list + download

**Download:** `GET /certificates/{id}/download` returns `{ presigned_url }`. On mobile open with `expo-web-browser` or `Linking.openURL(presigned_url)`. Do NOT attempt blob download.

Responses are paginated: `{ items, total, has_next }`.

#### 6.2.4 Documents (`app/students/documents.tsx` / `mydocuments.tsx`) — ✅ EXISTS

Upload (admin) and view (all roles). File picker via `expo-document-picker`.

---

### 6.3 Staff Module

#### 6.3.1 Enrollment (`app/staff/enrollment.tsx`) — ⚠️ NEEDS EXTENDED FIELDS

**Existing:** Basic fields (name, email, designation, joining date).

**Missing sections to add as collapsible accordion panels:**

*Work Experience (dynamic array — add/remove rows):*
- Employer Name
- Role / Position
- From Date (DateTimePicker)
- To Date (DateTimePicker, optional)
- Description (multiline TextInput)

*Qualifications (dynamic array):*
- Degree Name (text input with suggestions — predefined list + custom)
- Institution
- Year of Passing (numeric)
- Result / Grade

*Bank Details:*
- Bank Name
- IFSC Code
- Account Number
- Account Holder Name
- Account Type (dropdown: Savings / Current)

*Salary & PF:*
- Current Salary (numeric — backend returns as Decimal string, convert with `Number()`)
- Last Drawn Salary (numeric)
- PF Account Number
- UAN Number

#### 6.3.2 Attendance (`app/staff/attendance.tsx`) — ✅ EXISTS

Date picker → FlatList of all staff → mark each: `present | absent | late | leave | half-day`. Bulk save.

---

### 6.4 Fee Module

#### 6.4.1 Fee Collection — ✅ BUILT (role-aware views)

**Create:** `app/fees/collection.tsx`

This is different from the existing `app/fees/transactions.tsx` (admin-only list). Fee Collection is a **role-aware** screen:

**Student view:**
- Endpoint: `GET /fee/my-summary?academic_year_id={id}`
- Show: Total due, Total paid, Balance, term-wise breakdown cards
- No CRUD — read only

**Parent view:**
- `StudentSelector` component to pick a child
- On child selected: `GET /fee/child-summary/{childId}?academic_year_id={id}`
- Show same summary cards as student view

**Admin / Staff / Teacher view:**
- Student search input
- On student selected → show 4 tabs using `ScrollView` + tab buttons:
  1. **Fee Summary** — overview cards + term breakdown
  2. **Fee Payment** — form to record payment (amount, date, method, receipt)
  3. **Concessions** — apply discount / waiver
  4. **Old Fees** — carry-forward balance

Add this screen to the fees hub (`app/(tabs)/fees.tsx`) as a prominent card.

#### 6.4.2 Fee Reports — ✅ BUILT

**Create:** `app/fees/reports.tsx`

Three sections (use horizontal scroll tabs or segmented control):

1. **Collection Summary**
   - Filters: date range + class
   - Endpoint: `GET /fee/reports/collection?...`
   - Display: Total Collected, Total Pending, Total Concession cards + list

2. **Pending Fees**
   - Filters: class / section / term
   - Endpoint: `GET /fee/reports/pending?...`
   - Display: FlatList of students with outstanding balance

3. **Fee Structure**
   - Filter: class
   - Endpoint: `GET /fee/reports/structure?...`
   - Display: FlatList of fee types with amounts per class

Export: Use `expo-sharing` to share a CSV file generated client-side.

#### 6.4.3 Fee Hub — ✅ COMPLETE (matches web app, 8 sub-modules)

Hub screen: `app/(tabs)/fees.tsx`

| Screen | File | Status |
|---|---|---|
| Fee Categories | `app/fees/categories.tsx` | ✅ |
| Fee Types | `app/fees/types.tsx` | ✅ |
| Fee Terms | `app/fees/terms.tsx` | ✅ |
| Fee Mappings | `app/fees/class-mappings.tsx` | ✅ |
| Fee Term Amounts | `app/fees/term-amounts.tsx` | ✅ |
| Fee Collection | `app/fees/collection.tsx` | ✅ |
| Fee Receipts | `app/fees/receipts.tsx` | ✅ |
| Fee Refunds | `app/fees/refunds.tsx` | ✅ |

> Note: `app/fees/transactions.tsx`, `app/fees/student-mappings.tsx`, and `app/fees/reports.tsx` exist as standalone screens but are not in the hub grid.

---

### 6.5 Expense Module — ✅ ALL EXIST

#### 6.5.1 Expense Hub — ✅ COMPLETE (matches web app, 6 sub-modules)

Hub screen: `app/(tabs)/expense.tsx`

| Section | Route | Status |
| --- | --- | --- |
| Categories | `app/expense/categories.tsx` | ✅ |
| Types | `app/expense/types.tsx` | ✅ |
| Transactions | `app/expense/transactions/` | ✅ |
| Pending Approvals | `app/expense/approvals.tsx` | ✅ |
| Summary | `app/expense/summary.tsx` | ✅ Complete |
| Audit Trail | `app/expense/audit.tsx` | ✅ |

#### 6.5.2 Additional Expense Screens

| Screen | File |
| --- | --- |
| Departments | `app/expense/departments.tsx` |
| Reports | `app/expense/reports.tsx` |
| Settings | `app/expense/settings.tsx` |

---

### 6.6 Exam Module

#### 6.6.1 Exam List / Create / Detail — ✅ EXIST

`app/exam/list.tsx`, `app/exam/create.tsx`, `app/exam/[id].tsx`

#### 6.6.2 Mark Entry (`app/exam/marks.tsx`) — ✅ EXISTS

Teachers enter marks per student per subject component.

#### 6.6.3 My Marks — ✅ BUILT

**Create:** `app/exam/my-marks/[examId].tsx`

**Route param:** `examId` (UUID string)

**Student view:**
- Endpoint: `GET /exams/{examId}/my-marks`
- Show per-subject breakdown: subject name, component names, marks entered
- Clearly show "Absent" or "Not Entered" states with distinct labels/colors

**Parent view:**
- `StudentSelector` picker at top
- On child selected: `GET /exams/{examId}/child-marks/{studentId}`
- Same display as student view

**Navigation:** From the exam list screen, if role is Student or Parent, the "View" button should navigate to `exam/my-marks/${examId}` instead of results.

#### 6.6.4 Results (`app/exam/results.tsx`) — ✅ EXISTS

Admin / Staff / Teacher view of published results.

#### 6.6.5 Grading Dashboard — ✅ BUILT

**Create:** `app/exam/grading.tsx`

Navigation hub with cards linking to:
- Grade Schemes (exam-level)
- Subject Grade Schemes
- Remark Grade Sets
- Hall Tickets

Only visible to Admin / Teacher roles.

#### 6.6.6 Hall Tickets (`app/exam/hall-tickets.tsx`) — ✅ FIXED

**Fixed:** Generation calls `POST /hall-tickets/compute`. Datatable layout implemented.

---

### 6.7 Transport Module

**Hub (`app/(tabs)/transport.tsx`) shows 4 sections matching the web app:**
Routes · Route Stops · Vehicles · Transport Trips

#### 6.7.1 Routes (`app/transport/routes.tsx`) — ✅ EXISTS

Full CRUD. Fields: route name, starting stop, ending stop, number of stops, route type, trip type, start/end time, is_active.

#### 6.7.2 Route Stops (`app/transport/route-stops.tsx`) — ✅ UPDATED

`pickup_time` and `drop_time` fields added to the create/edit form and displayed on each list row. Time pickers use native Android dialog / iOS bottom-sheet spinner.

#### 6.7.3 Vehicles (`app/transport/vehicles.tsx`) — ✅ EXISTS

#### 6.7.4 Transport Trips (`app/transport/trips.tsx`) — ✅ EXISTS

#### 6.7.5 Transport Pricing — ✅ BUILT (standalone, not in hub)

**File:** `app/transport/pricing.tsx`

Full CRUD screen. Not shown in transport hub grid — accessible via direct navigation.

API base: `GET|POST /masters/transport-pricing/`, `PUT|DELETE /masters/transport-pricing/{id}`

**List columns:** Name, Vehicle, Amount, Description, Active

**Create / Edit form fields:**

- Name (text input)
- Vehicle (dropdown → `GET /masters/vehicles/`)
- Amount (numeric input — **Decimal**: backend returns as string, display with `Number(val)`, send as number)
- Description (multiline text input, optional)
- Is Active (toggle switch)

#### 6.7.6 Student Transport (`app/transport/student-transport.tsx`) — ✅ REWRITTEN (standalone, not in hub)

Completely rewritten to use the correct API from `src/api/students.ts` (endpoint: `POST /students/student-transport/`).

**Form flow:** Select Student → Select Trip → Select Stop (filtered by trip's `route_id`) → Enter `fee_per_term` → optional `pricing_id`

**Create payload:**

```json
{ "student_id": "uuid", "trip_id": "uuid", "stop_id": "uuid", "fee_per_term": 1200.00 }
```

**Display fields from `StudentTransportOut`:** `trip.route.route_name`, `trip.trip_number`, `stop.name`, `stop.pickup_time`, `stop.drop_time`, `fee_per_term`

**Important:** Do NOT import `studentTransportApi` from `src/api` (index.ts) or `src/api/masters` — these export the OLD schema (`route_id`, `trip_type`, `fare_amount`). Always import from `src/api/students` directly.

**Role behavior:**

- Admin / Transport Manager: Full CRUD (accessible via direct navigation)
- Student: Read-only view of own assignment via `getTransportByStudent(studentId)`
- Parent: Child selector → child's transport assignment

---

### 6.8 Masters Module — ✅ ALL EXIST

| Screen | File |
|---|---|
| Academic Years | `app/masters/academicyears.tsx` |
| Classes & Sections | `app/masters/classesandsections.tsx` |
| Subjects | `app/masters/subjects.tsx` |
| Class-Subject Mappings | `app/masters/classsubjectmappings.tsx` |
| Subject Categories | `app/masters/subjectcategories.tsx` |
| Holidays | `app/masters/holidays.tsx` |
| Roles & Permissions | `app/masters/rolespermissions.tsx` |
| Timetable | `app/masters/timetable.tsx` |

---

### 6.9 Communication Module — ✅ FULLY BUILT

The entire module is built. Communication tab is in the bottom tab bar.

#### Step 1 — Add tab to `app/(tabs)/_layout.tsx`

Add to `TAB_CONFIGS`:
```typescript
{
  name: 'communication',
  moduleResources: ['communication', 'communication_templates'],
  requireAll: false,
},
```

Create `app/(tabs)/communication.tsx` — hub screen with cards linking to Compose, Templates, Logs.

#### Step 2 — Compose Screen

**Create:** `app/communication/compose.tsx`

Form fields:
- **Channel** — segmented control: SMS / Email / Both
- **Recipients** — dropdown with options:
  - All Students
  - All Parents
  - All Staff
  - Specific Class (shows class picker)
  - Individual (shows student/staff search)
- **Subject** — text input (visible only when Channel = Email or Both)
- **Message Body** — multiline text input
  - Show character counter below (for SMS: 160 char limit per segment)
- **Preview Count** button — calls `GET /send/preview-count?channel={channel}&recipient_type={type}&...` and shows a count chip
- **Send** button — calls `POST /send` with:
  ```json
  {
    "channel": "sms|email|both",
    "recipient_type": "all_students|all_parents|class|individual",
    "recipient_ids": [],
    "subject": "...",
    "body": "..."
  }
  ```

#### Step 3 — Templates Screen

**Create:** `app/communication/templates.tsx`

CRUD list. Each template card shows: Name, Channel, Subject preview.

**Create / Edit modal fields:**
- Name (text input)
- Channel (dropdown: SMS / Email / Both)
- Subject (text input, optional)
- Body (multiline text input)

API:
- `GET /templates/` — returns a plain array (NOT paginated). Map to `{ items: data, total: data.length, has_next: false }` in the API layer.
- `POST /templates/` — create
- `PUT /templates/{id}` — update
- `DELETE /templates/{id}` — delete

#### Step 4 — Logs Screen

**Create:** `app/communication/logs.tsx`

Read-only FlatList. Each log card shows: Timestamp, Channel badge, Recipient count, Status badge.

API: `GET /logs`

Logs are read-only — no create/edit/delete.

---

## 7. Cross-Cutting UI Requirements

### 7.1 Screen Layout

Every screen must use `<AppLayout title="Screen Title">` as the root wrapper. This provides the header, back button, and consistent padding.

### 7.2 Lists

```tsx
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemCard item={item} />}
  refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
  ListEmptyComponent={<EmptyState icon="..." message="No items found" />}
  contentContainerStyle={{ paddingBottom: 20 }}
  showsVerticalScrollIndicator={false}
/>
```

### 7.3 Loading States

```tsx
if (isLoading) {
  return (
    <AppLayout title="...">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={{ marginTop: 12 }}>Loading...</ThemedText>
      </View>
    </AppLayout>
  );
}
```

### 7.4 Error States

```tsx
if (error) {
  return (
    <AppLayout title="...">
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color={colors.destructive} />
        <ThemedText style={{ color: colors.destructive }}>Error loading data</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <ThemedText style={{ color: 'white' }}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    </AppLayout>
  );
}
```

### 7.5 CRUD Modal Pattern

```tsx
<Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={closeModal}>
  <View style={styles.modalOverlay}>
    <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <ThemedText type="subtitle">{editing ? 'Edit Item' : 'Add Item'}</ThemedText>
        <TouchableOpacity onPress={closeModal}>
          <Ionicons name="close" size={24} color={colors['muted-foreground']} />
        </TouchableOpacity>
      </View>
      {/* Form in ScrollView */}
      <ScrollView style={styles.form}>
        {/* fields */}
      </ScrollView>
      {/* Footer actions */}
      <View style={styles.modalActions}>
        <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
          <ThemedText>Cancel</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
        >
          <ThemedText style={{ color: 'white' }}>
            {mutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  </View>
</Modal>
```

### 7.6 Dropdowns

Use `CustomDropdown` from `components/ui/dropdown.tsx`:

```tsx
<CustomDropdown
  data={items.map(i => ({ value: i.id, label: i.name }))}
  value={selectedId}
  onChange={(value) => setSelectedId(String(value || ''))}
  placeholder="Select item"
  disabled={isLoading}
/>
```

For cascading dropdowns (e.g., State → District), reset the child value when the parent changes:
```tsx
onChange={(value) => {
  setStateId(String(value || ''));
  setDistrictId('');   // reset child
  setMandalId('');     // reset grandchild
}}
```

### 7.7 Status Badges (inline)

```tsx
<View style={[styles.badge, { backgroundColor: isActive ? '#10B981' : '#EF4444' }]}>
  <ThemedText style={styles.badgeText}>{isActive ? 'Active' : 'Inactive'}</ThemedText>
</View>
```

---

## 8. API Integration Contract

### Base URL

```
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Required Headers (auto-injected by `src/api/client.ts`)

| Header | Value | When |
|---|---|---|
| `Authorization` | `Bearer {token}` | All authenticated requests |
| `cschema` | `{tenantSlug}` | All requests |
| `X-Student-ID` | Student UUID | Parent context requests |
| `X-Academic-Year-ID` | UUID | Parent context requests |

### Endpoint Reference by Module

#### Auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| POST | `/auth/staff/set-password` | First-login password (all roles) |
| POST | `/auth/mobile/permissions/sync` | Sync permissions after login |

#### Students

| Method | Path | Purpose |
|---|---|---|
| GET | `/students/admissions` | List admissions |
| POST | `/students/admissions` | Create admission |
| GET | `/students/admissions/{id}` | Get single |
| PUT | `/students/admissions/{id}` | Update |
| DELETE | `/students/admissions/{id}` | Delete |
| GET | `/students/attendance` | Attendance records |
| POST | `/students/attendance` | Mark attendance |

#### Staff

| Method | Path | Purpose |
|---|---|---|
| GET | `/staff` | List staff |
| POST | `/staff` | Create staff |
| PUT | `/staff/{id}` | Update (includes extended fields) |
| DELETE | `/staff/{id}` | Delete |
| GET | `/staff/attendance` | Attendance records |
| POST | `/staff/attendance` | Bulk mark attendance |

#### Fee

| Method | Path | Purpose |
|---|---|---|
| GET | `/fee/my-summary` | Student own summary |
| GET | `/fee/child-summary/{childId}` | Parent child summary |
| GET | `/fee/categories` | Categories |
| GET | `/fee/types` | Types |
| GET | `/fee/terms` | Terms |
| GET | `/fee/transactions` | Transactions list |
| POST | `/fee/transactions` | Record payment |
| GET | `/fee/reports/collection` | Collection report |
| GET | `/fee/reports/pending` | Pending fees |
| GET | `/fee/reports/structure` | Fee structure |

#### Exam

| Method | Path | Purpose |
|---|---|---|
| GET | `/exams` | List exams |
| POST | `/exams` | Create exam |
| GET | `/exams/{id}` | Exam detail |
| PUT | `/exams/{id}` | Update exam |
| GET | `/exams/{id}/my-marks` | Student own marks |
| GET | `/exams/{id}/child-marks/{studentId}` | Child marks (parent) |
| POST | `/hall-tickets/compute` | Generate hall tickets (**NOT** `/generate`) |
| GET | `/exams/{examId}/audit` | Exam audit log |

#### Transport

| Method | Path | Purpose |
|---|---|---|
| GET | `/masters/routes` | Routes |
| GET | `/masters/route-stops` | Route stops |
| GET | `/masters/vehicles` | Vehicles |
| GET | `/masters/trips` | Trips |
| GET | `/masters/transport-pricing` | Pricing list |
| POST | `/masters/transport-pricing` | Create pricing |
| PUT | `/masters/transport-pricing/{id}` | Update pricing |
| DELETE | `/masters/transport-pricing/{id}` | Delete pricing |
| GET | `/students/student-transport/` | Student transport assignments list |
| POST | `/students/student-transport/` | Create assignment (`trip_id`, `stop_id`, `fee_per_term`) |
| PATCH | `/students/student-transport/{id}` | Update assignment |
| DELETE | `/students/student-transport/{id}` | Remove assignment |
| GET | `/students/student-transport/student/{studentId}` | Get transport for specific student |

#### Certificates

| Method | Path | Purpose |
|---|---|---|
| GET | `/certificates` | All (admin) |
| POST | `/certificates` | Issue |
| GET | `/certificates/my` | Student own list |
| GET | `/certificates/my-child/{id}` | Child list (parent) |
| GET | `/certificates/{id}/download` | Returns `{ presigned_url }` |

#### Communication

| Method | Path | Purpose |
|---|---|---|
| POST | `/send` | Send message |
| GET | `/send/preview-count` | Count recipients before send |
| GET | `/templates` | Template list (plain array) |
| POST | `/templates` | Create template |
| PUT | `/templates/{id}` | Update template |
| DELETE | `/templates/{id}` | Delete template |
| GET | `/logs` | Communication logs |

---

## 9. Environment & Build

### `.env` File

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
EXPO_PUBLIC_DEFAULT_TENANT=test_tenant
```

### Development Scripts

```bash
npx expo start               # Start Metro bundler
npx expo run:android         # Build and run on Android
npx expo run:ios             # Build and run on iOS
eas build --platform android # EAS cloud build (APK/AAB)
eas build --platform ios     # EAS cloud build (IPA)
```

### Pre-Release Checklist

- [ ] All 8 missing screens created (see §5.2)
- [ ] All 6 screen updates applied (see §5.2)
- [ ] Communication tab added to `TAB_CONFIGS`
- [ ] Hall ticket endpoint uses `/compute` not `/generate`
- [ ] `pickup_time` / `drop_time` present in route stops form
- [ ] `pricing_id` present in student transport form
- [ ] Decimal fields use `Number(val)` for display (transport pricing, staff salary)
- [ ] Certificate download uses `Linking.openURL(presigned_url)` not blob
- [ ] All role pathways tested: Admin, Staff, Teacher, Student, Parent
- [ ] `cschema` header present on all API calls
- [ ] TypeScript: zero `any` types in new screens
- [x] All CRUD mutations show `showSuccess` / `showError` toasts (rolled out to all modules — see `IMPLEMENTATION_STATUS.md`)
- [ ] Delete confirmation dialogs still use `Alert.alert` (not toasts — user must confirm destructive actions)

---

## 10. Role & Permission Matrix

### Screen Access by Role

| Screen | Admin | Staff | Teacher | Student | Parent |
|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Student Admission | CRUD | Read | Read | Own (read) | Child (read) |
| Student Attendance | Mark + Edit | Mark | Mark | Own history | Child history |
| Student Documents | CRUD | Read | — | Own | Child |
| Certificates | CRUD | Issue | — | Own + download | Child + download |
| Staff Enrollment | CRUD | Own profile | Own profile | — | — |
| Staff Attendance | Mark + Edit | Mark | — | — | — |
| Fee Collection | 4-tab admin | View | View | Own summary | Child summary |
| Fee Reports | Full | Read | — | — | — |
| Expense | Full | Create + Approve | — | — | — |
| Exam Management | Full | — | — | — | — |
| Mark Entry | View | — | Assigned subjects | — | — |
| My Marks | — | — | — | Own | Child |
| Hall Tickets | Generate + Download | — | — | Download | Child download |
| Transport Admin | CRUD | Read | — | — | — |
| My Transport | — | — | — | Own | Child |
| Communication | Full | Compose + Templates | Compose | — | — |
| Masters | Full | Read | Read | — | — |
| Roles & Permissions | Full | — | — | — | — |

### Permission Guard Resource Names

```typescript
// src/types/permissions.ts — PERMISSION_RESOURCES
STUDENTS              = 'students'
STUDENT_ADMISSIONS    = 'student_admissions'
STUDENT_ATTENDANCE    = 'student_attendance'
STAFF                 = 'staff'
STAFF_ATTENDANCE      = 'staff_attendance'
FEE_TRANSACTIONS      = 'fee_transactions'
FEE_CATEGORIES        = 'fee_categories'
EXPENSE_TRANSACTIONS  = 'expense_transactions'
EXAMS                 = 'exams'
EXAM_MARKS            = 'exam_marks'
TRANSPORT_ROUTES      = 'transport_routes'
TRANSPORT_PRICING     = 'transport_pricing'   // add if missing
COMMUNICATION         = 'communication'        // add if missing
COMMUNICATION_TEMPLATES = 'communication_templates'  // add if missing
```

---

*End of COS360 Mobile App Requirements Document*
