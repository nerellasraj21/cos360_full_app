// Permission constants and types for COS360 Mobile RBAC
// Based on the web version permissions structure

export type PermissionResource =
  // Academic Module
  | 'academic_years'
  | 'classes'
  | 'sections'
  | 'subjects'
  | 'subject_categories'
  | 'class_subject_mappings'

  // Student Module
  | 'student_admissions'
  | 'students'
  | 'student_documents'
  | 'student_certificates'
  | 'certificate_types'
  | 'student_attendance'
  | 'student_transport'

  // Staff Module
  | 'staff'
  | 'designations'
  | 'staff_attendance'

  // Parent Module
  | 'parents'
  | 'parent_management'

  // Fee Module
  | 'fee_categories'
  | 'fee_types'
  | 'fee_terms'
  | 'fee_term_amounts'
  | 'fee_class_mappings'
  | 'fee_student_mappings'
  | 'fee_transactions'
  | 'fee_receipts'
  | 'fee_refunds'

  // Transport Module
  | 'routes'
  | 'transport_routes'
  | 'route_stops'
  | 'vehicles'
  | 'transport_vehicles'
  | 'transport_trips'
  | 'transport_pricing'

  // Timetable Module
  | 'timetables'
  | 'timetable_management'

  // Holiday Module
  | 'holidays'
  | 'holiday_management'

  // User & Role Management
  | 'user_management'
  | 'role_management'
  | 'permission_management'
  | 'resource_permission_management'

  // Menu & System
  | 'menu_management'

  // Reports Module
  | 'fee_reports'
  | 'staff_reports'
  | 'student_reports'
  | 'transport_reports'
  | 'academic_reports'

  // Profile Module
  | 'profile'
  | 'parent_profile'

  // Expense Module
  | 'expense_categories'
  | 'expense_types'
  | 'expense_transactions'
  | 'expense_transaction_items'
  | 'expense_attachments'
  | 'expense_audit_logs'
  | 'expense_settings'
  | 'expense_reports'

  // Exam Module
  | 'exams'
  | 'exam_marks'
  | 'exam_results'
  | 'exam_hall_tickets'
  | 'exam_dates'
  | 'grade_schemes'

  // Mobile-only resources (not in web app's permissions.ts)
  | 'classes_sections'
  | 'locations'
  | 'roles_permissions'
  | 'expense_audit'
  | 'fee_collection'
  | 'student_profile'
  | 'staff_profile'

export type PermissionAction<T extends PermissionResource = PermissionResource> =
  // Common actions
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'

  // Special actions
  | 'approve'
  | 'process'
  | 'export'
  | 'download'
  | 'read_related'
  | 'read_own'
  | 'update_own'
  | 'list_own'
  | 'list_related'
  | 'delete_own'

// Permission string type
export type PermissionString = `${PermissionResource}:${PermissionAction}`

