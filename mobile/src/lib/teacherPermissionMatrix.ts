/**
 * Frontend-only permission cap for the "teacher" role.
 *
 * Mirrors the web app's src/lib/teacherPermissionMatrix.ts exactly — keep the
 * two in sync. This is intentionally independent of whatever the backend's
 * permissionsMap sends for a teacher user (see contexts/AuthContext.tsx
 * hasPermission()). It is a hard allowlist: for any resource listed here, a
 * teacher can perform ONLY the listed actions, regardless of backend-granted
 * permissions. Resources NOT listed here are left untouched and fall back to
 * the normal backend-driven permission check.
 *
 * Source: teacher role permission table agreed for the app (Aug 2026).
 * Update this file (and the web copy) if that table changes — do not
 * special-case individual screens for teacher restrictions going forward.
 */
export const TEACHER_PERMISSION_MATRIX: Record<string, string[]> = {
  // Read-only academic masters
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
  exam_marks: ['create', 'read', 'list'],

  // Students
  students: ['list'],
  student_admissions: ['read', 'list'],
  student_attendance: ['create', 'read', 'update', 'list'],
  student_certificates: ['read', 'list'],
  student_documents: ['read', 'list'],

  // Transport
  routes: ['read', 'list'],
  route_stops: ['read', 'list'],
  vehicles: ['read', 'list'],
  transport_trips: ['read', 'list'],
  route_types: ['read', 'list'],
  trip_types: ['read', 'list'],

  // Reports
  student_reports: ['read', 'export'],
  attendance_reports: ['read', 'export'],
  reports: ['read'],
}

/**
 * Returns the teacher-allowed actions for a resource, or `undefined` if
 * the resource isn't part of the teacher cap (caller should fall back to
 * the normal backend-driven permission check in that case).
 */
export const getTeacherAllowedActions = (resource: string): string[] | undefined =>
  TEACHER_PERMISSION_MATRIX[resource]
