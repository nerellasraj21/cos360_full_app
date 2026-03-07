# Student Certificate Module — Frontend Component Specifications

**Version:** 1.0
**Date:** March 7, 2026
**Target:** React/Vue with TypeScript
**Status:** Ready for Implementation

---

## Table of Contents

1. [Type Definitions & Interfaces](#type-definitions--interfaces)
2. [Component: AdminCertificateManager](#component-admincertificatemanager)
3. [Component: StudentCertificatePage](#component-studentcertificatepage)
4. [Component: ParentCertificatePage](#component-parentcertificatepage)
5. [Component: CertificateTypeManager](#component-certificatetypemanager)
6. [Component: NotificationPanel](#component-notificationpanel)
7. [Shared Utilities & Hooks](#shared-utilities--hooks)
8. [API Integration Layer](#api-integration-layer)
9. [Error Handling Patterns](#error-handling-patterns)
10. [Responsive Breakpoints](#responsive-breakpoints)
11. [Accessibility Guidelines](#accessibility-guidelines)

---

## Type Definitions & Interfaces

### Certificate Domain Models

```typescript
// ============================================================================
// CERTIFICATE TYPES
// ============================================================================

/**
 * Certificate type enumeration for different certificate categories
 */
export enum CertificateStatusEnum {
  ACTIVE = "active",
  STALE = "stale",
  DELETED = "deleted",
}

/**
 * Certificate type master data (from backend)
 */
export interface ICertificateType {
  id: string;                 // UUID
  name: string;               // e.g., "Bonafide", "Transfer", "Conduct"
  description?: string;
  created_at: string;         // ISO 8601 datetime
}

/**
 * Certificate issue record
 */
export interface ICertificate {
  id: string;                 // UUID
  student_id: string;         // UUID
  certificate_type_id: string; // UUID FK
  type_name: string;          // Denormalized from CertificateType (JOIN result)
  file_path: string;          // S3 key: "tenant/certificates/student_id/uuid.ext"
  issue_date: string;         // Date (YYYY-MM-DD)
  remarks?: string;           // Optional notes
  status: CertificateStatusEnum; // "active" | "stale"
  created_at: string;         // ISO 8601 datetime
  updated_at?: string;        // ISO 8601 datetime (nullable initially)
}

/**
 * Certificate creation request (multipart/form-data)
 */
export interface ICertificateCreateRequest {
  student_id: string;         // UUID
  certificate_type_id: string; // UUID
  issue_date: string;         // Date (YYYY-MM-DD)
  remarks?: string;
  file: File;                 // Binary file (PDF, JPG, PNG, DOCX)
}

/**
 * Certificate update request (PATCH body + optional file)
 */
export interface ICertificateUpdateRequest {
  certificate_type_id?: string; // Optional UUID
  issue_date?: string;         // Optional date
  remarks?: string;            // Optional text
  file?: File;                // Optional new file
}

/**
 * Download response from backend
 */
export interface ICertificateDownloadResponse {
  presigned_url: string;      // AWS S3 presigned URL (valid 15 min)
  expires_in_seconds: number; // 900
  certificate_id: string;     // UUID
  filename?: string;          // e.g., "Bonafide_Ravi_Kumar.pdf"
}

/**
 * Paginated list response wrapper
 */
export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

/**
 * Student summary (for dropdowns/search)
 */
export interface IStudentOption {
  id: string;                 // UUID
  admission_number: string;   // E.g., "2021001"
  full_name: string;          // E.g., "Ravi Kumar"
  class_name?: string;        // E.g., "Class X-A"
}

/**
 * Filter & sort state for certificate lists
 */
export interface ICertificateFilterState {
  search?: string;            // Search student name or admission no.
  certificate_type_id?: string; // Filter by type UUID
  status?: CertificateStatusEnum; // Filter by status
  sort_by?: "type" | "issue_date" | "created_at"; // Sort column
  sort_order?: "asc" | "desc";
  skip: number;               // Pagination offset
  limit: number;              // Page size (default 25)
}

/**
 * Notification event for real-time updates
 */
export interface ICertificateNotificationEvent {
  id: string;                 // Event UUID
  type: "issued" | "updated" | "deleted"; // Event type
  certificate_id: string;     // UUID
  student_id: string;         // UUID
  student_name: string;       // Display name
  certificate_type: string;   // E.g., "Bonafide"
  actor_name?: string;        // Who performed the action
  timestamp: string;          // ISO 8601 datetime
  message?: string;           // Display message
}

/**
 * Audit log entry (for admin view)
 */
export interface IFileAuditLogEntry {
  id: string;                 // UUID
  actor_id: string;           // UUID
  actor_role: string;         // "Admin", "Staff", "Teacher"
  student_id?: string;        // UUID (nullable)
  certificate_id?: string;    // UUID (nullable)
  action: string;             // "upload", "update", "delete", "download"
  s3_key?: string;            // S3 path (nullable)
  created_at: string;         // ISO 8601 datetime
}

/**
 * Error response from API
 */
export interface IApiErrorResponse {
  detail: string;             // Error message
  status_code: number;        // HTTP status (400, 404, 403, etc.)
  errors?: Record<string, string[]>; // Field-level validation errors
}
```

---

## Component: AdminCertificateManager

### Purpose
Admin dashboard for issuing, listing, filtering, updating, and deleting certificates. Full CRUD operations with search, filtering, sorting, and bulk actions.

### Component Tree
```
AdminCertificateManager (Page Container)
├── PageHeader (Title + Breadcrumb)
├── CertificateIssuanceModal (Overlay Form)
│   ├── StudentSearchAutocomplete
│   ├── CertificateTypeSelect
│   ├── DatePicker
│   ├── TextArea (Remarks)
│   ├── FileUploadDropzone
│   └── SubmitButton
├── FilterBar (Search + Dropdowns)
│   ├── StudentSearchInput
│   ├── CertificateTypeFilter
│   ├── StatusFilter
│   └── SortSelector
├── CertificateListTable
│   ├── TableHeader (Sortable Columns)
│   ├── TableBody
│   │   └── CertificateRow (per item)
│   │       ├── DownloadButton
│   │       ├── EditButton
│   │       └── DeleteButton
│   ├── LoadingState
│   ├── ErrorState
│   └── EmptyState
└── Pagination (Skip/Limit)
```

### Props Interface

```typescript
/**
 * Props for AdminCertificateManager component
 */
export interface AdminCertificateManagerProps {
  /** Optional initial filter state */
  initialFilter?: Partial<ICertificateFilterState>;

  /** Callback when a certificate is created (optional, for tracking) */
  onCertificateIssued?: (cert: ICertificate) => void;

  /** Callback when a certificate is updated */
  onCertificateUpdated?: (cert: ICertificate) => void;

  /** Callback when a certificate is deleted */
  onCertificateDeleted?: (certId: string) => void;
}
```

### State Management

```typescript
/**
 * Internal state for AdminCertificateManager
 */
interface AdminCertificateManagerState {
  // List state
  certificates: ICertificate[];
  totalCount: number;
  isLoadingCertificates: boolean;
  certificateError: IApiErrorResponse | null;

  // Filter & pagination
  filter: ICertificateFilterState;

  // Modal states
  isIssueModalOpen: boolean;
  isEditModalOpen: boolean;
  selectedCertificateForEdit: ICertificate | null;

  // Create/Update form state
  formData: {
    studentId: string;
    certificateTypeId: string;
    issueDate: string;      // YYYY-MM-DD
    remarks: string;
    file: File | null;
  };
  formErrors: Record<string, string>;
  isSubmittingForm: boolean;

  // Delete confirmation
  isDeleteConfirmOpen: boolean;
  certificateToDelete: ICertificate | null;
  isDeletingCertificate: boolean;

  // Master data (dropdowns)
  certificateTypes: ICertificateType[];
  isLoadingTypes: boolean;

  // Success message
  successMessage: string | null;
}
```

### Key Methods & Event Handlers

```typescript
// ============================================================================
// FETCH & LOAD DATA
// ============================================================================

/**
 * Load paginated certificate list with current filters
 */
async function loadCertificates(
  filterState: ICertificateFilterState
): Promise<void> {
  // - Set isLoadingCertificates = true
  // - Call API: GET /api/v1/certificates/
  //   Query params: skip, limit, search?, type_id?, status?, sort_by?, sort_order?
  // - On success: update certificates[], totalCount, clear error
  // - On error: set certificateError
  // - Set isLoadingCertificates = false
}

/**
 * Load certificate types for dropdown (cached, 300s TTL)
 */
async function loadCertificateTypes(): Promise<void> {
  // - Call API: GET /api/v1/certificates/types/dropdown
  // - On success: update certificateTypes[]
  // - Cache result in localStorage with timestamp
}

/**
 * Search students by name/admission number (typeahead)
 */
async function searchStudents(query: string): Promise<IStudentOption[]> {
  // - Debounce 300ms
  // - Call API: GET /api/v1/students/search?q={query}
  // - Return filtered list (max 20 results)
}

// ============================================================================
// CREATE CERTIFICATE
// ============================================================================

/**
 * Open the "Issue New Certificate" modal
 */
function openIssueModal(): void {
  // - Set isIssueModalOpen = true
  // - Reset formData to initial state
  // - Reset formErrors
}

/**
 * Close the issue/edit modal
 */
function closeModal(): void {
  // - Set isIssueModalOpen = false
  // - Set isEditModalOpen = false
  // - Reset formData
  // - Reset formErrors
}

/**
 * Update form field value
 */
function updateFormField(
  fieldName: keyof AdminCertificateManagerState["formData"],
  value: any
): void {
  // - Update formData[fieldName] = value
  // - Clear error for this field (formErrors[fieldName] = undefined)
}

/**
 * Validate form before submission
 */
function validateForm(): { isValid: boolean; errors: Record<string, string> } {
  // - Check studentId is not empty
  // - Check certificateTypeId is not empty
  // - Check issueDate is valid date
  // - Check file is selected and > 0 bytes
  // - Check file extension in [.pdf, .jpg, .jpeg, .png, .docx]
  // - Check file size <= 10 MB
  // - Return { isValid: boolean, errors: Record<string, string> }
}

/**
 * Submit the issue certificate form
 */
async function submitIssueForm(): Promise<void> {
  // 1. Call validateForm()
  // 2. If invalid, set formErrors and return
  // 3. Set isSubmittingForm = true
  // 4. Build FormData object with fields: student_id, certificate_type_id, issue_date, remarks, file
  // 5. Call API: POST /api/v1/certificates/
  //    Content-Type: multipart/form-data
  // 6. On success:
  //    - Show toast: "Certificate issued successfully"
  //    - Call onCertificateIssued callback
  //    - Close modal
  //    - Reload certificate list
  //    - Set successMessage
  // 7. On error:
  //    - Extract error message from response.detail
  //    - If field errors, populate formErrors
  //    - Show error toast
  // 8. Set isSubmittingForm = false
}

// ============================================================================
// UPDATE CERTIFICATE
// ============================================================================

/**
 * Open the edit modal for a specific certificate
 */
function openEditModal(certificate: ICertificate): void {
  // - Set selectedCertificateForEdit = certificate
  // - Populate formData with current values
  // - Set isEditModalOpen = true
}

/**
 * Submit the edit certificate form (PATCH)
 */
async function submitEditForm(): Promise<void> {
  // 1. If no selectedCertificateForEdit, return
  // 2. Build update payload (only include changed fields)
  // 3. If file is provided, build FormData; else send JSON
  // 4. Call API: PATCH /api/v1/certificates/{id}
  // 5. On success:
  //    - Show toast: "Certificate updated successfully"
  //    - Call onCertificateUpdated callback
  //    - Close modal
  //    - Reload certificate list
  // 6. On error:
  //    - Set formErrors or show error toast
  // 7. Set isSubmittingForm = false
}

// ============================================================================
// DELETE CERTIFICATE
// ============================================================================

/**
 * Open delete confirmation dialog
 */
function openDeleteConfirm(certificate: ICertificate): void {
  // - Set certificateToDelete = certificate
  // - Set isDeleteConfirmOpen = true
}

/**
 * Cancel delete operation
 */
function cancelDelete(): void {
  // - Set isDeleteConfirmOpen = false
  // - Set certificateToDelete = null
}

/**
 * Confirm and perform delete
 */
async function confirmDelete(): Promise<void> {
  // 1. If no certificateToDelete, return
  // 2. Set isDeletingCertificate = true
  // 3. Call API: DELETE /api/v1/certificates/{id}
  // 4. On success:
  //    - Show toast: "Certificate deleted (moved to stale zone for 10 days)"
  //    - Call onCertificateDeleted callback
  //    - Close dialog
  //    - Reload certificate list
  // 5. On error:
  //    - Show error toast with message
  // 6. Set isDeletingCertificate = false
}

// ============================================================================
// DOWNLOAD CERTIFICATE (PREVIEW/TEST)
// ============================================================================

/**
 * Initiate download of a certificate (get presigned URL)
 */
async function downloadCertificate(
  certificateId: string
): Promise<void> {
  // 1. Call API: GET /api/v1/certificates/{id}/download
  // 2. On success:
  //    - Receive { presigned_url, expires_in_seconds, filename }
  //    - Open presigned_url in new tab/window
  //    - Backend will audit log this action
  // 3. On error:
  //    - Show error toast (likely permission denied)
}

// ============================================================================
// FILTER & SORTING
// ============================================================================

/**
 * Update search query and reload list
 */
function updateSearch(query: string): void {
  // - Debounce 500ms
  // - Set filter.search = query
  // - Reset skip to 0
  // - Call loadCertificates(filter)
}

/**
 * Filter by certificate type
 */
function filterByType(typeId: string | null): void {
  // - If typeId is null, clear filter (set to undefined)
  // - Set filter.certificate_type_id = typeId
  // - Reset skip to 0
  // - Call loadCertificates(filter)
}

/**
 * Filter by status (active/stale/deleted)
 */
function filterByStatus(status: CertificateStatusEnum | null): void {
  // - If status is null, clear filter
  // - Set filter.status = status
  // - Reset skip to 0
  // - Call loadCertificates(filter)
}

/**
 * Sort by column
 */
function sortBy(column: "type" | "issue_date" | "created_at"): void {
  // - If current sort_by === column, toggle sort_order (asc ↔ desc)
  // - Else set sort_by = column and sort_order = "asc"
  // - Reset skip to 0
  // - Call loadCertificates(filter)
}

/**
 * Change pagination page
 */
function changePage(newSkip: number): void {
  // - Set filter.skip = newSkip
  // - Call loadCertificates(filter)
  // - Scroll to top of list
}
```

### Lifecycle & Initialization

```typescript
/**
 * Component mount/init
 * - Load certificate types (for dropdowns)
 * - Load initial certificate list (with initialFilter or defaults)
 * - Set up event listeners (if using WebSocket for real-time updates)
 */
function onMounted(): void {
  // React: useEffect(() => { ... }, [])
  // Vue: onMounted(() => { ... })
}

/**
 * Component cleanup
 * - Close any open modals
 * - Cancel pending API requests
 * - Unsubscribe from WebSocket (if applicable)
 */
function onUnmount(): void {
  // React: useEffect(() => { return () => { ... }; }, [])
  // Vue: onUnmounted(() => { ... })
}
```

### API Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/certificates/` | Create certificate (multipart/form-data) |
| `GET` | `/api/v1/certificates/` | List certificates with filters |
| `GET` | `/api/v1/certificates/types/dropdown` | Get all certificate types (cached) |
| `PATCH` | `/api/v1/certificates/{id}` | Update certificate (multipart or JSON) |
| `DELETE` | `/api/v1/certificates/{id}` | Delete certificate (move to stale) |
| `GET` | `/api/v1/certificates/{id}` | Get single certificate details |
| `GET` | `/api/v1/certificates/{id}/download` | Get presigned URL for download |
| `GET` | `/api/v1/students/search` | Search students (autocomplete) |

### Error Handling

```typescript
/**
 * Error scenarios & handling
 */
enum CertificateErrorScenario {
  // Network/API errors
  NETWORK_ERROR = "Network connection failed",
  SERVER_ERROR = "Server error (500+)",
  UNAUTHORIZED = "Unauthorized (401) — refresh token",
  FORBIDDEN = "Permission denied (403)",
  NOT_FOUND = "Certificate not found (404)",

  // Form validation
  INVALID_FILE = "File must be PDF, JPG, PNG, or DOCX",
  FILE_TOO_LARGE = "File exceeds 10 MB limit",
  MISSING_REQUIRED_FIELD = "Please fill all required fields",
  INVALID_DATE = "Invalid date format",

  // Business logic
  STUDENT_NOT_FOUND = "Selected student not found",
  TYPE_NOT_FOUND = "Selected certificate type not found",
  DUPLICATE_ISSUE = "Certificate already issued for this type",
}

/**
 * Error handling wrapper
 */
function handleError(error: any, context: string): void {
  // - Check error.response?.status
  // - Map to appropriate message & toast level (error/warning/info)
  // - Log to console in development
  // - Show user-friendly message
  // - Optionally track in error monitoring (Sentry, etc.)
}
```

### Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|-----------|-------|-----------------|
| **xs** (mobile) | < 640px | Single column, modal full-screen, dropdown instead of filter bar |
| **sm** (tablet) | 640–1024px | 2 columns, modal 90% width, horizontal scrolling table |
| **md** (small desktop) | 1024–1280px | 3 columns, modal 70% width, standard table |
| **lg** (desktop) | 1280–1536px | Full 4-column layout, modal 60% width |
| **xl** (large desktop) | > 1536px | Full 5-column layout with side panel |

**Specific UI Changes:**
- **xs/sm**: Hide non-essential columns (remarks, updated_at); show in row detail overlay
- **sm**: Modal buttons stack vertically
- **md+**: Modal buttons side-by-side
- **lg+**: Add side-by-side view of list + detail panel
- **xl**: Add audit log panel

### Accessibility (WCAG 2.1 Level AA)

```typescript
/**
 * Accessibility attributes & practices
 */

// Form inputs
<input
  id="student-search"
  aria-label="Search student by name or admission number"
  aria-describedby="student-search-help"
  aria-autocomplete="list"
  role="combobox"
  aria-expanded={isStudentListOpen}
  aria-owns="student-suggestions"
  placeholder="Search student..."
/>
<div id="student-search-help" className="sr-only">
  Type to search and select a student
</div>

// Modal dialog
<dialog
  id="issue-certificate-modal"
  open={isIssueModalOpen}
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  role="alertdialog"
>
  <h2 id="modal-title">Issue New Certificate</h2>
  <p id="modal-description">Fill in the form below to issue a new certificate</p>
  {/* form fields */}
</dialog>

// List table
<table
  role="grid"
  aria-label="Issued certificates"
  aria-describedby="table-description"
>
  <caption id="table-description">
    List of all issued certificates with options to download, edit, or delete
  </caption>
  <thead>
    <tr>
      <th aria-sort="ascending">Student Name</th>
      <th aria-sort="none">Certificate Type</th>
      {/* sortable columns have aria-sort attribute */}
    </tr>
  </thead>
</table>

// Loading state
<div role="status" aria-live="polite" aria-label="Loading certificates...">
  <Spinner />
</div>

// Error state
<div role="alert" aria-live="assertive" className="error-message">
  Failed to load certificates. Please try again.
</div>

// Buttons
<button
  type="button"
  id="issue-new-btn"
  aria-label="Issue a new certificate"
  onClick={openIssueModal}
>
  + Issue New Certificate
</button>

// Delete confirmation
<button
  aria-label="Delete certificate for Ravi Kumar (Bonafide)"
  onClick={() => openDeleteConfirm(cert)}
>
  🗑 Delete
</button>

// Focus management
// - When modal opens: focus moves to first form field
// - When modal closes: focus returns to triggering button
// - Escape key closes modal
// - Tab key cycles through modal form fields (trapped)

// Keyboard navigation
// - Enter/Space on buttons triggers action
// - Tab navigates between interactive elements
// - Shift+Tab navigates backward
// - Escape closes modals/popovers
// - Arrow Up/Down in autocomplete cycles options
```

### Loading / Error / Empty States

```typescript
/**
 * StateRenderer component for consistent UI
 */

// Loading state
<div className="loading-state" role="status" aria-live="polite">
  <Spinner size="lg" />
  <p>Loading certificates...</p>
</div>

// Error state
<div className="error-state" role="alert" aria-live="assertive">
  <ErrorIcon />
  <h3>Failed to Load Certificates</h3>
  <p>{error.detail}</p>
  <button onClick={() => loadCertificates(filter)}>
    Try Again
  </button>
</div>

// Empty state (no results)
<div className="empty-state">
  <DocumentIcon size="4xl" color="gray-300" />
  <h3>No Certificates Issued</h3>
  <p>No certificates match your filter criteria</p>
  <button onClick={() => {
    resetFilter();
    loadCertificates(defaultFilter);
  }}>
    Clear Filters
  </button>
</div>

// Empty form state
<div className="empty-message">
  <p>Select a certificate to view details or edit</p>
</div>
```

---

## Component: StudentCertificatePage

### Purpose
Student dashboard showing their own certificates with download functionality. Read-only view with real-time notifications.

### Component Tree
```
StudentCertificatePage (Page Container)
├── PageHeader (My Certificates)
├── NotificationBell [Link to NotificationPanel]
├── FilterBar (optional)
│   ├── SortSelector (issued date, type)
│   └── StatusFilter
├── CertificateCardList (Responsive grid/list)
│   ├── CertificateCard (per item)
│   │   ├── CertificateIcon
│   │   ├── TypeName
│   │   ├── IssueDate
│   │   ├── Status Badge
│   │   └── DownloadButton
│   ├── LoadingState
│   ├── ErrorState
│   └── EmptyState
└── Pagination (if > 25 items)
```

### Props Interface

```typescript
/**
 * Props for StudentCertificatePage component
 */
export interface StudentCertificatePageProps {
  /** Current user ID (from auth context) */
  userId: string;

  /** Current user role */
  userRole: "student" | "parent" | "admin";

  /** Optional callback on certificate download */
  onCertificateDownloaded?: (cert: ICertificate) => void;
}
```

### State Management

```typescript
/**
 * Internal state for StudentCertificatePage
 */
interface StudentCertificatePageState {
  // List state
  certificates: ICertificate[];
  totalCount: number;
  isLoadingCertificates: boolean;
  certificateError: IApiErrorResponse | null;

  // Filter & pagination
  filter: {
    sort_by?: "issue_date" | "created_at" | "type";
    sort_order?: "asc" | "desc";
    status?: CertificateStatusEnum;
    skip: number;
    limit: number;
  };

  // Download state
  downloadingCertificateIds: Set<string>; // Track in-progress downloads
  downloadErrors: Record<string, string>; // Map cert ID to error message

  // Notification subscription
  isSubscribedToNotifications: boolean;
  websocketConnected: boolean;
}
```

### Key Methods & Event Handlers

```typescript
// ============================================================================
// FETCH & LOAD DATA
// ============================================================================

/**
 * Load student's own certificates
 */
async function loadMyCertificates(
  filter: StudentCertificatePageState["filter"]
): Promise<void> {
  // - Set isLoadingCertificates = true
  // - Call API: GET /api/v1/certificates/my
  //   Query params: skip, limit, sort_by?, sort_order?, status?
  // - On success: update certificates[], totalCount
  // - On error: set certificateError
  // - Set isLoadingCertificates = false
}

// ============================================================================
// DOWNLOAD CERTIFICATE
// ============================================================================

/**
 * Download a certificate (get presigned URL and redirect)
 */
async function downloadCertificate(
  certificateId: string,
  fileName?: string
): Promise<void> {
  // 1. Add certificateId to downloadingCertificateIds
  // 2. Call API: GET /api/v1/certificates/{id}/download
  // 3. On success:
  //    - Receive { presigned_url, expires_in_seconds, filename }
  //    - Open presigned_url in new tab (window.open or fetch + download)
  //    - Show toast: "Download started"
  //    - Call onCertificateDownloaded callback
  // 4. On error:
  //    - Store error in downloadErrors[certificateId]
  //    - Show error toast (e.g., "Certificate not accessible")
  // 5. Remove certificateId from downloadingCertificateIds
}

// ============================================================================
// FILTER & SORTING
// ============================================================================

/**
 * Sort certificates
 */
function sortBy(column: "issue_date" | "created_at" | "type"): void {
  // - If current sort_by === column, toggle sort_order
  // - Else set sort_by = column, sort_order = "asc"
  // - Reset skip to 0
  // - Call loadMyCertificates(filter)
}

/**
 * Filter by status
 */
function filterByStatus(status: CertificateStatusEnum | null): void {
  // - If status is null, clear filter
  // - Set filter.status = status
  // - Reset skip to 0
  // - Call loadMyCertificates(filter)
}

/**
 * Change pagination page
 */
function changePage(newSkip: number): void {
  // - Set filter.skip = newSkip
  // - Call loadMyCertificates(filter)
  // - Scroll to top of list
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Subscribe to certificate-related notifications (WebSocket)
 */
function subscribeToNotifications(): void {
  // - Connect to /ws/notifications
  // - Listen for cert events: issued, updated, deleted
  // - On new event:
  //    - Reload certificate list
  //    - Show notification (optional toast)
  // - Set isSubscribedToNotifications = true, websocketConnected = true
}

/**
 * Unsubscribe from notifications
 */
function unsubscribeFromNotifications(): void {
  // - Close WebSocket connection
  // - Set isSubscribedToNotifications = false, websocketConnected = false
}
```

### Lifecycle & Initialization

```typescript
function onMounted(): void {
  // 1. Load initial certificate list
  // 2. Subscribe to WebSocket notifications
}

function onUnmount(): void {
  // 1. Cancel pending API requests
  // 2. Unsubscribe from notifications
}
```

### API Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/certificates/my` | Get student's own certificates |
| `GET` | `/api/v1/certificates/{id}` | Get single certificate details |
| `GET` | `/api/v1/certificates/{id}/download` | Get presigned URL for download |
| `WS` | `/ws/notifications` | WebSocket for real-time events |

### Error Handling

```typescript
/**
 * Error scenarios specific to StudentCertificatePage
 */
enum StudentCertificateErrorScenario {
  NO_CERTIFICATES = "No certificates issued yet",
  DOWNLOAD_FAILED = "Failed to download certificate",
  PERMISSIONS_REVOKED = "Your access to this certificate was revoked",
  CERTIFICATE_EXPIRED = "This certificate has expired",
  NETWORK_ERROR = "Connection failed, please check your internet",
}

function handleError(error: any, context: string): void {
  // - Check error type and show appropriate message
  // - For 403: show "Your access to this certificate was revoked"
  // - For 404: show "Certificate not found or removed"
  // - For network: show offline prompt with retry button
}
```

### Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| **xs** (mobile) | Single column, full-width cards |
| **sm** (tablet) | 1-2 columns depending on content |
| **md** (small desktop) | 2-3 column grid |
| **lg** (desktop) | 3 column grid |
| **xl** (large desktop) | 4 column grid with side info panel |

### Accessibility

```typescript
// Page title & structure
<h1 aria-label="My Certificates">My Certificates</h1>

// Certificate card
<article
  className="certificate-card"
  aria-label={`Certificate: ${cert.type_name} issued on ${cert.issue_date}`}
>
  <h2 className="sr-only">{cert.type_name}</h2>
  <p><span className="sr-only">Certificate type:</span> {cert.type_name}</p>
  <p><time dateTime={cert.issue_date}>{formatDate(cert.issue_date)}</time></p>
  <button
    aria-label={`Download ${cert.type_name} certificate`}
    disabled={downloadingCertificateIds.has(cert.id)}
    aria-busy={downloadingCertificateIds.has(cert.id)}
  >
    {downloadingCertificateIds.has(cert.id) ? "Downloading..." : "↓ Download"}
  </button>
</article>

// Notification bell
<button
  id="notification-bell"
  aria-label={`Notifications (${unreadCount} unread)`}
  aria-pressed={isNotificationPanelOpen}
>
  🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
</button>
```

### Loading / Error / Empty States

```typescript
// Loading
<div className="loading-container" role="status" aria-live="polite">
  <Spinner />
  <p>Loading your certificates...</p>
</div>

// Error
<div className="error-container" role="alert" aria-live="assertive">
  <ErrorIcon />
  <p>Failed to load certificates</p>
  <button onClick={() => loadMyCertificates(filter)}>Retry</button>
</div>

// Empty
<div className="empty-container">
  <DocumentIcon size="4xl" color="gray-300" />
  <h2>No Certificates Yet</h2>
  <p>You haven't received any certificates. Check back later.</p>
</div>
```

---

## Component: ParentCertificatePage

### Purpose
Parent view of child's certificates. Similar to StudentCertificatePage but with child selection and parent-specific authorization.

### Component Tree
```
ParentCertificatePage (Page Container)
├── PageHeader (Child's Certificates)
├── ChildSelector (Dropdown or list of linked children)
├── StudentCertificatePage (Reuse component)
│   └── with student_id={selectedChildId}
└── UnauthorizedView (if not linked to child)
```

### Props Interface

```typescript
export interface ParentCertificatePageProps {
  parentUserId: string;
  onChildSelected?: (childId: string, childName: string) => void;
}
```

### State Management

```typescript
interface ParentCertificatePageState {
  // Child selection
  linkedChildren: Array<{
    id: string;
    full_name: string;
    class_name?: string;
    admission_number: string;
  }>;
  selectedChildId: string | null;
  isLoadingChildren: boolean;

  // Verification
  childVerified: boolean; // True if parent is linked to selected child
  verificationError: string | null;

  // Inherit StudentCertificatePage state
  studentCertificateState: StudentCertificatePageState;
}
```

### Key Methods

```typescript
/**
 * Load list of children linked to this parent
 */
async function loadLinkedChildren(): Promise<void> {
  // - Call API: GET /api/v1/students/my-children
  // - On success: update linkedChildren[]
  // - Set selectedChildId to first child (or from URL param)
  // - Call verifyParentLink(selectedChildId)
}

/**
 * Verify parent is linked to selected child (authorization check)
 */
async function verifyParentLink(childId: string): Promise<boolean> {
  // - Send child_id to API (implicit in endpoint)
  // - Call API: GET /api/v1/certificates/my-child/{child_id}
  //   (This endpoint has parent-link verification built-in)
  // - On 403: parent not linked
  // - On 404: child not found
  // - Return true if verified
}

/**
 * Select a different child
 */
async function selectChild(childId: string): Promise<void> {
  // 1. Set selectedChildId = childId
  // 2. Call verifyParentLink(childId)
  // 3. If verified: call StudentCertificatePage with new child_id
  // 4. If not verified: show error "You are not authorized to view this child's certificates"
}
```

### Lifecycle

```typescript
function onMounted(): void {
  // 1. Load linkedChildren
  // 2. Auto-select first child
  // 3. Verify and load certs
}
```

### API Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/students/my-children` | Get parent's linked children |
| `GET` | `/api/v1/certificates/my-child/{student_id}` | Get child's certificates (with parent link verification) |

### Special Handling

```typescript
/**
 * When user is not a parent or has no linked children
 */
function renderUnauthorized(): JSX.Element {
  return (
    <div className="unauthorized-container">
      <WarningIcon />
      <h2>No Children Linked</h2>
      <p>You are not linked to any students. Contact the school administration.</p>
      <button onClick={() => navigate("/")}>Go Home</button>
    </div>
  );
}
```

---

## Component: CertificateTypeManager

### Purpose
Master data CRUD for certificate types (Bonafide, Transfer, Conduct, etc.). Admin-only interface.

### Component Tree
```
CertificateTypeManager (Page Container)
├── PageHeader (Certificate Types)
├── CreateTypeButton [Link to CreateTypeModal]
├── CertificateTypeTable
│   ├── TableHeader (Columns: Name, Description, Created, Actions)
│   ├── TableBody
│   │   └── TypeRow (per item)
│   │       ├── Name
│   │       ├── Description
│   │       ├── CreatedAt
│   │       ├── EditButton
│   │       └── DeleteButton
│   ├── LoadingState
│   ├── ErrorState
│   └── EmptyState
├── CreateTypeModal (Form overlay)
├── EditTypeModal (Form overlay)
└── DeleteConfirmDialog
```

### Props Interface

```typescript
export interface CertificateTypeManagerProps {
  onTypeCreated?: (type: ICertificateType) => void;
  onTypeUpdated?: (type: ICertificateType) => void;
  onTypeDeleted?: (typeId: string) => void;
}
```

### State Management

```typescript
interface CertificateTypeManagerState {
  // List state
  types: ICertificateType[];
  totalCount: number;
  isLoadingTypes: boolean;
  typeError: IApiErrorResponse | null;

  // Pagination
  skip: number;
  limit: number;

  // Modal states
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  selectedTypeForEdit: ICertificateType | null;

  // Form state
  formData: {
    name: string;
    description: string;
  };
  formErrors: Record<string, string>;
  isSubmittingForm: boolean;

  // Delete confirmation
  isDeleteConfirmOpen: boolean;
  typeToDelete: ICertificateType | null;
  isDeletingType: boolean;

  // Success message
  successMessage: string | null;
}
```

### Key Methods

```typescript
// ============================================================================
// LOAD DATA
// ============================================================================

/**
 * Load all certificate types with pagination
 */
async function loadCertificateTypes(skip: number = 0): Promise<void> {
  // - Set isLoadingTypes = true
  // - Call API: GET /api/v1/certificates/types/?skip={skip}&limit={limit}
  // - On success: update types[], totalCount
  // - On error: set typeError
  // - Set isLoadingTypes = false
}

// ============================================================================
// CREATE TYPE
// ============================================================================

function openCreateModal(): void {
  // - Set isCreateModalOpen = true
  // - Reset formData to { name: "", description: "" }
  // - Reset formErrors
}

function closeCreateModal(): void {
  // - Set isCreateModalOpen = false
  // - Reset formData
}

async function submitCreateForm(): Promise<void> {
  // 1. Validate: name is not empty, name length 2-100
  // 2. Call API: POST /api/v1/certificates/types/
  //    Body: { name, description }
  // 3. On success:
  //    - Show toast: "Certificate type created"
  //    - Call onTypeCreated callback
  //    - Close modal
  //    - Reload types
  // 4. On error:
  //    - Show validation errors if present
  //    - Handle specific 400/409 responses (duplicate name?)
  // 5. Set isSubmittingForm = false
}

// ============================================================================
// UPDATE TYPE
// ============================================================================

function openEditModal(type: ICertificateType): void {
  // - Set selectedTypeForEdit = type
  // - Populate formData with current values
  // - Set isEditModalOpen = true
}

async function submitEditForm(): Promise<void> {
  // 1. Validate form
  // 2. Call API: PUT /api/v1/certificates/types/{id}
  //    Body: { name, description }
  // 3. On success:
  //    - Show toast: "Certificate type updated"
  //    - Call onTypeUpdated callback
  //    - Close modal
  //    - Reload types
  // 4. On error: show errors
  // 5. Set isSubmittingForm = false
}

// ============================================================================
// DELETE TYPE
// ============================================================================

function openDeleteConfirm(type: ICertificateType): void {
  // - Set typeToDelete = type
  // - Set isDeleteConfirmOpen = true
}

async function confirmDelete(): Promise<void> {
  // 1. Call API: DELETE /api/v1/certificates/types/{id}
  // 2. On success:
  //    - Show toast: "Certificate type deleted"
  //    - Call onTypeDeleted callback
  //    - Close dialog
  //    - Reload types
  // 3. On error (400/409):
  //    - Show message: "Cannot delete. Certificates of this type exist."
  // 4. Set isDeletingType = false
}

// ============================================================================
// PAGINATION
// ============================================================================

function changePage(newSkip: number): void {
  // - Call loadCertificateTypes(newSkip)
}
```

### Lifecycle

```typescript
function onMounted(): void {
  // - Load types with default pagination (skip=0, limit=25)
}
```

### API Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/certificates/types/` | List all types (paginated) |
| `POST` | `/api/v1/certificates/types/` | Create new type |
| `GET` | `/api/v1/certificates/types/{id}` | Get single type |
| `PUT` | `/api/v1/certificates/types/{id}` | Update type |
| `DELETE` | `/api/v1/certificates/types/{id}` | Delete type (409 if in use) |
| `GET` | `/api/v1/certificates/types/dropdown` | Get all types (for dropdowns, cached) |

### Error Handling

```typescript
/**
 * Special error cases for type management
 */
enum TypeManagerErrorScenario {
  DUPLICATE_NAME = "A certificate type with this name already exists",
  IN_USE = "Cannot delete. Certificates of this type exist.",
  INVALID_NAME = "Name must be 2-100 characters",
  NETWORK_ERROR = "Network error, please try again",
  SERVER_ERROR = "Server error, please try again",
}
```

### Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| **xs/sm** | Single column table with horizontal scroll |
| **md+** | Standard table view |

### Accessibility

```typescript
// Create button
<button
  aria-label="Create new certificate type"
  onClick={openCreateModal}
>
  + Create Type
</button>

// Table
<table
  role="grid"
  aria-label="Certificate types"
>
  <caption>List of all certificate types with actions to create, edit, or delete</caption>
  {/* ... */}
</table>

// Form modal
<dialog
  aria-labelledby="edit-modal-title"
  role="alertdialog"
>
  <h2 id="edit-modal-title">Edit Certificate Type</h2>
  {/* ... */}
</dialog>

// Delete confirmation
<dialog
  role="alertdialog"
  aria-labelledby="delete-title"
  aria-describedby="delete-description"
>
  <h2 id="delete-title">Delete Certificate Type?</h2>
  <p id="delete-description">
    This action cannot be undone if no certificates of this type exist.
  </p>
  {/* ... */}
</dialog>
```

---

## Component: NotificationPanel

### Purpose
Real-time notification drawer/panel for certificate events (issued, updated, deleted). Uses WebSocket for live updates.

### Component Tree
```
NotificationPanel (Floating Drawer/Panel)
├── Header (Notifications, unread badge)
├── CloseButton
├── NotificationsList
│   ├── NotificationItem (per event)
│   │   ├── EventIcon (cert issued/updated/deleted)
│   │   ├── EventMessage
│   │   ├── Timestamp (relative time)
│   │   ├── ActionButton (View/Dismiss)
│   │   └── DismissButton
│   ├── LoadingState (initial connection)
│   ├── ErrorState (connection failed)
│   └── EmptyState (no notifications)
├── MarkAllAsReadButton
└── SettingsButton (optional: notification preferences)
```

### Props Interface

```typescript
export interface NotificationPanelProps {
  /** Is the panel open? */
  isOpen: boolean;

  /** Callback when panel is closed */
  onClose?: () => void;

  /** Callback when notification is viewed/clicked */
  onNotificationViewed?: (notification: ICertificateNotificationEvent) => void;

  /** Callback when notification is dismissed */
  onNotificationDismissed?: (notificationId: string) => void;

  /** Initial notification list (from local storage or API) */
  initialNotifications?: ICertificateNotificationEvent[];

  /** Position (right drawer, left drawer, bottom sheet, etc.) */
  position?: "right" | "left" | "bottom";

  /** Auto-dismiss time (ms), 0 = no auto-dismiss */
  autoDismissTime?: number;
}
```

### State Management

```typescript
interface NotificationPanelState {
  // WebSocket & connection
  websocketConnected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number; // ms

  // Notifications
  notifications: ICertificateNotificationEvent[];
  unreadCount: number;
  isLoadingNotifications: boolean;

  // UI state
  isExpanded: boolean;
  selectedNotificationId: string | null;

  // Persistence
  dismissedNotificationIds: Set<string>; // For "don't show again"
}
```

### Key Methods

```typescript
// ============================================================================
// WEBSOCKET CONNECTION
// ============================================================================

/**
 * Connect to WebSocket for real-time certificate notifications
 */
async function connectWebSocket(): Promise<void> {
  // 1. Get JWT token from auth context
  // 2. Initialize WebSocket: ws://api.server/ws/notifications?token={jwt}
  // 3. Set up handlers:
  //    - onOpen: set websocketConnected = true, clear reconnectAttempts
  //    - onMessage: parse JSON event, add to notifications[]
  //    - onError: log error, attempt reconnect
  //    - onClose: schedule reconnect (exponential backoff)
  // 4. Send initial "subscribe" message (if backend requires)
}

/**
 * Reconnect to WebSocket with exponential backoff
 */
async function reconnectWebSocket(): Promise<void> {
  // 1. If reconnectAttempts >= maxReconnectAttempts, give up
  // 2. Wait reconnectDelay * (2 ^ reconnectAttempts) ms
  // 3. Call connectWebSocket()
  // 4. Increment reconnectAttempts
}

/**
 * Close WebSocket connection
 */
function disconnectWebSocket(): void {
  // - Close websocket gracefully
  // - Set websocketConnected = false
  // - Clear timers
}

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

/**
 * Add a new notification (received from WebSocket)
 */
function addNotification(event: ICertificateNotificationEvent): void {
  // 1. Check if already in notifications[] (dedup by ID)
  // 2. Prepend to notifications[] (newest first)
  // 3. Increment unreadCount
  // 4. Persist to localStorage: `certificate_notifications`
  // 5. Show browser notification (if permission granted):
  //    new Notification("Certificate Issued", { body: event.message })
  // 6. Optionally play sound (if enabled in preferences)
}

/**
 * Mark a notification as read
 */
function markAsRead(notificationId: string): void {
  // - Find notification by ID
  // - Set read = true
  // - Decrement unreadCount
  // - Update UI
}

/**
 * Mark all notifications as read
 */
function markAllAsRead(): void {
  // - Set read = true for all notifications
  // - Reset unreadCount to 0
  // - Update UI
}

/**
 * Dismiss a notification (remove from view, but keep in history)
 */
function dismissNotification(notificationId: string): void {
  // - Remove from notifications[]
  // - Add to dismissedNotificationIds
  // - Update localStorage
}

/**
 * Clear all notifications
 */
function clearAllNotifications(): void {
  // - Set notifications[] = []
  // - Set unreadCount = 0
  // - Clear localStorage
}

/**
 * Load historical notifications from API (on mount or pagination)
 */
async function loadHistoricalNotifications(
  skip: number = 0,
  limit: number = 20
): Promise<void> {
  // - Call API: GET /api/v1/notifications?skip={skip}&limit={limit}&type=certificate
  // - On success: merge with notifications[] (avoid duplicates)
  // - Set isLoadingNotifications = false
}

// ============================================================================
// USER ACTIONS
// ============================================================================

/**
 * Click "View" on a notification (navigate to certificate or list)
 */
function viewNotification(notification: ICertificateNotificationEvent): void {
  // 1. Mark as read
  // 2. Call onNotificationViewed callback
  // 3. Depending on notification.type:
  //    - "issued": navigate to AdminCertificateManager with filter by student
  //    - "updated": navigate to AdminCertificateManager, scroll to cert
  //    - "deleted": show toast "Certificate has been deleted"
}

/**
 * Click "Dismiss" button on a notification
 */
function dismissNotificationClick(notificationId: string): void {
  // 1. Call dismissNotification(notificationId)
  // 2. Call onNotificationDismissed callback
}

/**
 * Toggle notification preferences (sound, browser notifications, etc.)
 */
function toggleNotificationPreferences(
  preference: "sound" | "browser" | "email"
): void {
  // - Update localStorage: `certificate_notification_prefs`
  // - Show toast: "Preference updated"
}
```

### Lifecycle

```typescript
function onMounted(): void {
  // 1. Load historical notifications from localStorage or API
  // 2. Call connectWebSocket()
  // 3. Request browser notification permission (if not already granted)
}

function onUnmount(): void {
  // 1. Call disconnectWebSocket()
}

function onPanelOpened(): void {
  // 1. Call markAllAsRead()
  // 2. Ensure WebSocket is still connected
}

function onPanelClosed(): void {
  // - No special action (WebSocket stays connected)
}
```

### API Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| `WS` | `/ws/notifications` | WebSocket for real-time events |
| `GET` | `/api/v1/notifications` | Get historical notifications (paginated) |
| `PATCH` | `/api/v1/notifications/{id}` | Mark notification as read |
| `DELETE` | `/api/v1/notifications/{id}` | Dismiss notification |

### WebSocket Event Format

```typescript
/**
 * Notification event structure from WebSocket
 */
interface WebSocketNotificationMessage {
  type: "notification" | "connected" | "error";
  data?: ICertificateNotificationEvent;
  message?: string; // For error type
}

// Example incoming event:
{
  type: "notification",
  data: {
    id: "evt-uuid-123",
    type: "issued",
    certificate_id: "cert-uuid",
    student_id: "student-uuid",
    student_name: "Ravi Kumar",
    certificate_type: "Bonafide",
    actor_name: "Admin User",
    timestamp: "2026-03-07T10:30:00Z",
    message: "New certificate issued to Ravi Kumar (Bonafide)"
  }
}
```

### Error Handling

```typescript
/**
 * WebSocket error scenarios
 */
enum WebSocketErrorScenario {
  CONNECTION_FAILED = "Failed to connect to notification service",
  RECONNECT_FAILED = "Connection lost, retrying...",
  RECONNECT_EXCEEDED = "Connection lost, will try again later",
  TOKEN_EXPIRED = "Session expired, please refresh",
  SERVER_ERROR = "Server error on notification service",
}

function handleWebSocketError(error: any): void {
  // - Check error type and set appropriate state
  // - Show error toast for user (but don't interrupt main UI)
  // - Attempt automatic reconnect with exponential backoff
  // - After max retries, show persistent error UI with manual retry button
}
```

### Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| **xs/sm** | Bottom sheet (drawer slides up from bottom) |
| **md+** | Right-side drawer (slides in from right) |

### Accessibility

```typescript
// Panel container
<aside
  role="complementary"
  aria-label="Notifications"
  aria-live="polite"
  aria-atomic="false"
>
  <h2>Notifications</h2>
  {/* ... */}
</aside>

// Notification item
<div
  role="article"
  aria-live="polite"
  className={isUnread ? "unread" : "read"}
>
  <time dateTime={timestamp}>{formatRelativeTime(timestamp)}</time>
  <p>{message}</p>
  {/* ... */}
</div>

// Unread badge
<span className="badge" aria-label={`${unreadCount} unread notifications`}>
  {unreadCount}
</span>

// Dismiss button
<button
  aria-label={`Dismiss notification: ${notification.message}`}
  onClick={() => dismissNotificationClick(notification.id)}
>
  Dismiss
</button>

// Close panel button
<button
  aria-label="Close notifications panel"
  onClick={onClose}
>
  Close
</button>
```

### Loading / Error / Empty States

```typescript
// Loading initial connection
<div className="loading-state" role="status" aria-live="polite">
  <Spinner size="sm" />
  <p>Connecting to notifications...</p>
</div>

// Connection error
<div className="error-state" role="alert" aria-live="assertive">
  <ErrorIcon />
  <p>Failed to connect to notifications</p>
  <button onClick={() => connectWebSocket()}>Retry</button>
</div>

// No notifications
<div className="empty-state">
  <BellOffIcon />
  <p>No notifications yet</p>
</div>

// Disconnected overlay
<div className="disconnected-banner" role="alert">
  <p>🔌 Reconnecting...</p>
</div>
```

### Local Storage Schema

```typescript
/**
 * LocalStorage keys for NotificationPanel
 */
const STORAGE_KEYS = {
  NOTIFICATIONS: "certificate_notifications",        // JSON array
  DISMISSED_IDS: "certificate_dismissed_notifications", // JSON array
  PREFERENCES: "certificate_notification_prefs",      // JSON object
  LAST_SYNC: "certificate_notifications_last_sync",   // ISO timestamp
};

/**
 * Sample localStorage structure
 */
{
  "certificate_notifications": [
    {
      "id": "evt-uuid",
      "type": "issued",
      "certificate_id": "cert-uuid",
      "student_name": "Ravi Kumar",
      "certificate_type": "Bonafide",
      "timestamp": "2026-03-07T10:30:00Z",
      "read": false
    }
  ],
  "certificate_notification_prefs": {
    "soundEnabled": true,
    "browserNotificationsEnabled": true,
    "emailNotificationsEnabled": false
  },
  "certificate_notifications_last_sync": "2026-03-07T10:35:00Z"
}
```

---

## Shared Utilities & Hooks

### Custom Hooks

```typescript
// ============================================================================
// USEAPI - GENERIC API CALL HOOK
// ============================================================================

/**
 * Generic hook for making API calls with error handling & loading states
 */
export function useApi<T, E = IApiErrorResponse>(
  initialValue: T
): {
  data: T;
  loading: boolean;
  error: E | null;
  execute: (
    endpoint: string,
    options?: RequestInit
  ) => Promise<T | null>;
  reset: () => void;
} {
  // React implementation
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<E | null>(null);

  const execute = useCallback(
    async (
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(endpoint, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuthToken()}`,
          },
          ...options,
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData);
          return null;
        }

        const result = await response.json();
        setData(result);
        return result;
      } catch (err) {
        setError(err as E);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(initialValue);
    setLoading(false);
    setError(null);
  }, [initialValue]);

  return { data, loading, error, execute, reset };
}

// ============================================================================
// USEFORM - FORM STATE MANAGEMENT HOOK
// ============================================================================

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  onSubmit: (values: T) => Promise<void>
): {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isDirty: boolean;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  setFieldError: (field: keyof T, error: string) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  resetForm: () => void;
} {
  // Implementation: manage form state, validation, submission
}

// ============================================================================
// USEDEBOUNCE - DEBOUNCE HOOK
// ============================================================================

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// USELOCALSTORAGE - PERSIST STATE HOOK
// ============================================================================

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.log(error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

// ============================================================================
// USEWEBSOCKET - WEBSOCKET CONNECTION HOOK
// ============================================================================

export function useWebSocket(
  url: string,
  options?: {
    onMessage?: (data: any) => void;
    onError?: (error: Event) => void;
    onClose?: () => void;
    reconnectAttempts?: number;
    reconnectDelay?: number;
  }
): {
  connected: boolean;
  error: Event | null;
  send: (data: any) => void;
  close: () => void;
} {
  // Implementation: manage WebSocket connection, reconnect logic, message handling
}

// ============================================================================
// USEPAGINATION - PAGINATION STATE HOOK
// ============================================================================

export function usePagination(
  totalItems: number,
  itemsPerPage: number = 25
): {
  currentPage: number;
  totalPages: number;
  skip: number;
  limit: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
} {
  // Implementation: manage pagination state
}

// ============================================================================
// USEAUTH - AUTH CONTEXT HOOK
// ============================================================================

export function useAuth() {
  return useContext(AuthContext);
  // Returns: { user, token, login, logout, refreshToken, hasPermission }
}
```

### API Service Layer

```typescript
// ============================================================================
// CERTIFICATEAPI SERVICE
// ============================================================================

export class CertificateApiService {
  private baseUrl = process.env.REACT_APP_API_URL || "/api/v1";
  private headers = {
    "Content-Type": "application/json",
  };

  // ============================================================================
  // CERTIFICATES
  // ============================================================================

  /**
   * Create a new certificate (multipart/form-data)
   */
  async createCertificate(
    request: ICertificateCreateRequest,
    onUploadProgress?: (progress: number) => void
  ): Promise<ICertificate> {
    const formData = new FormData();
    formData.append("student_id", request.student_id);
    formData.append("certificate_type_id", request.certificate_type_id);
    formData.append("issue_date", request.issue_date);
    if (request.remarks) {
      formData.append("remarks", request.remarks);
    }
    formData.append("file", request.file);

    const xhr = new XMLHttpRequest();

    if (onUploadProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onUploadProgress(progress);
        }
      });
    }

    return new Promise((resolve, reject) => {
      xhr.addEventListener("load", () => {
        if (xhr.status === 201) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(JSON.parse(xhr.responseText));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error"));
      });

      xhr.open("POST", `${this.baseUrl}/certificates/`);
      xhr.setRequestHeader("Authorization", `Bearer ${getAuthToken()}`);
      xhr.send(formData);
    });
  }

  /**
   * List certificates with filters & pagination
   */
  async listCertificates(
    params: Partial<ICertificateFilterState>
  ): Promise<IPaginatedResponse<ICertificate>> {
    const queryParams = new URLSearchParams();
    if (params.skip !== undefined) queryParams.append("skip", String(params.skip));
    if (params.limit !== undefined) queryParams.append("limit", String(params.limit));
    if (params.search) queryParams.append("search", params.search);
    if (params.certificate_type_id)
      queryParams.append("type_id", params.certificate_type_id);
    if (params.status) queryParams.append("status", params.status);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const response = await fetch(
      `${this.baseUrl}/certificates/?${queryParams}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  /**
   * Get student's own certificates
   */
  async listMyCertificates(
    params: Partial<Omit<ICertificateFilterState, "search">> = {}
  ): Promise<IPaginatedResponse<ICertificate>> {
    const queryParams = new URLSearchParams();
    if (params.skip !== undefined) queryParams.append("skip", String(params.skip));
    if (params.limit !== undefined) queryParams.append("limit", String(params.limit));
    if (params.status) queryParams.append("status", params.status);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const response = await fetch(
      `${this.baseUrl}/certificates/my${queryParams.toString() ? "?" + queryParams : ""}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  /**
   * Get child's certificates (parent view)
   */
  async listChildCertificates(
    studentId: string,
    params: Partial<Omit<ICertificateFilterState, "search">> = {}
  ): Promise<IPaginatedResponse<ICertificate>> {
    const queryParams = new URLSearchParams();
    if (params.skip !== undefined) queryParams.append("skip", String(params.skip));
    if (params.limit !== undefined) queryParams.append("limit", String(params.limit));
    if (params.status) queryParams.append("status", params.status);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const response = await fetch(
      `${this.baseUrl}/certificates/my-child/${studentId}${queryParams.toString() ? "?" + queryParams : ""}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(id: string): Promise<ICertificate> {
    const response = await fetch(`${this.baseUrl}/certificates/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  /**
   * Update certificate (PATCH)
   */
  async updateCertificate(
    id: string,
    request: ICertificateUpdateRequest & { file?: File }
  ): Promise<ICertificate> {
    if (request.file) {
      // Use FormData if file is present
      const formData = new FormData();
      if (request.certificate_type_id)
        formData.append("certificate_type_id", request.certificate_type_id);
      if (request.issue_date) formData.append("issue_date", request.issue_date);
      if (request.remarks) formData.append("remarks", request.remarks);
      if (request.file) formData.append("file", request.file);

      const response = await fetch(`${this.baseUrl}/certificates/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        body: formData,
      });

      if (!response.ok) throw new Error(await response.text());
      return response.json();
    } else {
      // Use JSON if no file
      const response = await fetch(`${this.baseUrl}/certificates/${id}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }
  }

  /**
   * Delete certificate
   */
  async deleteCertificate(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/certificates/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) throw new Error(await response.text());
  }

  /**
   * Download certificate (get presigned URL)
   */
  async downloadCertificate(
    id: string
  ): Promise<ICertificateDownloadResponse> {
    const response = await fetch(
      `${this.baseUrl}/certificates/${id}/download`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  // ============================================================================
  // CERTIFICATE TYPES
  // ============================================================================

  /**
   * List certificate types with pagination
   */
  async listCertificateTypes(
    skip: number = 0,
    limit: number = 25
  ): Promise<IPaginatedResponse<ICertificateType>> {
    const response = await fetch(
      `${this.baseUrl}/certificates/types/?skip=${skip}&limit=${limit}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  /**
   * Get certificate types dropdown (cached by backend)
   */
  async getCertificateTypesDropdown(): Promise<ICertificateType[]> {
    const response = await fetch(
      `${this.baseUrl}/certificates/types/dropdown`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  /**
   * Create certificate type
   */
  async createCertificateType(
    data: Omit<ICertificateType, "id" | "created_at">
  ): Promise<ICertificateType> {
    const response = await fetch(`${this.baseUrl}/certificates/types/`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  /**
   * Update certificate type
   */
  async updateCertificateType(
    id: string,
    data: Partial<Omit<ICertificateType, "id" | "created_at">>
  ): Promise<ICertificateType> {
    const response = await fetch(
      `${this.baseUrl}/certificates/types/${id}`,
      {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  /**
   * Delete certificate type
   */
  async deleteCertificateType(id: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/certificates/types/${id}`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
  }

  // ============================================================================
  // STUDENTS (Search/Autocomplete)
  // ============================================================================

  /**
   * Search students by name or admission number
   */
  async searchStudents(query: string): Promise<IStudentOption[]> {
    const response = await fetch(
      `${this.baseUrl}/students/search?q=${encodeURIComponent(query)}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  /**
   * Get parent's linked children
   */
  async getLinkedChildren(): Promise<IStudentOption[]> {
    const response = await fetch(
      `${this.baseUrl}/students/my-children`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  /**
   * Get historical notifications
   */
  async getNotifications(
    skip: number = 0,
    limit: number = 20
  ): Promise<IPaginatedResponse<ICertificateNotificationEvent>> {
    const response = await fetch(
      `${this.baseUrl}/notifications?skip=${skip}&limit=${limit}&type=certificate`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/notifications/${id}`,
      {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ read: true }),
      }
    );

    if (!response.ok) throw new Error(await response.text());
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(id: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/notifications/${id}`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) throw new Error(await response.text());
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getAuthHeaders(): HeadersInit {
    return {
      ...this.headers,
      Authorization: `Bearer ${getAuthToken()}`,
    };
  }
}

// Singleton instance
export const certificateApi = new CertificateApiService();
```

### Utility Functions

```typescript
// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

/**
 * Format date to "DD Mon YYYY" (e.g., "07 Mar 2026")
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format datetime to "DD Mon YYYY, HH:mm" (e.g., "07 Mar 2026, 10:30")
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format datetime to relative time (e.g., "2 mins ago", "Just now")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

  return formatDateShort(dateStr);
}

// ============================================================================
// FILE UTILITIES
// ============================================================================

/**
 * Get file extension from filename or File object
 */
export function getFileExtension(file: File | string): string {
  const name = typeof file === "string" ? file : file.name;
  return name.slice(((name.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
}

/**
 * Check if file extension is allowed
 */
export function isFileExtensionAllowed(file: File): boolean {
  const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "docx"];
  return ALLOWED_EXTENSIONS.includes(getFileExtension(file));
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File
): { isValid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  if (!file) {
    return { isValid: false, error: "Please select a file" };
  }

  if (file.size > MAX_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_SIZE / 1024 / 1024}MB limit`,
    };
  }

  if (!isFileExtensionAllowed(file)) {
    return {
      isValid: false,
      error: "File must be PDF, JPG, PNG, or DOCX",
    };
  }

  return { isValid: true };
}

/**
 * Format file size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// ============================================================================
// FORM VALIDATION UTILITIES
// ============================================================================

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Build form validation errors object
 */
export function validateFormData(
  data: Record<string, any>,
  schema: Record<string, (value: any) => string | null>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [field, validator] of Object.entries(schema)) {
    const error = validator(data[field]);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
}

// ============================================================================
// AUTH UTILITIES
// ============================================================================

/**
 * Get JWT token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

/**
 * Get current user from auth context
 */
export function getCurrentUser(): {
  id: string;
  username: string;
  role: string;
} | null {
  const token = getAuthToken();
  if (!token) return null;

  try {
    // Decode JWT (assuming standard JWT structure)
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(atob(parts[1]));
    return {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Check if current user has a permission
 */
export function hasPermission(permission: string): boolean {
  // This should check backend permission, not just JWT claims
  // Implementation depends on how permissions are stored/transmitted
  const user = getCurrentUser();
  if (!user) return false;

  // Example: admin always has all permissions
  if (user.role === "Admin") return true;

  // Otherwise, query API or check permission store
  return false;
}

// ============================================================================
// TOAST/NOTIFICATION UTILITIES
// ============================================================================

/**
 * Show toast notification
 */
export function showToast(
  message: string,
  type: "success" | "error" | "info" | "warning" = "info",
  duration: number = 3000
): void {
  // Implementation: dispatch to toast manager/context
  // This is framework-dependent (Chakra UI, react-hot-toast, etc.)
  console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Show error toast with automatic retry button
 */
export function showErrorToast(
  error: any,
  retryCallback?: () => void
): void {
  let message = "An error occurred";

  if (typeof error === "string") {
    message = error;
  } else if (error?.detail) {
    message = error.detail;
  } else if (error?.message) {
    message = error.message;
  }

  showToast(message, "error", 5000);

  // If retry callback provided, also show retry button (component-specific)
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Truncate string to specified length with ellipsis
 */
export function truncateString(
  str: string,
  maxLength: number = 50
): string {
  if (str.length > maxLength) {
    return str.substring(0, maxLength - 3) + "...";
  }
  return str;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format display name from snake_case or camelCase
 */
export function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1") // camelCase
    .replace(/_/g, " ")         // snake_case
    .replace(/\b\w/g, (l) => l.toUpperCase()) // capitalize
    .trim();
}
```

---

## API Integration Layer

### Base API Configuration

```typescript
/**
 * API configuration and constants
 */
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1",
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_DURATION: 300000, // 5 minutes
};

/**
 * HTTP methods
 */
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
}

/**
 * API response envelope
 */
export interface ApiResponse<T> {
  data?: T;
  error?: IApiErrorResponse;
  status: number;
  headers: HeadersInit;
}

/**
 * Request interceptor configuration
 */
export interface RequestInterceptorConfig {
  beforeRequest?: (config: RequestInit) => RequestInit;
  afterResponse?: <T>(response: ApiResponse<T>) => ApiResponse<T>;
  onError?: (error: IApiErrorResponse) => void;
}
```

### Request/Response Interceptors

```typescript
/**
 * Global request interceptor for adding auth headers, logging, etc.
 */
export function createRequestInterceptor(): RequestInterceptorConfig {
  return {
    beforeRequest: (config) => {
      const token = getAuthToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }

      // Add tenant/schema header if available
      const tenantSchema = localStorage.getItem("tenant_schema");
      if (tenantSchema) {
        config.headers = {
          ...config.headers,
          "X-Tenant-Schema": tenantSchema,
        };
      }

      return config;
    },

    afterResponse: (response) => {
      // Log response (development)
      if (process.env.NODE_ENV === "development") {
        console.debug(`[API] ${response.status}`, response);
      }

      return response;
    },

    onError: (error) => {
      // Handle specific error codes globally
      if (error.status_code === 401) {
        // Token expired, redirect to login
        window.location.href = "/login";
      }

      if (error.status_code === 403) {
        // Permission denied
        showToast("You don't have permission to perform this action", "error");
      }

      if (error.status_code >= 500) {
        // Server error
        showToast(
          "Server error. Please try again later.",
          "error",
          5000
        );
      }
    },
  };
}
```

---

## Error Handling Patterns

### Error Hierarchy

```typescript
/**
 * Certificate module error types
 */
export enum CertificateErrorType {
  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",

  // Client errors (4xx)
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",

  // Server errors (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // Business logic errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  FILE_VALIDATION_ERROR = "FILE_VALIDATION_ERROR",
  DUPLICATE_ERROR = "DUPLICATE_ERROR",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

  // UI errors
  FORM_ERROR = "FORM_ERROR",
  STATE_ERROR = "STATE_ERROR",
}

/**
 * Structured error object
 */
export interface AppError {
  type: CertificateErrorType;
  message: string;
  statusCode?: number;
  fieldErrors?: Record<string, string[]>;
  originalError?: Error;
  retryable: boolean;
}

/**
 * Error mapper: convert API error to app error
 */
export function mapApiErrorToAppError(
  error: any
): AppError {
  // Check for network error
  if (!error.response || error.message === "Network Error") {
    return {
      type: CertificateErrorType.NETWORK_ERROR,
      message: "Network connection failed. Please check your internet.",
      retryable: true,
      originalError: error,
    };
  }

  // Check for timeout
  if (error.code === "ECONNABORTED") {
    return {
      type: CertificateErrorType.TIMEOUT,
      message: "Request timeout. Please try again.",
      retryable: true,
      originalError: error,
    };
  }

  const status = error.response?.status;
  const detail = error.response?.data?.detail || error.message;
  const fieldErrors = error.response?.data?.errors;

  // Map by status code
  switch (status) {
    case 400:
      return {
        type: CertificateErrorType.BAD_REQUEST,
        message: detail || "Invalid request. Please check your input.",
        statusCode: status,
        fieldErrors,
        retryable: false,
        originalError: error,
      };

    case 401:
      return {
        type: CertificateErrorType.UNAUTHORIZED,
        message: "Your session has expired. Please login again.",
        statusCode: status,
        retryable: true,
        originalError: error,
      };

    case 403:
      return {
        type: CertificateErrorType.FORBIDDEN,
        message: "You don't have permission to perform this action.",
        statusCode: status,
        retryable: false,
        originalError: error,
      };

    case 404:
      return {
        type: CertificateErrorType.NOT_FOUND,
        message: detail || "The requested resource was not found.",
        statusCode: status,
        retryable: false,
        originalError: error,
      };

    case 409:
      return {
        type: CertificateErrorType.CONFLICT,
        message: detail || "This resource already exists or is in conflict.",
        statusCode: status,
        retryable: false,
        originalError: error,
      };

    case 500:
    case 502:
    case 503:
      return {
        type: CertificateErrorType.INTERNAL_ERROR,
        message: "Server error. Please try again later.",
        statusCode: status,
        retryable: true,
        originalError: error,
      };

    default:
      return {
        type: CertificateErrorType.INTERNAL_ERROR,
        message: detail || "An unexpected error occurred.",
        statusCode: status,
        retryable: status >= 500,
        originalError: error,
      };
  }
}

/**
 * Global error handler/logger
 */
export function handleError(error: AppError, context: string): void {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}]`, error);
  }

  // Log to error tracking service (Sentry, etc.)
  if (window.__SENTRY__) {
    window.__SENTRY__.captureException(error);
  }

  // Show appropriate toast message
  showToast(error.message, "error");
}
```

---

## Responsive Breakpoints

### Tailwind CSS / Bootstrap Breakpoints

```typescript
/**
 * Responsive breakpoint values (pixels)
 */
export const BREAKPOINTS = {
  xs: 0,    // Extra small (mobile)
  sm: 640,  // Small (tablet)
  md: 1024, // Medium (small desktop)
  lg: 1280, // Large (desktop)
  xl: 1536, // Extra large (large desktop)
  "2xl": 1792, // 2XL
};

/**
 * Responsive class helper (for Tailwind)
 */
export function responsiveClass(
  classMap: Record<string, string>
): string {
  // Example:
  // responsiveClass({
  //   xs: "grid grid-cols-1",
  //   md: "grid-cols-2",
  //   lg: "grid-cols-3",
  // })
  // Returns: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
  return Object.entries(classMap)
    .map(([breakpoint, classes]) => {
      if (breakpoint === "xs") return classes;
      return `${breakpoint}:${classes}`;
    })
    .join(" ");
}

/**
 * Hook for checking current breakpoint
 */
export function useBreakpoint(): {
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  currentBreakpoint: "xs" | "sm" | "md" | "lg" | "xl";
} {
  const [breakpoint, setBreakpoint] = useState<"xs" | "sm" | "md" | "lg" | "xl">(
    "xs"
  );

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint("xs");
      else if (width < 1024) setBreakpoint("sm");
      else if (width < 1280) setBreakpoint("md");
      else if (width < 1536) setBreakpoint("lg");
      else setBreakpoint("xl");
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call once on mount

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isXs: breakpoint === "xs",
    isSm: breakpoint === "sm",
    isMd: breakpoint === "md",
    isLg: breakpoint === "lg",
    isXl: breakpoint === "xl",
    currentBreakpoint: breakpoint,
  };
}

/**
 * Responsive component styling examples
 */
export const RESPONSIVE_STYLES = {
  // List layouts
  listContainer: "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",

  // Modal/Drawer sizes
  modalWidth: "w-full xs:max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl",
  drawerWidth: "w-full sm:w-96 lg:w-1/3",

  // Table adjustments
  tableResponsive: "block sm:table overflow-x-auto",

  // Padding adjustments
  paddingResponsive: "px-4 sm:px-6 md:px-8",
};
```

---

## Accessibility Guidelines

### WCAG 2.1 Level AA Compliance Checklist

```typescript
/**
 * Accessibility guidelines for Certificate components
 */
export const ACCESSIBILITY_CHECKLIST = {
  // 1. Perceivable
  PERCEIVABLE: {
    // 1.1 Text Alternatives
    IMAGES_HAVE_ALT: "All images must have alt text or aria-label",
    ICONS_LABELED: "All icons must have aria-label or title",

    // 1.4 Distinguishable
    COLOR_NOT_ONLY: "Don't convey information by color alone (use icons/labels)",
    CONTRAST_RATIO: "Text must have 4.5:1 contrast ratio (7:1 for large text)",
    TEXT_RESIZE: "Text must be resizable up to 200% without loss of functionality",
    NO_TEXT_ONLY_IMAGES: "No images of text (use actual text instead)",
  },

  // 2. Operable
  OPERABLE: {
    // 2.1 Keyboard Accessible
    KEYBOARD_NAVIGATION: "All interactive elements must be keyboard accessible",
    TAB_ORDER: "Tab order must be logical and intuitive",
    NO_KEYBOARD_TRAP: "Users must be able to use keyboard to navigate away from any element",
    FOCUS_VISIBLE: "Focus indicator must be visible (outline: 2px solid)",

    // 2.3 Seizures and Physical Reactions
    NO_FLASHING: "Nothing flashes more than 3 times per second",

    // 2.4 Navigable
    SKIP_LINKS: "Provide skip navigation links (e.g., 'Skip to main content')",
    PAGE_TITLE: "Page title must be descriptive",
    LINK_PURPOSE: "Link purpose must be clear from link text or context",
    FOCUS_MANAGEMENT: "Focus must be managed appropriately (especially in modals)",
  },

  // 3. Understandable
  UNDERSTANDABLE: {
    // 3.1 Readable
    LANGUAGE_SPECIFIED: "Page language must be specified (lang attribute)",
    UNUSUAL_WORDS: "Unusual words must be defined or have expandable explanations",

    // 3.2 Predictable
    CONSISTENT_NAVIGATION: "Navigation must be consistent across pages",
    CONSISTENT_IDENTIFICATION: "Components with same function must look the same",

    // 3.3 Input Assistance
    ERROR_IDENTIFICATION: "Errors must be identified and described in text",
    LABELS_PROVIDED: "All form inputs must have associated labels",
    ERROR_SUGGESTIONS: "Suggestions for correcting errors must be provided",
    CONFIRMATION: "Submissions must be confirmed before processing (especially destructive)",
  },

  // 4. Robust
  ROBUST: {
    // 4.1 Compatible
    HTML_VALID: "HTML must be valid (use semantic elements)",
    ARIA_CORRECT: "ARIA attributes must be used correctly",
    NO_DEPRECATED: "No deprecated HTML elements or attributes",
    ROLES_PROPERTIES: "All ARIA roles, states, and properties must be supported",
  },
};

/**
 * Semantic HTML examples for Certificate components
 */
export const SEMANTIC_HTML_EXAMPLES = {
  // Page structure
  pageStructure: `
    <header>
      <nav aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li><span aria-current="page">Certificates</span></li>
        </ol>
      </nav>
    </header>
    <main>
      <section>
        <h1>My Certificates</h1>
        {/* content */}
      </section>
    </main>
    <footer>
      {/* footer content */}
    </footer>
  `,

  // Form structure
  formStructure: `
    <form aria-labelledby="form-title" onSubmit={handleSubmit}>
      <h2 id="form-title">Issue Certificate</h2>

      <fieldset>
        <legend>Certificate Details</legend>

        <div>
          <label htmlFor="student-input">
            Student <span aria-label="required">*</span>
          </label>
          <input
            id="student-input"
            type="text"
            aria-required="true"
            aria-describedby="student-help"
            placeholder="Search student..."
          />
          <div id="student-help" className="help-text">
            Start typing to search
          </div>
        </div>
      </fieldset>
    </form>
  `,

  // Table structure
  tableStructure: `
    <table role="grid" aria-label="Certificates list">
      <caption>
        List of all issued certificates with options to download, edit, or delete
      </caption>
      <thead>
        <tr>
          <th scope="col" aria-sort="ascending">Student Name</th>
          <th scope="col" aria-sort="none">Certificate Type</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Ravi Kumar</td>
          <td>Bonafide</td>
          <td>
            <button aria-label="Download certificate for Ravi Kumar">↓</button>
          </td>
        </tr>
      </tbody>
    </table>
  `,

  // List structure
  listStructure: `
    <ul role="list" aria-label="Certificates">
      <li>
        <article>
          <h3>Bonafide</h3>
          <time dateTime="2026-03-07">07 Mar 2026</time>
          <button aria-label="Download Bonafide certificate">Download</button>
        </article>
      </li>
    </ul>
  `,

  // Dialog/Modal structure
  dialogStructure: `
    <dialog
      open={isOpen}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <h2 id="dialog-title">Issue New Certificate</h2>
      <p id="dialog-description">Fill in the form below</p>
      {/* form content */}
      <div className="actions">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onSubmit}>Issue</button>
      </div>
    </dialog>
  `,
};

/**
 * ARIA labels and descriptions
 */
export const ARIA_LABELS = {
  CLOSE_BUTTON: "Close",
  OPEN_MENU: "Open menu",
  OPEN_DROPDOWN: "Open dropdown",
  REQUIRED_FIELD: "required",
  LOADING: "Loading",
  ERROR: "Error",
  SUCCESS: "Success",
  DOWNLOAD: "Download",
  EDIT: "Edit",
  DELETE: "Delete",
  CONFIRM: "Confirm",
  CANCEL: "Cancel",
};

/**
 * Focus management utilities
 */
export function useFocusManagement(): {
  focusElement: (elementOrSelector: HTMLElement | string) => void;
  returnFocus: () => void;
  focusFirstInvalidField: (formElement: HTMLFormElement) => void;
} {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const focusElement = useCallback(
    (elementOrSelector: HTMLElement | string) => {
      const element =
        typeof elementOrSelector === "string"
          ? document.querySelector(elementOrSelector)
          : elementOrSelector;

      if (element && element instanceof HTMLElement) {
        // Save previous focus
        previousFocusRef.current = document.activeElement as HTMLElement;
        // Focus new element
        element.focus();
      }
    },
    []
  );

  const returnFocus = useCallback(() => {
    previousFocusRef.current?.focus();
  }, []);

  const focusFirstInvalidField = useCallback((formElement: HTMLFormElement) => {
    const firstInvalid = formElement.querySelector(
      "[aria-invalid='true']"
    ) as HTMLElement;
    if (firstInvalid) {
      focusElement(firstInvalid);
    }
  }, [focusElement]);

  return { focusElement, returnFocus, focusFirstInvalidField };
}

/**
 * Keyboard navigation utilities
 */
export const KEYBOARD_KEYS = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
  PAGE_UP: "PageUp",
  PAGE_DOWN: "PageDown",
};

/**
 * Hook for keyboard event handling
 */
export function useKeyboard(
  callbacks: Record<string, () => void>
): void {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const callback = callbacks[event.key];
      if (callback) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [callbacks]);
}
```

---

## Summary

This comprehensive component specifications document provides:

1. **Type Definitions** — Complete TypeScript interfaces for all data models
2. **5 Main Components** — Detailed specs for AdminCertificateManager, StudentCertificatePage, ParentCertificatePage, CertificateTypeManager, and NotificationPanel
3. **Shared Utilities** — Custom hooks, API service layer, validation utilities
4. **Responsive Design** — Breakpoint strategies for mobile, tablet, desktop
5. **Accessibility** — WCAG 2.1 Level AA compliance guidelines
6. **Error Handling** — Structured error patterns and error mapping
7. **State Management** — Detailed state interfaces for each component
8. **API Integration** — Complete endpoint documentation and request/response handling

### Next Steps for Frontend Developer

1. **Review TypeScript interfaces** — Ensure backend API responses match these types
2. **Set up shared utilities** — Create custom hooks, API service, validation functions
3. **Implement components in order:**
   - CertificateTypeManager (foundation)
   - AdminCertificateManager (core CRUD)
   - StudentCertificatePage (read-only)
   - ParentCertificatePage (variant)
   - NotificationPanel (WebSocket integration)
4. **Test responsive layouts** — Verify breakpoints work correctly
5. **Audit accessibility** — Run WAVE, axe DevTools, keyboard navigation tests
6. **Connect to real API** — Replace mock data with live endpoints
7. **Implement error handling** — Use error mapper for all API calls
8. **Add unit/integration tests** — Cover component logic, API calls, edge cases

---

**Document Status:** Ready for frontend implementation
**Prepared:** March 7, 2026
**Version:** 1.0
