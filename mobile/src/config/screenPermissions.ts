import { PermissionTuple } from '../types/permissions';

// Screen permission configuration interface
export interface ScreenPermissionConfig {
    requiredPermissions: PermissionTuple[];
    requireAll?: boolean; // true = ALL permissions required, false = ANY permission required
    fallbackRoute?: string; // Route to redirect to if access is denied
    description?: string; // Human-readable description of what permissions are needed
}

// Centralized screen permission mapping
export const SCREEN_PERMISSIONS: Record<string, ScreenPermissionConfig> = {
    // Students Module Screens
    '/students': {
        requiredPermissions: [['students', 'list'], ['students', 'read']],
        requireAll: false,
        description: 'View students list or student information',
    },
    '/students/admission': {
        requiredPermissions: [['student_admissions', 'list'], ['student_admissions', 'read']],
        requireAll: false,
        description: 'View student admissions',
    },
    '/students/[id]': {
        requiredPermissions: [['students', 'read']],
        requireAll: true,
        description: 'View individual student details',
    },
    '/students/profile': {
        requiredPermissions: [['students', 'read'], ['students', 'read_own']],
        requireAll: false,
        description: 'View student profile',
    },
    '/students/attendance': {
        requiredPermissions: [['student_attendance', 'list'], ['student_attendance', 'read']],
        requireAll: false,
        description: 'View student attendance',
    },
    '/students/documents': {
        requiredPermissions: [['student_documents', 'list'], ['student_documents', 'read']],
        requireAll: false,
        description: 'View student documents',
    },
    '/students/mydocuments': {
        requiredPermissions: [['student_documents', 'read']],
        requireAll: true,
        description: 'View own student documents',
    },
    '/students/certificates': {
        requiredPermissions: [['student_certificates', 'list'], ['student_certificates', 'read']],
        requireAll: false,
        description: 'View student certificates',
    },
    '/students/mycertificates': {
        requiredPermissions: [['student_certificates', 'read']],
        requireAll: true,
        description: 'View own student certificates',
    },
    '/students/transport': {
        requiredPermissions: [['student_transport', 'list'], ['student_transport', 'read']],
        requireAll: false,
        description: 'View student transport information',
    },

    // Fees Module Screens
    '/fees': {
        requiredPermissions: [['fee_categories', 'list'], ['fee_types', 'list'], ['fee_transactions', 'list']],
        requireAll: false,
        description: 'View fees information',
    },
    '/fees/categories': {
        requiredPermissions: [['fee_categories', 'list'], ['fee_categories', 'read']],
        requireAll: false,
        description: 'View fee categories',
    },
    '/fees/types': {
        requiredPermissions: [['fee_types', 'list'], ['fee_types', 'read']],
        requireAll: false,
        description: 'View fee types',
    },
    '/fees/terms': {
        requiredPermissions: [['fee_terms', 'list'], ['fee_terms', 'read']],
        requireAll: false,
        description: 'View fee terms',
    },
    '/fees/transactions': {
        requiredPermissions: [['fee_transactions', 'list'], ['fee_transactions', 'read']],
        requireAll: false,
        description: 'View fee transactions',
    },
    '/fees/refunds': {
        requiredPermissions: [['fee_refunds', 'list'], ['fee_refunds', 'read']],
        requireAll: false,
        description: 'View fee refunds',
    },
    '/fees/class-mappings': {
        requiredPermissions: [['fee_class_mappings', 'list'], ['fee_class_mappings', 'read']],
        requireAll: false,
        description: 'View fee class mappings',
    },
    '/fees/student-mappings': {
        requiredPermissions: [['fee_student_mappings', 'list'], ['fee_student_mappings', 'read']],
        requireAll: false,
        description: 'View fee student mappings',
    },

    // Staff Module Screens
    '/staff': {
        requiredPermissions: [['staff', 'list'], ['staff', 'read']],
        requireAll: false,
        description: 'View staff information',
    },
    '/staff/enrollment': {
        requiredPermissions: [['staff', 'create'], ['staff', 'update']],
        requireAll: false,
        description: 'Manage staff enrollment',
    },
    '/staff/profile': {
        requiredPermissions: [['staff', 'read'], ['staff', 'read_own']],
        requireAll: false,
        description: 'View staff profile',
    },
    '/staff/designations': {
        requiredPermissions: [['designations', 'list'], ['designations', 'read']],
        requireAll: false,
        description: 'View staff designations',
    },
    '/staff/attendance': {
        requiredPermissions: [['staff_attendance', 'list'], ['staff_attendance', 'read']],
        requireAll: false,
        description: 'View staff attendance',
    },

    // Transport Module Screens
    '/transport': {
        requiredPermissions: [['transport_routes', 'list'], ['transport_vehicles', 'list'], ['transport_trips', 'list']],
        requireAll: false,
        description: 'View transport information',
    },
    '/transport/routes': {
        requiredPermissions: [['transport_routes', 'list'], ['transport_routes', 'read']],
        requireAll: false,
        description: 'View transport routes',
    },
    '/transport/route-stops': {
        requiredPermissions: [['transport_routes', 'list'], ['transport_routes', 'read']],
        requireAll: false,
        description: 'View route stops',
    },
    '/transport/vehicles': {
        requiredPermissions: [['transport_vehicles', 'list'], ['transport_vehicles', 'read']],
        requireAll: false,
        description: 'View transport vehicles',
    },
    '/transport/trips': {
        requiredPermissions: [['transport_trips', 'list'], ['transport_trips', 'read']],
        requireAll: false,
        description: 'View transport trips',
    },
    '/transport/student-transport': {
        requiredPermissions: [['student_transport', 'list'], ['student_transport', 'read']],
        requireAll: false,
        description: 'View student transport assignments',
    },
    '/transport/studentTransport': {
        requiredPermissions: [['student_transport', 'list'], ['student_transport', 'read']],
        requireAll: false,
        description: 'View student transport assignments',
    },

    // Masters Module Screens
    '/masters': {
        requiredPermissions: [
            ['academic_years', 'list'], 
            ['classes', 'list'], 
            ['sections', 'list'],
            ['classes_sections', 'list'], // Fallback
            ['subjects', 'list']
        ],
        requireAll: false,
        description: 'View master data',
    },
    '/masters/academicyears': {
        requiredPermissions: [['academic_years', 'list'], ['academic_years', 'read']],
        requireAll: false,
        description: 'View academic years',
    },
    '/masters/classesandsections': {
        requiredPermissions: [
            ['classes', 'list'], 
            ['classes', 'read'],
            ['sections', 'list'], 
            ['sections', 'read'],
            ['classes_sections', 'list'], // Fallback for combined resource
            ['classes_sections', 'read']
        ],
        requireAll: false,
        description: 'View classes and sections',
    },
    '/masters/subjects': {
        requiredPermissions: [['subjects', 'list'], ['subjects', 'read']],
        requireAll: false,
        description: 'View subjects',
    },
    '/masters/subjectcategories': {
        requiredPermissions: [['subject_categories', 'list'], ['subject_categories', 'read']],
        requireAll: false,
        description: 'View subject categories',
    },
    '/masters/holidays': {
        requiredPermissions: [['holidays', 'list'], ['holidays', 'read']],
        requireAll: false,
        description: 'View holidays',
    },
    '/masters/timetable': {
        requiredPermissions: [['timetables', 'list'], ['timetables', 'read']],
        requireAll: false,
        description: 'View timetables',
    },
    '/masters/rolespermissions': {
        requiredPermissions: [['roles_permissions', 'list'], ['roles_permissions', 'read']],
        requireAll: false,
        description: 'View roles and permissions',
    },

    // Expense Module Screens
    '/expense': {
        requiredPermissions: [['expense_categories', 'list'], ['expense_transactions', 'list']],
        requireAll: false,
        description: 'View expense information',
    },
    '/expense/categories': {
        requiredPermissions: [['expense_categories', 'list'], ['expense_categories', 'read']],
        requireAll: false,
        description: 'View expense categories',
    },
    '/expense/types': {
        requiredPermissions: [['expense_types', 'list'], ['expense_types', 'read']],
        requireAll: false,
        description: 'View expense types',
    },
    '/expense/transactions': {
        requiredPermissions: [['expense_transactions', 'list'], ['expense_transactions', 'read']],
        requireAll: false,
        description: 'View expense transactions',
    },
    '/expense/approvals': {
        requiredPermissions: [['expense_transactions', 'approve']],
        requireAll: true,
        description: 'Approve expense transactions',
    },
    '/expense/audit': {
        requiredPermissions: [['expense_audit', 'list'], ['expense_audit', 'read']],
        requireAll: false,
        description: 'View expense audit logs',
    },

    // Parent Module Screens
    '/parents': {
        requiredPermissions: [['parent_profile', 'read_own'], ['students', 'read']],
        requireAll: false,
        description: 'View parent information',
    },
    '/parents/index': {
        requiredPermissions: [['parent_profile', 'read_own'], ['students', 'read']],
        requireAll: false,
        description: 'View parent dashboard',
    },

    // Profile and Settings Screens
    '/profile': {
        requiredPermissions: [['profile', 'read_own'], ['parent_profile', 'read_own']],
        requireAll: false,
        description: 'View user profile',
    },
    '/(tabs)/settings': {
        requiredPermissions: [], // Settings should be accessible to all authenticated users
        requireAll: false,
        description: 'Access application settings',
    },
};