// Permission constants object
export const PERMISSIONS = {
  // Academic Module
  academic_years: {
    create: 'academic_years:create' as PermissionString,
    read: 'academic_years:read' as PermissionString,
    update: 'academic_years:update' as PermissionString,
    delete: 'academic_years:delete' as PermissionString,
    list: 'academic_years:list' as PermissionString,
    approve: 'academic_years:approve' as PermissionString,
  },
  classes: {
    create: 'classes:create' as PermissionString,
    read: 'classes:read' as PermissionString,
    update: 'classes:update' as PermissionString,
    delete: 'classes:delete' as PermissionString,
    list: 'classes:list' as PermissionString,
  },
  sections: {
    create: 'sections:create' as PermissionString,
    read: 'sections:read' as PermissionString,
    update: 'sections:update' as PermissionString,
    delete: 'sections:delete' as PermissionString,
    list: 'sections:list' as PermissionString,
  },
  subjects: {
    create: 'subjects:create' as PermissionString,
    read: 'subjects:read' as PermissionString,
    update: 'subjects:update' as PermissionString,
    delete: 'subjects:delete' as PermissionString,
    list: 'subjects:list' as PermissionString,
  },
  subject_categories: {
    create: 'subject_categories:create' as PermissionString,
    read: 'subject_categories:read' as PermissionString,
    update: 'subject_categories:update' as PermissionString,
    delete: 'subject_categories:delete' as PermissionString,
    list: 'subject_categories:list' as PermissionString,
  },
  class_subject_mappings: {
    create: 'class_subject_mappings:create' as PermissionString,
    read: 'class_subject_mappings:read' as PermissionString,
    update: 'class_subject_mappings:update' as PermissionString,
    delete: 'class_subject_mappings:delete' as PermissionString,
    list: 'class_subject_mappings:list' as PermissionString,
  },

  // Student Module
  student_admissions: {
    create: 'student_admissions:create' as PermissionString,
    read: 'student_admissions:read' as PermissionString,
    update: 'student_admissions:update' as PermissionString,
    delete: 'student_admissions:delete' as PermissionString,
    list: 'student_admissions:list' as PermissionString,
    read_related: 'student_admissions:read_related' as PermissionString,
  },
  students: {
    create: 'students:create' as PermissionString,
    read: 'students:read' as PermissionString,
    update: 'students:update' as PermissionString,
    delete: 'students:delete' as PermissionString,
    list: 'students:list' as PermissionString,
    read_related: 'students:read_related' as PermissionString,
  },
  student_documents: {
    create: 'student_documents:create' as PermissionString,
    read: 'student_documents:read' as PermissionString,
    update: 'student_documents:update' as PermissionString,
    delete: 'student_documents:delete' as PermissionString,
    list: 'student_documents:list' as PermissionString,
  },
  student_certificates: {
    create: 'student_certificates:create' as PermissionString,
    read: 'student_certificates:read' as PermissionString,
    update: 'student_certificates:update' as PermissionString,
    delete: 'student_certificates:delete' as PermissionString,
    list: 'student_certificates:list' as PermissionString,
    list_own: 'student_certificates:list_own' as PermissionString,
    list_related: 'student_certificates:list_related' as PermissionString,
    read_own: 'student_certificates:read_own' as PermissionString,
    read_related: 'student_certificates:read_related' as PermissionString,
  },
  certificate_types: {
    create: 'certificate_types:create' as PermissionString,
    read: 'certificate_types:read' as PermissionString,
    update: 'certificate_types:update' as PermissionString,
    delete: 'certificate_types:delete' as PermissionString,
    list: 'certificate_types:list' as PermissionString,
    approve: 'certificate_types:approve' as PermissionString,
  },
  student_attendance: {
    create: 'student_attendance:create' as PermissionString,
    read: 'student_attendance:read' as PermissionString,
    update: 'student_attendance:update' as PermissionString,
    delete: 'student_attendance:delete' as PermissionString,
    list: 'student_attendance:list' as PermissionString,
  },
  student_transport: {
    create: 'student_transport:create' as PermissionString,
    read: 'student_transport:read' as PermissionString,
    update: 'student_transport:update' as PermissionString,
    delete: 'student_transport:delete' as PermissionString,
    list: 'student_transport:list' as PermissionString,
  },

  // Staff Module
  staff: {
    create: 'staff:create' as PermissionString,
    read: 'staff:read' as PermissionString,
    update: 'staff:update' as PermissionString,
    delete: 'staff:delete' as PermissionString,
    list: 'staff:list' as PermissionString,
  },
  designations: {
    create: 'designations:create' as PermissionString,
    read: 'designations:read' as PermissionString,
    update: 'designations:update' as PermissionString,
    delete: 'designations:delete' as PermissionString,
    list: 'designations:list' as PermissionString,
  },
  staff_attendance: {
    create: 'staff_attendance:create' as PermissionString,
    read: 'staff_attendance:read' as PermissionString,
    update: 'staff_attendance:update' as PermissionString,
    delete: 'staff_attendance:delete' as PermissionString,
    list: 'staff_attendance:list' as PermissionString,
  },

  // Parent Module
  parents: {
    create: 'parents:create' as PermissionString,
    read: 'parents:read' as PermissionString,
    update: 'parents:update' as PermissionString,
    delete: 'parents:delete' as PermissionString,
    list: 'parents:list' as PermissionString,
  },
  parent_management: {
    create: 'parent_management:create' as PermissionString,
    read: 'parent_management:read' as PermissionString,
    update: 'parent_management:update' as PermissionString,
    delete: 'parent_management:delete' as PermissionString,
    list: 'parent_management:list' as PermissionString,
  },

  // Fee Module
  fee_categories: {
    create: 'fee_categories:create' as PermissionString,
    read: 'fee_categories:read' as PermissionString,
    update: 'fee_categories:update' as PermissionString,
    delete: 'fee_categories:delete' as PermissionString,
    list: 'fee_categories:list' as PermissionString,
  },
  fee_types: {
    create: 'fee_types:create' as PermissionString,
    read: 'fee_types:read' as PermissionString,
    update: 'fee_types:update' as PermissionString,
    delete: 'fee_types:delete' as PermissionString,
    list: 'fee_types:list' as PermissionString,
  },
  fee_terms: {
    create: 'fee_terms:create' as PermissionString,
    read: 'fee_terms:read' as PermissionString,
    update: 'fee_terms:update' as PermissionString,
    delete: 'fee_terms:delete' as PermissionString,
    list: 'fee_terms:list' as PermissionString,
  },
  fee_term_amounts: {
    create: 'fee_term_amounts:create' as PermissionString,
    read: 'fee_term_amounts:read' as PermissionString,
    update: 'fee_term_amounts:update' as PermissionString,
    delete: 'fee_term_amounts:delete' as PermissionString,
    list: 'fee_term_amounts:list' as PermissionString,
  },
  fee_class_mappings: {
    create: 'fee_class_mappings:create' as PermissionString,
    read: 'fee_class_mappings:read' as PermissionString,
    update: 'fee_class_mappings:update' as PermissionString,
    delete: 'fee_class_mappings:delete' as PermissionString,
    list: 'fee_class_mappings:list' as PermissionString,
  },
  fee_student_mappings: {
    create: 'fee_student_mappings:create' as PermissionString,
    read: 'fee_student_mappings:read' as PermissionString,
    update: 'fee_student_mappings:update' as PermissionString,
    delete: 'fee_student_mappings:delete' as PermissionString,
    list: 'fee_student_mappings:list' as PermissionString,
  },
  fee_transactions: {
    create: 'fee_transactions:create' as PermissionString,
    read: 'fee_transactions:read' as PermissionString,
    read_own: 'fee_transactions:read_own' as PermissionString,
    update: 'fee_transactions:update' as PermissionString,
    delete: 'fee_transactions:delete' as PermissionString,
    list: 'fee_transactions:list' as PermissionString,
    list_own: 'fee_transactions:list_own' as PermissionString,
  },
  fee_receipts: {
    create: 'fee_receipts:create' as PermissionString,
    read: 'fee_receipts:read' as PermissionString,
    read_own: 'fee_receipts:read_own' as PermissionString,
    update: 'fee_receipts:update' as PermissionString,
    delete: 'fee_receipts:delete' as PermissionString,
    list: 'fee_receipts:list' as PermissionString,
    list_own: 'fee_receipts:list_own' as PermissionString,
  },
  fee_refunds: {
    create: 'fee_refunds:create' as PermissionString,
    read: 'fee_refunds:read' as PermissionString,
    update: 'fee_refunds:update' as PermissionString,
    delete: 'fee_refunds:delete' as PermissionString,
    list: 'fee_refunds:list' as PermissionString,
    approve: 'fee_refunds:approve' as PermissionString,
    process: 'fee_refunds:process' as PermissionString,
  },

  // Transport Module
  routes: {
    create: 'routes:create' as PermissionString,
    read: 'routes:read' as PermissionString,
    update: 'routes:update' as PermissionString,
    delete: 'routes:delete' as PermissionString,
    list: 'routes:list' as PermissionString,
  },
  transport_routes: {
    create: 'transport_routes:create' as PermissionString,
    read: 'transport_routes:read' as PermissionString,
    update: 'transport_routes:update' as PermissionString,
    delete: 'transport_routes:delete' as PermissionString,
    list: 'transport_routes:list' as PermissionString,
  },
  route_stops: {
    create: 'route_stops:create' as PermissionString,
    read: 'route_stops:read' as PermissionString,
    update: 'route_stops:update' as PermissionString,
    delete: 'route_stops:delete' as PermissionString,
    list: 'route_stops:list' as PermissionString,
  },
  vehicles: {
    create: 'vehicles:create' as PermissionString,
    read: 'vehicles:read' as PermissionString,
    update: 'vehicles:update' as PermissionString,
    delete: 'vehicles:delete' as PermissionString,
    list: 'vehicles:list' as PermissionString,
  },
  transport_vehicles: {
    create: 'transport_vehicles:create' as PermissionString,
    read: 'transport_vehicles:read' as PermissionString,
    update: 'transport_vehicles:update' as PermissionString,
    delete: 'transport_vehicles:delete' as PermissionString,
    list: 'transport_vehicles:list' as PermissionString,
  },
  transport_trips: {
    create: 'transport_trips:create' as PermissionString,
    read: 'transport_trips:read' as PermissionString,
    update: 'transport_trips:update' as PermissionString,
    delete: 'transport_trips:delete' as PermissionString,
    list: 'transport_trips:list' as PermissionString,
  },
  transport_pricing: {
    create: 'transport_pricing:create' as PermissionString,
    read: 'transport_pricing:read' as PermissionString,
    update: 'transport_pricing:update' as PermissionString,
    delete: 'transport_pricing:delete' as PermissionString,
    list: 'transport_pricing:list' as PermissionString,
  },

  // Timetable Module
  timetables: {
    create: 'timetables:create' as PermissionString,
    read: 'timetables:read' as PermissionString,
    update: 'timetables:update' as PermissionString,
    delete: 'timetables:delete' as PermissionString,
    list: 'timetables:list' as PermissionString,
  },
  timetable_management: {
    create: 'timetable_management:create' as PermissionString,
    read: 'timetable_management:read' as PermissionString,
    update: 'timetable_management:update' as PermissionString,
    delete: 'timetable_management:delete' as PermissionString,
    list: 'timetable_management:list' as PermissionString,
  },

  // Holiday Module
  holidays: {
    create: 'holidays:create' as PermissionString,
    read: 'holidays:read' as PermissionString,
    update: 'holidays:update' as PermissionString,
    delete: 'holidays:delete' as PermissionString,
    list: 'holidays:list' as PermissionString,
  },
  holiday_management: {
    create: 'holiday_management:create' as PermissionString,
    read: 'holiday_management:read' as PermissionString,
    update: 'holiday_management:update' as PermissionString,
    delete: 'holiday_management:delete' as PermissionString,
    list: 'holiday_management:list' as PermissionString,
  },

  // User & Role Management
  user_management: {
    list: 'user_management:list' as PermissionString,
    read: 'user_management:read' as PermissionString,
    update: 'user_management:update' as PermissionString,
  },
  role_management: {
    create: 'role_management:create' as PermissionString,
    read: 'role_management:read' as PermissionString,
    update: 'role_management:update' as PermissionString,
    delete: 'role_management:delete' as PermissionString,
    list: 'role_management:list' as PermissionString,
  },
  permission_management: {
    create: 'permission_management:create' as PermissionString,
    read: 'permission_management:read' as PermissionString,
    update: 'permission_management:update' as PermissionString,
    delete: 'permission_management:delete' as PermissionString,
    list: 'permission_management:list' as PermissionString,
  },
  resource_permission_management: {
    create: 'resource_permission_management:create' as PermissionString,
    read: 'resource_permission_management:read' as PermissionString,
    update: 'resource_permission_management:update' as PermissionString,
    delete: 'resource_permission_management:delete' as PermissionString,
    list: 'resource_permission_management:list' as PermissionString,
  },

  // Menu & System
  menu_management: {
    create: 'menu_management:create' as PermissionString,
    read: 'menu_management:read' as PermissionString,
    update: 'menu_management:update' as PermissionString,
    delete: 'menu_management:delete' as PermissionString,
    list: 'menu_management:list' as PermissionString,
  },

  // Reports Module
  fee_reports: {
    read: 'fee_reports:read' as PermissionString,
  },
  staff_reports: {
    read: 'staff_reports:read' as PermissionString,
  },
  student_reports: {
    read: 'student_reports:read' as PermissionString,
  },
  transport_reports: {
    read: 'transport_reports:read' as PermissionString,
  },
  academic_reports: {
    read: 'academic_reports:read' as PermissionString,
  },

  // Profile Module
  profile: {
    read_own: 'profile:read_own' as PermissionString,
    update_own: 'profile:update_own' as PermissionString,
  },
  parent_profile: {
    read_own: 'parent_profile:read_own' as PermissionString,
    update_own: 'parent_profile:update_own' as PermissionString,
  },

  // Expense Module
  expense_categories: {
    create: 'expense_categories:create' as PermissionString,
    read: 'expense_categories:read' as PermissionString,
    update: 'expense_categories:update' as PermissionString,
    delete: 'expense_categories:delete' as PermissionString,
    list: 'expense_categories:list' as PermissionString,
  },
  expense_types: {
    create: 'expense_types:create' as PermissionString,
    read: 'expense_types:read' as PermissionString,
    update: 'expense_types:update' as PermissionString,
    delete: 'expense_types:delete' as PermissionString,
    list: 'expense_types:list' as PermissionString,
  },
  expense_transactions: {
    create: 'expense_transactions:create' as PermissionString,
    read: 'expense_transactions:read' as PermissionString,
    update: 'expense_transactions:update' as PermissionString,
    delete: 'expense_transactions:delete' as PermissionString,
    list: 'expense_transactions:list' as PermissionString,
    approve: 'expense_transactions:approve' as PermissionString,
  },
  expense_transaction_items: {
    create: 'expense_transaction_items:create' as PermissionString,
    read: 'expense_transaction_items:read' as PermissionString,
    update: 'expense_transaction_items:update' as PermissionString,
    delete: 'expense_transaction_items:delete' as PermissionString,
    list: 'expense_transaction_items:list' as PermissionString,
  },
  expense_attachments: {
    create: 'expense_attachments:create' as PermissionString,
    read: 'expense_attachments:read' as PermissionString,
    update: 'expense_attachments:update' as PermissionString,
    delete: 'expense_attachments:delete' as PermissionString,
    list: 'expense_attachments:list' as PermissionString,
    download: 'expense_attachments:download' as PermissionString,
  },
  expense_audit_logs: {
    create: 'expense_audit_logs:create' as PermissionString,
    read: 'expense_audit_logs:read' as PermissionString,
    update: 'expense_audit_logs:update' as PermissionString,
    delete: 'expense_audit_logs:delete' as PermissionString,
    list: 'expense_audit_logs:list' as PermissionString,
  },
  expense_settings: {
    create: 'expense_settings:create' as PermissionString,
    read: 'expense_settings:read' as PermissionString,
    update: 'expense_settings:update' as PermissionString,
    delete: 'expense_settings:delete' as PermissionString,
    list: 'expense_settings:list' as PermissionString,
  },
  expense_reports: {
    create: 'expense_reports:create' as PermissionString,
    read: 'expense_reports:read' as PermissionString,
    update: 'expense_reports:update' as PermissionString,
    delete: 'expense_reports:delete' as PermissionString,
    list: 'expense_reports:list' as PermissionString,
    export: 'expense_reports:export' as PermissionString,
  },

  // Exam Module
  exams: {
    create: 'exams:create' as PermissionString,
    read: 'exams:read' as PermissionString,
    update: 'exams:update' as PermissionString,
    delete: 'exams:delete' as PermissionString,
    list: 'exams:list' as PermissionString,
  },
  exam_marks: {
    create: 'exam_marks:create' as PermissionString,
    read: 'exam_marks:read' as PermissionString,
    update: 'exam_marks:update' as PermissionString,
    list: 'exam_marks:list' as PermissionString,
    download: 'exam_marks:download' as PermissionString,
  },
  exam_results: {
    read: 'exam_results:read' as PermissionString,
    list: 'exam_results:list' as PermissionString,
    download: 'exam_results:download' as PermissionString,
    approve: 'exam_results:approve' as PermissionString,
  },
  exam_hall_tickets: {
    create: 'exam_hall_tickets:create' as PermissionString,
    read: 'exam_hall_tickets:read' as PermissionString,
    list: 'exam_hall_tickets:list' as PermissionString,
    download: 'exam_hall_tickets:download' as PermissionString,
    approve: 'exam_hall_tickets:approve' as PermissionString,
  },
  exam_dates: {
    create: 'exam_dates:create' as PermissionString,
    read: 'exam_dates:read' as PermissionString,
    update: 'exam_dates:update' as PermissionString,
    delete: 'exam_dates:delete' as PermissionString,
    list: 'exam_dates:list' as PermissionString,
  },
  grade_schemes: {
    create: 'grade_schemes:create' as PermissionString,
    read: 'grade_schemes:read' as PermissionString,
    update: 'grade_schemes:update' as PermissionString,
    delete: 'grade_schemes:delete' as PermissionString,
    list: 'grade_schemes:list' as PermissionString,
  },

  // Mobile-only resources — backfilled from real usage in screens/screenPermissions.ts.
  // Not present in the web app's permissions.ts (mobile-specific screens).
  classes_sections: {
    read: 'classes_sections:read' as PermissionString,
    list: 'classes_sections:list' as PermissionString,
  },
  locations: {
    create: 'locations:create' as PermissionString,
    read: 'locations:read' as PermissionString,
    update: 'locations:update' as PermissionString,
    delete: 'locations:delete' as PermissionString,
    list: 'locations:list' as PermissionString,
  },
  roles_permissions: {
    create: 'roles_permissions:create' as PermissionString,
    read: 'roles_permissions:read' as PermissionString,
    update: 'roles_permissions:update' as PermissionString,
    delete: 'roles_permissions:delete' as PermissionString,
    list: 'roles_permissions:list' as PermissionString,
  },
  expense_audit: {
    read: 'expense_audit:read' as PermissionString,
    list: 'expense_audit:list' as PermissionString,
  },
  fee_collection: {
    read_own: 'fee_collection:read_own' as PermissionString,
  },
  student_profile: {
    read_own: 'student_profile:read_own' as PermissionString,
  },
  staff_profile: {
    read_own: 'staff_profile:read_own' as PermissionString,
  },
} as const

