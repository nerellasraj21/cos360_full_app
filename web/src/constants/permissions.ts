// Permission constants for RBAC system
// This file contains all permission mappings for easy management and updates

export const PERMISSIONS = {
  // Academic Module
  ACADEMIC_YEARS: {
    CREATE: 'academic_years:create',
    READ: 'academic_years:read',
    UPDATE: 'academic_years:update',
    DELETE: 'academic_years:delete',
    LIST: 'academic_years:list',
    APPROVE: 'academic_years:approve',
  },
  CLASSES: {
    CREATE: 'classes:create',
    READ: 'classes:read',
    UPDATE: 'classes:update',
    DELETE: 'classes:delete',
    LIST: 'classes:list',
  },
  SECTIONS: {
    CREATE: 'sections:create',
    READ: 'sections:read',
    UPDATE: 'sections:update',
    DELETE: 'sections:delete',
    LIST: 'sections:list',
  },
  SUBJECTS: {
    CREATE: 'subjects:create',
    READ: 'subjects:read',
    UPDATE: 'subjects:update',
    DELETE: 'subjects:delete',
    LIST: 'subjects:list',
  },
  SUBJECT_CATEGORIES: {
    CREATE: 'subject_categories:create',
    READ: 'subject_categories:read',
    UPDATE: 'subject_categories:update',
    DELETE: 'subject_categories:delete',
    LIST: 'subject_categories:list',
  },
  CLASS_SUBJECT_MAPPINGS: {
    CREATE: 'class_subject_mappings:create',
    READ: 'class_subject_mappings:read',
    UPDATE: 'class_subject_mappings:update',
    DELETE: 'class_subject_mappings:delete',
    LIST: 'class_subject_mappings:list',
  },

  // Student Module
  STUDENT_ADMISSIONS: {
    CREATE: 'student_admissions:create',
    READ: 'student_admissions:read',
    UPDATE: 'student_admissions:update',
    DELETE: 'student_admissions:delete',
    LIST: 'student_admissions:list',
    READ_RELATED: 'student_admissions:read_related',
  },
  STUDENTS: {
    CREATE: 'students:create',
    READ: 'students:read',
    UPDATE: 'students:update',
    DELETE: 'students:delete',
    LIST: 'students:list',
    READ_RELATED: 'students:read_related',
  },
  STUDENT_DOCUMENTS: {
    CREATE: 'student_documents:create',
    READ: 'student_documents:read',
    UPDATE: 'student_documents:update',
    DELETE: 'student_documents:delete',
    LIST: 'student_documents:list',
  },
  STUDENT_CERTIFICATES: {
    CREATE: 'student_certificates:create',
    READ: 'student_certificates:read',
    UPDATE: 'student_certificates:update',
    DELETE: 'student_certificates:delete',
    LIST: 'student_certificates:list',
    LIST_OWN: 'student_certificates:list_own',
    LIST_RELATED: 'student_certificates:list_related',
    READ_OWN: 'student_certificates:read_own',
    READ_RELATED: 'student_certificates:read_related',
  },
  CERTIFICATE_TYPES: {
    CREATE: 'certificate_types:create',
    READ: 'certificate_types:read',
    UPDATE: 'certificate_types:update',
    DELETE: 'certificate_types:delete',
    LIST: 'certificate_types:list',
    APPROVE: 'certificate_types:approve',
  },
  STUDENT_ATTENDANCE: {
    CREATE: 'student_attendance:create',
    READ: 'student_attendance:read',
    UPDATE: 'student_attendance:update',
    DELETE: 'student_attendance:delete',
    LIST: 'student_attendance:list',
  },
  STUDENT_TRANSPORT: {
    CREATE: 'student_transport:create',
    READ: 'student_transport:read',
    UPDATE: 'student_transport:update',
    DELETE: 'student_transport:delete',
    LIST: 'student_transport:list',
  },

  // Staff Module
  STAFF: {
    CREATE: 'staff:create',
    READ: 'staff:read',
    UPDATE: 'staff:update',
    DELETE: 'staff:delete',
    LIST: 'staff:list',
  },
  DESIGNATIONS: {
    CREATE: 'designations:create',
    READ: 'designations:read',
    UPDATE: 'designations:update',
    DELETE: 'designations:delete',
    LIST: 'designations:list',
  },
  STAFF_ATTENDANCE: {
    CREATE: 'staff_attendance:create',
    READ: 'staff_attendance:read',
    UPDATE: 'staff_attendance:update',
    DELETE: 'staff_attendance:delete',
    LIST: 'staff_attendance:list',
  },

  // Parent Module
  PARENTS: {
    CREATE: 'parents:create',
    READ: 'parents:read',
    UPDATE: 'parents:update',
    DELETE: 'parents:delete',
    LIST: 'parents:list',
  },
  PARENT_MANAGEMENT: {
    CREATE: 'parent_management:create',
    READ: 'parent_management:read',
    UPDATE: 'parent_management:update',
    DELETE: 'parent_management:delete',
    LIST: 'parent_management:list',
  },

  // Fee Module
  FEE_CATEGORIES: {
    CREATE: 'fee_categories:create',
    READ: 'fee_categories:read',
    UPDATE: 'fee_categories:update',
    DELETE: 'fee_categories:delete',
    LIST: 'fee_categories:list',
  },
  FEE_TYPES: {
    CREATE: 'fee_types:create',
    READ: 'fee_types:read',
    UPDATE: 'fee_types:update',
    DELETE: 'fee_types:delete',
    LIST: 'fee_types:list',
  },
  FEE_TERMS: {
    CREATE: 'fee_terms:create',
    READ: 'fee_terms:read',
    UPDATE: 'fee_terms:update',
    DELETE: 'fee_terms:delete',
    LIST: 'fee_terms:list',
  },
  FEE_TERM_AMOUNTS: {
    CREATE: 'fee_term_amounts:create',
    READ: 'fee_term_amounts:read',
    UPDATE: 'fee_term_amounts:update',
    DELETE: 'fee_term_amounts:delete',
    LIST: 'fee_term_amounts:list',
  },
  FEE_CLASS_MAPPINGS: {
    CREATE: 'fee_class_mappings:create',
    READ: 'fee_class_mappings:read',
    UPDATE: 'fee_class_mappings:update',
    DELETE: 'fee_class_mappings:delete',
    LIST: 'fee_class_mappings:list',
  },
  FEE_STUDENT_MAPPINGS: {
    CREATE: 'fee_student_mappings:create',
    READ: 'fee_student_mappings:read',
    UPDATE: 'fee_student_mappings:update',
    DELETE: 'fee_student_mappings:delete',
    LIST: 'fee_student_mappings:list',
  },
  FEE_TRANSACTIONS: {
    CREATE: 'fee_transactions:create',
    READ: 'fee_transactions:read',
    READ_OWN: 'fee_transactions:read_own',
    UPDATE: 'fee_transactions:update',
    DELETE: 'fee_transactions:delete',
    LIST: 'fee_transactions:list',
    LIST_OWN: 'fee_transactions:list_own',
  },
  FEE_RECEIPTS: {
    CREATE: 'fee_receipts:create',
    READ: 'fee_receipts:read',
    READ_OWN: 'fee_receipts:read_own',
    UPDATE: 'fee_receipts:update',
    DELETE: 'fee_receipts:delete',
    LIST: 'fee_receipts:list',
    LIST_OWN: 'fee_receipts:list_own',
  },
  FEE_REFUNDS: {
    CREATE: 'fee_refunds:create',
    READ: 'fee_refunds:read',
    UPDATE: 'fee_refunds:update',
    DELETE: 'fee_refunds:delete',
    LIST: 'fee_refunds:list',
    APPROVE: 'fee_refunds:approve',
    PROCESS: 'fee_refunds:process',
  },

  // Transport Module
  ROUTES: {
    CREATE: 'routes:create',
    READ: 'routes:read',
    UPDATE: 'routes:update',
    DELETE: 'routes:delete',
    LIST: 'routes:list',
  },
  TRANSPORT_ROUTES: {
    CREATE: 'transport_routes:create',
    READ: 'transport_routes:read',
    UPDATE: 'transport_routes:update',
    DELETE: 'transport_routes:delete',
    LIST: 'transport_routes:list',
  },
  ROUTE_STOPS: {
    CREATE: 'route_stops:create',
    READ: 'route_stops:read',
    UPDATE: 'route_stops:update',
    DELETE: 'route_stops:delete',
    LIST: 'route_stops:list',
  },
  VEHICLES: {
    CREATE: 'vehicles:create',
    READ: 'vehicles:read',
    UPDATE: 'vehicles:update',
    DELETE: 'vehicles:delete',
    LIST: 'vehicles:list',
  },
  TRANSPORT_VEHICLES: {
    CREATE: 'transport_vehicles:create',
    READ: 'transport_vehicles:read',
    UPDATE: 'transport_vehicles:update',
    DELETE: 'transport_vehicles:delete',
    LIST: 'transport_vehicles:list',
  },
  TRANSPORT_TRIPS: {
    CREATE: 'transport_trips:create',
    READ: 'transport_trips:read',
    UPDATE: 'transport_trips:update',
    DELETE: 'transport_trips:delete',
    LIST: 'transport_trips:list',
  },

  // Timetable Module
  TIMETABLES: {
    CREATE: 'timetables:create',
    READ: 'timetables:read',
    UPDATE: 'timetables:update',
    DELETE: 'timetables:delete',
    LIST: 'timetables:list',
  },
  TIMETABLE_MANAGEMENT: {
    CREATE: 'timetable_management:create',
    READ: 'timetable_management:read',
    UPDATE: 'timetable_management:update',
    DELETE: 'timetable_management:delete',
    LIST: 'timetable_management:list',
  },

  // Holiday Module
  HOLIDAYS: {
    CREATE: 'holidays:create',
    READ: 'holidays:read',
    UPDATE: 'holidays:update',
    DELETE: 'holidays:delete',
    LIST: 'holidays:list',
  },
  HOLIDAY_MANAGEMENT: {
    CREATE: 'holiday_management:create',
    READ: 'holiday_management:read',
    UPDATE: 'holiday_management:update',
    DELETE: 'holiday_management:delete',
    LIST: 'holiday_management:list',
  },

  // User & Role Management
  USER_MANAGEMENT: {
    LIST: 'user_management:list',
    READ: 'user_management:read',
    UPDATE: 'user_management:update',
  },
  ROLE_MANAGEMENT: {
    CREATE: 'role_management:create',
    READ: 'role_management:read',
    UPDATE: 'role_management:update',
    DELETE: 'role_management:delete',
    LIST: 'role_management:list',
  },
  PERMISSION_MANAGEMENT: {
    CREATE: 'permission_management:create',
    READ: 'permission_management:read',
    UPDATE: 'permission_management:update',
    DELETE: 'permission_management:delete',
    LIST: 'permission_management:list',
  },
  RESOURCE_PERMISSION_MANAGEMENT: {
    CREATE: 'resource_permission_management:create',
    READ: 'resource_permission_management:read',
    UPDATE: 'resource_permission_management:update',
    DELETE: 'resource_permission_management:delete',
    LIST: 'resource_permission_management:list',
  },

  // Menu & System
  MENU_MANAGEMENT: {
    CREATE: 'menu_management:create',
    READ: 'menu_management:read',
    UPDATE: 'menu_management:update',
    DELETE: 'menu_management:delete',
    LIST: 'menu_management:list',
  },

  // Reports
  FEE_REPORTS: {
    READ: 'fee_reports:read',
  },
  STAFF_REPORTS: {
    READ: 'staff_reports:read',
  },
  STUDENT_REPORTS: {
    READ: 'student_reports:read',
  },
  TRANSPORT_REPORTS: {
    READ: 'transport_reports:read',
  },
  ACADEMIC_REPORTS: {
    READ: 'academic_reports:read',
  },

  // Profile
  PROFILE: {
    READ_OWN: 'profile:read_own',
    UPDATE_OWN: 'profile:update_own',
  },
  PARENT_PROFILE: {
    READ_OWN: 'parent_profile:read_own',
    UPDATE_OWN: 'parent_profile:update_own',
  },

  // Expense Module (from login response)
  EXPENSE_CATEGORIES: {
    CREATE: 'expense_categories:create',
    READ: 'expense_categories:read',
    UPDATE: 'expense_categories:update',
    DELETE: 'expense_categories:delete',
    LIST: 'expense_categories:list',
  },
  EXPENSE_TYPES: {
    CREATE: 'expense_types:create',
    READ: 'expense_types:read',
    UPDATE: 'expense_types:update',
    DELETE: 'expense_types:delete',
    LIST: 'expense_types:list',
  },
  EXPENSE_TRANSACTIONS: {
    CREATE: 'expense_transactions:create',
    READ: 'expense_transactions:read',
    UPDATE: 'expense_transactions:update',
    DELETE: 'expense_transactions:delete',
    LIST: 'expense_transactions:list',
    APPROVE: 'expense_transactions:approve',
  },
  EXPENSE_TRANSACTION_ITEMS: {
    CREATE: 'expense_transaction_items:create',
    READ: 'expense_transaction_items:read',
    UPDATE: 'expense_transaction_items:update',
    DELETE: 'expense_transaction_items:delete',
    LIST: 'expense_transaction_items:list',
  },
  EXPENSE_ATTACHMENTS: {
    CREATE: 'expense_attachments:create',
    READ: 'expense_attachments:read',
    UPDATE: 'expense_attachments:update',
    DELETE: 'expense_attachments:delete',
    LIST: 'expense_attachments:list',
    DOWNLOAD: 'expense_attachments:download',
  },
  EXPENSE_AUDIT_LOGS: {
    CREATE: 'expense_audit_logs:create',
    READ: 'expense_audit_logs:read',
    UPDATE: 'expense_audit_logs:update',
    DELETE: 'expense_audit_logs:delete',
    LIST: 'expense_audit_logs:list',
  },
  EXPENSE_SETTINGS: {
    CREATE: 'expense_settings:create',
    READ: 'expense_settings:read',
    UPDATE: 'expense_settings:update',
    DELETE: 'expense_settings:delete',
    LIST: 'expense_settings:list',
  },
  EXPENSE_REPORTS: {
    CREATE: 'expense_reports:create',
    READ: 'expense_reports:read',
    UPDATE: 'expense_reports:update',
    DELETE: 'expense_reports:delete',
    LIST: 'expense_reports:list',
    EXPORT: 'expense_reports:export',
  },
  TRANSPORT_PRICING: {
    CREATE: 'transport_pricing:create',
    READ: 'transport_pricing:read',
    UPDATE: 'transport_pricing:update',
    DELETE: 'transport_pricing:delete',
    LIST: 'transport_pricing:list',
  },
} as const;

// Helper function to get all permissions for a resource
export const getResourcePermissions = (resource: keyof typeof PERMISSIONS) => {
  return Object.values(PERMISSIONS[resource]);
};

// Helper function to get permission string
export const getPermission = (resource: keyof typeof PERMISSIONS, action: string) => {
  const resourcePerms = PERMISSIONS[resource];
  return resourcePerms[action as keyof typeof resourcePerms] || '';
};

// Type for permission checking
export type PermissionResource = keyof typeof PERMISSIONS;
export type PermissionAction<T extends PermissionResource> = keyof typeof PERMISSIONS[T];