// Helper function to get screen permissions
export const getScreenPermissions = (screenPath: string): ScreenPermissionConfig | null => {
    return SCREEN_PERMISSIONS[screenPath] || null;
};

// Helper function to check if a screen requires specific permissions
export const screenRequiresPermissions = (screenPath: string): boolean => {
    const config = getScreenPermissions(screenPath);
    return config ? config.requiredPermissions.length > 0 : false;
};

// Helper function to get all screens accessible to a user based on their permissions
export const getAccessibleScreens = (
    userPermissions: PermissionTuple[],
    hasPermissionFn: (resource: string, action: string) => boolean
): string[] => {
    return Object.entries(SCREEN_PERMISSIONS)
        .filter(([_, config]) => {
            if (config.requiredPermissions.length === 0) {
                return true; // No permissions required
            }

            if (config.requireAll) {
                return config.requiredPermissions.every(([resource, action]) =>
                    hasPermissionFn(resource, action)
                );
            } else {
                return config.requiredPermissions.some(([resource, action]) =>
                    hasPermissionFn(resource, action)
                );
            }
        })
        .map(([screenPath, _]) => screenPath);
};

// Helper function to validate screen access
export const validateScreenAccess = (
    screenPath: string,
    hasPermissionFn: (resource: string, action: string) => boolean
): { hasAccess: boolean; config: ScreenPermissionConfig | null; reason?: string } => {
    const config = getScreenPermissions(screenPath);

    if (!config) {
        return {
            hasAccess: true,
            config: null,
            reason: 'No permission configuration found for this screen'
        };
    }

    if (config.requiredPermissions.length === 0) {
        return {
            hasAccess: true,
            config,
            reason: 'No permissions required for this screen'
        };
    }

    const hasAccess = config.requireAll
        ? config.requiredPermissions.every(([resource, action]) => hasPermissionFn(resource, action))
        : config.requiredPermissions.some(([resource, action]) => hasPermissionFn(resource, action));

    return {
        hasAccess,
        config,
        reason: hasAccess
            ? 'User has required permissions'
            : `User lacks required permissions: ${config.description || 'Permission check failed'}`
    };
};