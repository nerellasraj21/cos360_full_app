import { Permission } from '../services/authUtils';

export interface PermissionDebugInfo {
    totalPermissions: number;
    permissionsByResource: Record<string, string[]>;
    allPermissionStrings: string[];
    missingExpectedPermissions: string[];
    unexpectedPermissions: string[];
}

export const debugPermissions = (
    permissions: Permission[],
    expectedPermissions: string[] = []
): PermissionDebugInfo => {
    const permissionsByResource: Record<string, string[]> = {};
    const allPermissionStrings: string[] = [];

    // Group permissions by resource
    permissions.forEach(permission => {
        const permissionString = `${permission.resource}:${permission.action}`;
        allPermissionStrings.push(permissionString);

        if (!permissionsByResource[permission.resource]) {
            permissionsByResource[permission.resource] = [];
        }
        if (permission.is_granted) {
            permissionsByResource[permission.resource].push(permission.action);
        }
    });

    // Find missing expected permissions
    const missingExpectedPermissions = expectedPermissions.filter(
        expected => !allPermissionStrings.includes(expected)
    );

    // Find unexpected permissions (not in expected list)
    const unexpectedPermissions = allPermissionStrings.filter(
        actual => expectedPermissions.length > 0 && !expectedPermissions.includes(actual)
    );

    return {
        totalPermissions: permissions.length,
        permissionsByResource,
        allPermissionStrings,
        missingExpectedPermissions,
        unexpectedPermissions,
    };
};

export const logPermissionDebugInfo = (
    permissions: Permission[],
    context: string = 'Permission Debug',
    expectedPermissions: string[] = []
): void => {
    const debugInfo = debugPermissions(permissions, expectedPermissions);

    console.group(`🔐 ${context}`);
    console.log('📊 Total Permissions:', debugInfo.totalPermissions);

    console.group('📋 Permissions by Resource:');
    Object.entries(debugInfo.permissionsByResource).forEach(([resource, actions]) => {
        console.log(`  ${resource}:`, actions);
    });
    console.groupEnd();

    if (expectedPermissions.length > 0) {
        if (debugInfo.missingExpectedPermissions.length > 0) {
            console.group('❌ Missing Expected Permissions:');
            debugInfo.missingExpectedPermissions.forEach(permission => {
                console.log(`  - ${permission}`);
            });
            console.groupEnd();
        }

        if (debugInfo.unexpectedPermissions.length > 0) {
            console.group('➕ Additional Permissions:');
            debugInfo.unexpectedPermissions.forEach(permission => {
                console.log(`  + ${permission}`);
            });
            console.groupEnd();
        }
    }

    console.group('🔍 All Permission Strings:');
    debugInfo.allPermissionStrings.forEach(permission => {
        console.log(`  - ${permission}`);
    });
    console.groupEnd();

    console.groupEnd();
};

export const EXPECTED_CLASSES_PERMISSIONS = [
    'classes:create',
    'classes:read',
    'classes:update',
    'classes:delete',
    'classes:list',
];

export const EXPECTED_SECTIONS_PERMISSIONS = [
    'sections:create',
    'sections:read',
    'sections:update',
    'sections:delete',
    'sections:list',
];

export const EXPECTED_ACADEMIC_PERMISSIONS = [
    'academic_years:create',
    'academic_years:read',
    'academic_years:update',
    'academic_years:delete',
    'academic_years:list',
    'academic_years:approve',
];

export const EXPECTED_SUBJECTS_PERMISSIONS = [
    'subjects:create',
    'subjects:read',
    'subjects:update',
    'subjects:delete',
    'subjects:list',
];

// Check if user has any of the expected permissions for a module
export const hasAnyModulePermission = (
    permissions: Permission[],
    expectedPermissions: string[]
): boolean => {
    const allPermissionStrings = permissions
        .filter(p => p.is_granted)
        .map(p => `${p.resource}:${p.action}`);

    return expectedPermissions.some(expected =>
        allPermissionStrings.includes(expected)
    );
};

// Check specific permission patterns
export const checkPermissionPatterns = (permissions: Permission[]): {
    hasClassesPermissions: boolean;
    hasSectionsPermissions: boolean;
    hasClassesSectionsPermissions: boolean;
    hasAcademicPermissions: boolean;
} => {
    return {
        hasClassesPermissions: hasAnyModulePermission(permissions, EXPECTED_CLASSES_PERMISSIONS),
        hasSectionsPermissions: hasAnyModulePermission(permissions, EXPECTED_SECTIONS_PERMISSIONS),
        hasClassesSectionsPermissions: hasAnyModulePermission(permissions, [
            'classes_sections:create',
            'classes_sections:read',
            'classes_sections:update',
            'classes_sections:delete',
            'classes_sections:list',
        ]),
        hasAcademicPermissions: hasAnyModulePermission(permissions, EXPECTED_ACADEMIC_PERMISSIONS),
    };
};