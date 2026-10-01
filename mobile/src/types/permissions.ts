// Permission resource constants
export const PERMISSION_RESOURCES = {
  // Students module
  STUDENTS: 'students',
  STUDENT_ADMISSIONS: 'student_admissions',
  STUDENT_ATTENDANCE: 'student_attendance',
  STUDENT_DOCUMENTS: 'student_documents',
  STUDENT_CERTIFICATES: 'student_certificates',
  CERTIFICATE_TYPES: 'certificate_types',
  STUDENT_TRANSPORT: 'student_transport',
  
  // Fees module
  FEE_CATEGORIES: 'fee_categories',
  FEE_TYPES: 'fee_types',
  FEE_TERMS: 'fee_terms',
  FEE_TERM_AMOUNTS: 'fee_class_mapping_term_amounts',
  FEE_TRANSACTIONS: 'fee_transactions',
  FEE_RECEIPTS: 'fee_receipts',
  FEE_REFUNDS: 'fee_refunds',
  FEE_CLASS_MAPPINGS: 'fee_class_mappings',
  FEE_STUDENT_MAPPINGS: 'fee_student_mappings',
  FEE_COLLECTION: 'fee_collection',
  FEE_REPORTS: 'fee_reports',
  
  // Staff module
  STAFF: 'staff',
  STAFF_ATTENDANCE: 'staff_attendance',
  STAFF_DESIGNATIONS: 'designations',

  // Transport module
  TRANSPORT_ROUTES: 'routes',
  TRANSPORT_ROUTE_STOPS: 'route_stops',
  TRANSPORT_VEHICLES: 'vehicles',
  TRANSPORT_TRIPS: 'transport_trips',
  TRANSPORT_PRICING: 'transport_pricing',
  ROUTES: 'routes',
  VEHICLES: 'vehicles',

  // Masters module
  ACADEMIC_YEARS: 'academic_years',
  CLASSES: 'classes',
  SECTIONS: 'sections',
  CLASSES_SECTIONS: 'classes',
  SUBJECTS: 'subjects',
  SUBJECT_CATEGORIES: 'subject_categories',
  HOLIDAYS: 'holiday_management',
  HOLIDAY_MANAGEMENT: 'holiday_management',
  LOCATIONS: 'locations',
  TIMETABLES: 'timetable_management',
  TIMETABLE_MANAGEMENT: 'timetable_management',
  PARENTS: 'parent_management',
  PARENT_MANAGEMENT: 'parent_management',
  ROLES_PERMISSIONS: 'role_management',
  CLASS_SUBJECT_MAPPINGS: 'class_subject_mappings',

  // User & Role Management (web app's admin.permissions.ts resources)
  USER_MANAGEMENT: 'user_management',
  ROLE_MANAGEMENT: 'role_management',
  PERMISSION_MANAGEMENT: 'permission_management',
  RESOURCE_PERMISSION_MANAGEMENT: 'resource_permission_management',
  MENU_MANAGEMENT: 'menu_management',

  // Reports module (web app's per-module report resources)
  STAFF_REPORTS: 'staff_reports',
  STUDENT_REPORTS: 'student_reports',
  TRANSPORT_REPORTS: 'transport_trips',
  ACADEMIC_REPORTS: 'exams',

  // Expense module
  EXPENSE_CATEGORIES: 'expense_categories',
  EXPENSE_TYPES: 'expense_types',
  EXPENSE_TRANSACTIONS: 'expense_transactions',
  EXPENSE_TRANSACTION_ITEMS: 'expense_transactions',
  EXPENSE_ATTACHMENTS: 'expense_attachments',
  EXPENSE_AUDIT_LOGS: 'expense_audit_logs',
  EXPENSE_SETTINGS: 'expense_settings',
  EXPENSE_REPORTS: 'expense_reports',
  EXPENSE_APPROVALS: 'expense_transactions',
  EXPENSE_AUDIT: 'expense_audit_logs',
  EXPENSE_DEPARTMENTS: 'expense_departments',

  // Exam module
  EXAMS: 'exams',
  EXAM_DATES: 'exams',
  EXAM_MARKS: 'exam_marks',
  EXAM_MARK_ENTRIES: 'exam_marks',
  EXAM_SCHEDULES: 'exams',
  EXAM_HALL_TICKETS: 'exams',
  EXAM_RESULTS: 'exam_results',
  GRADE_SCHEMES: 'exams',
  EXAM_GRADE_SCHEMES: 'exams',
  EXAM_REMARKS: 'exams',
  EXAM_AUDIT: 'exams',

  // Communication module
  COMMUNICATION: 'communications',
  COMMUNICATION_TEMPLATES: 'communications',
  COMMUNICATION_LOGS: 'communications',
  ANNOUNCEMENTS: 'announcements',

  // Administration module
  ADMIN_USERS: 'user_management',
  ADMIN_ROLES: 'role_management',
  ADMIN_PERMISSIONS: 'resource_permission_management',
  ADMIN_MENU: 'menu_management',
  SCHOOL_SETTINGS: 'school_settings',

  // Profile and settings
  PROFILE: 'profile',
  STUDENT_PROFILE: 'profile',
  STAFF_PROFILE: 'profile',
  PARENT_PROFILE: 'profile',
  SETTINGS: 'settings',
} as const;

// Permission action constants
export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  APPROVE: 'approve',
  PROCESS: 'process',
  EXPORT: 'export',
  DOWNLOAD: 'download',
  READ_OWN: 'read_own',
  READ_RELATED: 'read_related',
  UPDATE_OWN: 'update_own',
  DELETE_OWN: 'delete_own',
  LIST_OWN: 'list_own',
  LIST_RELATED: 'list_related',
} as const;

// Type definitions
export type PermissionResource = typeof PERMISSION_RESOURCES[keyof typeof PERMISSION_RESOURCES];
export type PermissionAction = typeof PERMISSION_ACTIONS[keyof typeof PERMISSION_ACTIONS];

// Permission tuple type
export type PermissionTuple = [PermissionResource, PermissionAction];

// Permission check mode
export enum PermissionCheckMode {
  ANY = 'any',
  ALL = 'all',
}

// Permission error types
export enum PermissionErrorType {
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  PERMISSION_CHECK_FAILED = 'PERMISSION_CHECK_FAILED',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  PERMISSION_DATA_CORRUPTED = 'PERMISSION_DATA_CORRUPTED',
}

export interface PermissionError extends Error {
  type: PermissionErrorType;
  resource?: string;
  action?: string;
  requiredPermissions?: PermissionTuple[];
}

// Permission interface (from existing code)
export interface Permission {
  id: string;
  resource: string;
  action: string;
  is_granted: boolean;
}

// Permission map type
export type PermissionMap = Record<string, Permission>;