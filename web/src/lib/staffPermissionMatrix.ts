/**
 * Frontend-only permission cap for the "staff" role.
 *
 * This is intentionally independent of whatever the backend's
 * `permissionsMap` sends for a staff user (see authStore.ts login()).
 * It is a hard allowlist: for any resource listed here, staff can
 * perform ONLY the listed actions, regardless of backend-granted
 * permissions. Resources NOT listed here are left untouched and fall
 * back to the normal backend-driven permission check.
 *
 * Source: staff role permission table agreed for the app (Aug 2026).
 * Update this file if that table changes — do not special-case
 * individual pages/components for staff restrictions going forward.
 */
export const STAFF_PERMISSION_MATRIX: Record<string, string[]> = {
  // Read-only academic masters (same reference set as Teacher)
  academic_years: ['read', 'list'],
  classes: ['read', 'list'],
  sections: ['read', 'list'],
  subjects: ['read', 'list'],
  subject_categories: ['read', 'list'],
  class_subject_mappings: ['read', 'list'],
  holiday_management: ['read', 'list'],
  holidays: ['read', 'list'],
  locations: ['read', 'list'],
  castes: ['read', 'list'],
  certificate_types: ['read', 'list'],
  designations: ['read', 'list'],

  // Exams
  exams: ['read', 'list'],
  exam_marks: ['read', 'list'],

  // Students
  students: ['list'],
  student_admissions: ['create', 'read', 'update', 'list'], // no delete
  student_attendance: ['create', 'read', 'update', 'list'],
  student_certificates: ['create', 'read', 'update', 'list'],
  student_documents: ['create', 'read', 'update', 'list'],
  student_transport: ['create', 'read', 'update', 'list'],

  // Fee
  fee_categories: ['read', 'list'],
  fee_types: ['read', 'list'],
  fee_terms: ['read', 'list'],
  fee_class_mappings: ['read', 'list'],
  fee_class_mapping_term_amounts: ['read', 'list'],
  fee_student_mappings: ['create', 'read', 'update', 'list'],
  fee_transactions: ['create', 'read', 'update', 'list'],
  fee_receipts: ['create', 'read', 'list'],
  fee_refunds: ['create', 'read', 'list'], // no approve/process — staff can request, not approve

  // Staff / parent
  staff: ['read', 'list'],
  parent_management: ['create', 'read', 'update', 'list'],

  // Transport
  routes: ['read', 'list'],
  route_types: ['read', 'list'],
  route_stops: ['read', 'list'],
  vehicles: ['read', 'list'],
  trip_types: ['read', 'list'],
  transport_trips: ['create', 'read', 'update', 'list'],

  // Expenses
  expense_types: ['read', 'list'],
  expense_categories: ['read', 'list'],
  expense_transactions: ['create', 'read', 'list'], // no update/approve
  expense_attachments: ['create', 'read'],

  // Reports
  fee_reports: ['read', 'export'],
  student_reports: ['read', 'export'],
  attendance_reports: ['read', 'export'],
  staff_reports: ['read'],
  reports: ['read'],
}

/**
 * Returns the staff-allowed actions for a resource, or `undefined` if
 * the resource isn't part of the staff cap (caller should fall back to
 * the normal backend-driven permission check in that case).
 */
export const getStaffAllowedActions = (resource: string): string[] | undefined =>
  STAFF_PERMISSION_MATRIX[resource]