// Helper function to get all permissions for a resource (from web app)
export const getResourcePermissions = (resource: PermissionResource) => {
  return Object.values(PERMISSIONS[resource])
}

// Helper function to get permission string (from web app)
export const getPermission = (resource: PermissionResource, action: string): string => {
  const resourcePerms = PERMISSIONS[resource]
  return (resourcePerms as any)[action] || ''
}

// Helper functions for permission checking
export const buildPermissionString = (resource: PermissionResource, action: PermissionAction): PermissionString => {
  return `${resource}:${action}` as PermissionString
}

export const parsePermissionString = (permission: PermissionString): { resource: PermissionResource; action: PermissionAction } => {
  const [resource, action] = permission.split(':') as [PermissionResource, PermissionAction]
  return { resource, action }
}

// Common permission groups for easier checking
export const COMMON_PERMISSIONS = {
  // CRUD permissions
  CRUD: (resource: PermissionResource) => {
    const perms = PERMISSIONS[resource] as any
    return [
      perms.create,
      perms.read,
      perms.update,
      perms.delete,
      perms.list,
    ].filter(Boolean)
  },

  // Read-only permissions
  READ_ONLY: (resource: PermissionResource) => {
    const perms = PERMISSIONS[resource] as any
    return [
      perms.read,
      perms.list,
    ].filter(Boolean)
  },

  // Management permissions (includes approval)
  MANAGEMENT: (resource: PermissionResource) => {
    const perms = PERMISSIONS[resource] as any
    return [
      perms.create,
      perms.read,
      perms.update,
      perms.delete,
      perms.list,
      perms.approve,
    ].filter(Boolean)
  },
} as const