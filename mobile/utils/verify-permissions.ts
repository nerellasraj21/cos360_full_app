/**
 * Verification script for the permission system
 * Run this to test if the permission fixes are working correctly
 */

import { Permission } from '../services/authUtils';
import { hasPermissionWithFallbacks } from './permission-compatibility';
import { logPermissionDebugInfo, checkPermissionPatterns } from './permission-debug';

// Mock permission data for testing
const mockPermissions: Permission[] = [
    // Classes permissions
    { id: 'classes:list', resource: 'classes', action: 'list', is_granted: true },
    { id: 'classes:read', resource: 'classes', action: 'read', is_granted: true },
    { id: 'classes:create', resource: 'classes', action: 'create', is_granted: true },
    { id: 'classes:update', resource: 'classes', action: 'update', is_granted: true },
    { id: 'classes:delete', resource: 'classes', action: 'delete', is_granted: true },

    // Sections permissions
    { id: 'sections:list', resource: 'sections', action: 'list', is_granted: true },
    { id: 'sections:read', resource: 'sections', action: 'read', is_granted: true },
    { id: 'sections:create', resource: 'sections', action: 'create', is_granted: true },
    { id: 'sections:update', resource: 'sections', action: 'update', is_granted: true },
    { id: 'sections:delete', resource: 'sections', action: 'delete', is_granted: true },

    // Academic years permissions
    { id: 'academic_years:list', resource: 'academic_years', action: 'list', is_granted: true },
    { id: 'academic_years:read', resource: 'academic_years', action: 'read', is_granted: true },

    // Subjects permissions
    { id: 'subjects:list', resource: 'subjects', action: 'list', is_granted: true },
    { id: 'subjects:read', resource: 'subjects', action: 'read', is_granted: true },
];

// Alternative mock with combined permissions (old format)
const mockCombinedPermissions: Permission[] = [
    { id: 'classes_sections:list', resource: 'classes_sections', action: 'list', is_granted: true },
    { id: 'classes_sections:read', resource: 'classes_sections', action: 'read', is_granted: true },
    { id: 'classes_sections:create', resource: 'classes_sections', action: 'create', is_granted: true },
    { id: 'classes_sections:update', resource: 'classes_sections', action: 'update', is_granted: true },
    { id: 'classes_sections:delete', resource: 'classes_sections', action: 'delete', is_granted: true },
];

export const verifyPermissionSystem = () => {
    console.log('🧪 Starting Permission System Verification...\n');

    // Test 1: Verify separate permissions work
    console.log('📋 Test 1: Separate Classes/Sections Permissions');
    const separatePermissionsMap = mockPermissions.reduce((map, perm) => {
        map[`${perm.resource}:${perm.action}`] = perm;
        return map;
    }, {} as Record<string, Permission>);

    const test1Results = {
        classesListDirect: hasPermissionWithFallbacks(separatePermissionsMap, 'classes', 'list'),
        sectionsListDirect: hasPermissionWithFallbacks(separatePermissionsMap, 'sections', 'list'),
        classesSectionsListFallback: hasPermissionWithFallbacks(separatePermissionsMap, 'classes_sections', 'list'),
    };

    console.log('Results:', test1Results);
    console.log('Expected: All should be true (classes_sections should fallback to classes)\n');

    // Test 2: Verify combined permissions work with fallbacks
    console.log('📋 Test 2: Combined Permissions with Fallbacks');
    const combinedPermissionsMap = mockCombinedPermissions.reduce((map, perm) => {
        map[`${perm.resource}:${perm.action}`] = perm;
        return map;
    }, {} as Record<string, Permission>);

    const test2Results = {
        classesSectionsDirect: hasPermissionWithFallbacks(combinedPermissionsMap, 'classes_sections', 'list'),
        classesListFallback: hasPermissionWithFallbacks(combinedPermissionsMap, 'classes', 'list'),
        sectionsListFallback: hasPermissionWithFallbacks(combinedPermissionsMap, 'sections', 'list'),
    };

    console.log('Results:', test2Results);
    console.log('Expected: All should be true (classes/sections should fallback to classes_sections)\n');

    // Test 3: Debug logging
    console.log('📋 Test 3: Debug Information');
    logPermissionDebugInfo(mockPermissions, 'Separate Permissions Test');
    logPermissionDebugInfo(mockCombinedPermissions, 'Combined Permissions Test');

    // Test 4: Pattern checking
    console.log('📋 Test 4: Permission Patterns');
    const patterns1 = checkPermissionPatterns(mockPermissions);
    const patterns2 = checkPermissionPatterns(mockCombinedPermissions);

    console.log('Separate permissions patterns:', patterns1);
    console.log('Combined permissions patterns:', patterns2);

    console.log('\n✅ Permission System Verification Complete!');

    return {
        separatePermissionsWork: test1Results.classesListDirect && test1Results.sectionsListDirect,
        fallbacksWork: test1Results.classesSectionsListFallback && test2Results.classesListFallback,
        combinedPermissionsWork: test2Results.classesSectionsDirect,
        allTestsPassed: Object.values(test1Results).every(Boolean) && Object.values(test2Results).every(Boolean)
    };
};

// Export for use in components
export const runPermissionTests = () => {
    if (__DEV__) {
        return verifyPermissionSystem();
    }
    return null;
};