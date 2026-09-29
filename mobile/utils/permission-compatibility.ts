import { Permission } from '../services/authUtils';

/**
 * Permission compatibility layer to handle different permission formats
 * This helps bridge the gap between backend permission format and frontend expectations
 */

export interface PermissionCheckResult {
  hasPermission: boolean;
  matchedPermission?: string;
  checkedPermissions: string[];
}

/**
 * Enhanced permission checker that tries multiple permission formats
 * This is useful when the backend and frontend have different permission naming conventions
 */
export const checkPermissionWithFallbacks = (
  permissionsMap: Record<string, Permission>,
  resource: string,
  action: string
): PermissionCheckResult => {
  const checkedPermissions: string[] = [];
  
  // Primary permission format
  const primaryKey = `${resource}:${action}`;
  checkedPermissions.push(primaryKey);
  
  if (permissionsMap[primaryKey]?.is_granted) {
    return {
      hasPermission: true,
      matchedPermission: primaryKey,
      checkedPermissions
    };
  }

  // Try common fallback patterns for classes and sections
  const fallbackPatterns = generateFallbackPatterns(resource, action);
  
  for (const fallbackKey of fallbackPatterns) {
    checkedPermissions.push(fallbackKey);
    if (permissionsMap[fallbackKey]?.is_granted) {
      return {
        hasPermission: true,
        matchedPermission: fallbackKey,
        checkedPermissions
      };
    }
  }

  return {
    hasPermission: false,
    checkedPermissions
  };
};

/**
 * Generate fallback permission patterns for common resource/action combinations
 */
export const generateFallbackPatterns = (resource: string, action: string): string[] => {
  const patterns: string[] = [];

  // Handle classes/sections special cases
  if (resource === 'classes' || resource === 'sections') {
    // Try combined classes_sections resource
    patterns.push(`classes_sections:${action}`);
    
    // Try class_sections (singular)
    patterns.push(`class_sections:${action}`);
    
    // Try the other individual resource
    if (resource === 'classes') {
      patterns.push(`sections:${action}`);
    } else {
      patterns.push(`classes:${action}`);
    }
  }

  // Handle classes_sections resource
  if (resource === 'classes_sections') {
    patterns.push(`classes:${action}`);
    patterns.push(`sections:${action}`);
    patterns.push(`class_sections:${action}`);
  }

  // Handle academic module variations
  if (resource === 'academic_years') {
    patterns.push(`academic_year:${action}`);
    patterns.push(`academicyears:${action}`);
  }

  // Handle subject variations
  if (resource === 'subjects') {
    patterns.push(`subject:${action}`);
  }

  // Handle staff variations
  if (resource === 'staff') {
    patterns.push(`staffs:${action}`);
    patterns.push(`employees:${action}`);
  }

  // Handle student variations
  if (resource === 'students') {
    patterns.push(`student:${action}`);
  }

  // Handle fee variations
  if (resource.startsWith('fee_')) {
    const baseName = resource.replace('fee_', '');
    patterns.push(`fees_${baseName}:${action}`);
    patterns.push(`fee${baseName}:${action}`);
  }

  // list ↔ read interchangeability: some backends grant only one of the two.
  // Without this fallback, a user with `resource:read` (but not `resource:list`)
  // would pass the ReadOrListPermissionGuard yet get an empty result from any hook
  // that requires `action: 'list'`, because the query stays disabled.
  if (action === 'list') {
    patterns.push(`${resource}:read`);
  } else if (action === 'read') {
    patterns.push(`${resource}:list`);
  }

  // Scoped view permissions satisfy an unscoped view check.
  //
  // Student and Parent roles are never granted plain `read`/`list`; they hold
  // the scoped variants (`read_own`/`list_own` for a student's own records,
  // `read_related`/`list_related` for a parent's linked children). A screen
  // guarded by `ReadOrListPermissionGuard` therefore denied them outright —
  // e.g. a parent opening Student Attendance saw "You don't have permission
  // to access attendance" despite holding `student_attendance:read_related`.
  //
  // This only widens the *UI* gate: which records come back is still decided
  // server-side by the scope on the grant, so a student still sees only their
  // own data. Screens themselves branch on role to render the right view.
  if (action === 'read' || action === 'list') {
    patterns.push(
      `${resource}:read_own`,
      `${resource}:read_related`,
      `${resource}:list_own`,
      `${resource}:list_related`,
    );
  }

  return patterns;
};

/**
 * Enhanced hasPermission function with fallback support
 */
export const hasPermissionWithFallbacks = (
  permissionsMap: Record<string, Permission>,
  resource: string,
  action: string,
  debug: boolean = false
): boolean => {
  const result = checkPermissionWithFallbacks(permissionsMap, resource, action);
  
  if (debug) {
    console.log(`🔍 Permission check for ${resource}:${action}:`, {
      hasPermission: result.hasPermission,
      matchedPermission: result.matchedPermission,
      checkedPermissions: result.checkedPermissions,
      totalPermissionsInMap: Object.keys(permissionsMap).length,
      grantedPermissions: Object.keys(permissionsMap).filter(key => 
        permissionsMap[key]?.is_granted
      ),
      allPermissionKeys: Object.keys(permissionsMap)
    });
  }
  
  return result.hasPermission;
};

/**
 * Check if user has any permission from a list of alternatives
 */
export const hasAnyPermissionWithFallbacks = (
  permissionsMap: Record<string, Permission>,
  permissionAlternatives: Array<[string, string]>,
  debug: boolean = false
): boolean => {
  for (const [resource, action] of permissionAlternatives) {
    if (hasPermissionWithFallbacks(permissionsMap, resource, action, debug)) {
      return true;
    }
  }
  return false;
};

/**
 * Get all possible permission keys for a resource/action combination
 */
export const getAllPermissionKeys = (resource: string, action: string): string[] => {
  const primaryKey = `${resource}:${action}`;
  const fallbackPatterns = generateFallbackPatterns(resource, action);
  return [primaryKey, ...fallbackPatterns];
};

/**
 * Analyze permissions to suggest correct resource names
 */
export const analyzePermissions = (permissions: Permission[]): {
  resourceSuggestions: Record<string, string[]>;
  commonPatterns: string[];
  potentialIssues: string[];
} => {
  const resourceSuggestions: Record<string, string[]> = {};
  const commonPatterns: string[] = [];
  const potentialIssues: string[] = [];

  // Group by resource
  const byResource: Record<string, string[]> = {};
  permissions.forEach(perm => {
    if (!byResource[perm.resource]) {
      byResource[perm.resource] = [];
    }
    byResource[perm.resource].push(perm.action);
  });

  // Analyze patterns
  Object.entries(byResource).forEach(([resource, actions]) => {
    // Check for common CRUD patterns
    const hasCRUD = ['create', 'read', 'update', 'delete', 'list'].every(action =>
      actions.includes(action)
    );
    
    if (hasCRUD) {
      commonPatterns.push(`${resource} (Full CRUD)`);
    }

    // Check for potential naming issues
    if (resource.includes('_') && resource.includes('s')) {
      potentialIssues.push(`${resource} - Mixed singular/plural with underscore`);
    }

    // Suggest related resources
    if (resource === 'classes' || resource === 'sections') {
      resourceSuggestions[resource] = ['classes_sections', 'class_sections'];
    }
  });

  return {
    resourceSuggestions,
    commonPatterns,
    potentialIssues
  };
};