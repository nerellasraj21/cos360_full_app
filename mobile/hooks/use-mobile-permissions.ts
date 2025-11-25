import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  PermissionResource, 
  PermissionAction, 
  PermissionTuple, 
  PermissionMap,
  PERMISSION_ACTIONS,
  PermissionError,
  PermissionErrorType
} from '../src/types/permissions';

export interface UseMobilePermissionResult {
  // Basic permission checking
  checkPermission: (resource: string, action: string) => boolean;
  checkPermissionByConstant: (resource: PermissionResource, action: PermissionAction) => boolean;
  hasPermission: (resource: string, action: string) => boolean;

  // Multiple permission checking
  hasAnyPermission: (permissions: PermissionTuple[]) => boolean;
  hasAllPermissions: (permissions: PermissionTuple[]) => boolean;

  // Resource-specific helpers
  getResourcePermissions: (resource: string) => string[];
  canAccessFeature: (featurePermissions: PermissionTuple[]) => boolean;
  canAccessResource: (resource: PermissionResource, requiredActions?: PermissionAction[]) => boolean;

  // CRUD helpers
  canCreate: (resource: PermissionResource) => boolean;
  canRead: (resource: PermissionResource) => boolean;
  canUpdate: (resource: PermissionResource) => boolean;
  canDelete: (resource: PermissionResource) => boolean;
  canList: (resource: PermissionResource) => boolean;
  canApprove: (resource: PermissionResource) => boolean;

  // Own resource helpers
  canReadOwn: (resource: PermissionResource) => boolean;
  canUpdateOwn: (resource: PermissionResource) => boolean;
  canDeleteOwn: (resource: PermissionResource) => boolean;

  // Module and navigation helpers
  hasModuleAccess: (moduleResources: string[]) => boolean;
  getAccessibleScreens: (screenPermissions: Record<string, PermissionTuple>) => string[];
  
  // Permission state
  getAllPermissions: () => Record<string, string[]>;
  getPermissionMap: () => PermissionMap;
  isUserAuthenticated: () => boolean;
  isAppOnline: () => boolean;

  // Error handling
  createPermissionError: (
    type: PermissionErrorType,
    message: string,
    resource?: string,
    action?: string,
    requiredPermissions?: PermissionTuple[]
  ) => PermissionError;
}

export const useMobilePermissions = (): UseMobilePermissionResult => {
  const { 
    hasPermission: authHasPermission, 
    permissions, 
    permissionsMap, 
    isAuthenticated,
    isLoading 
  } = useAuth();

  // Memoized permission helpers
  const permissionHelpers = useMemo(() => {
    // Basic permission checking
    const checkPermission = (resource: string, action: string): boolean => {
      return authHasPermission(resource, action);
    };

    const checkPermissionByConstant = (resource: PermissionResource, action: PermissionAction): boolean => {
      return authHasPermission(resource, action);
    };

    const hasPermission = (resource: string, action: string): boolean => {
      return authHasPermission(resource, action);
    };

    // Multiple permission checking
    const hasAnyPermission = (permissionList: PermissionTuple[]): boolean => {
      return permissionList.some(([resource, action]) => authHasPermission(resource, action));
    };

    const hasAllPermissions = (permissionList: PermissionTuple[]): boolean => {
      return permissionList.every(([resource, action]) => authHasPermission(resource, action));
    };

    // Resource-specific helpers
    const getResourcePermissions = (resource: string): string[] => {
      return permissions
        .filter(perm => perm.resource === resource && perm.is_granted)
        .map(perm => perm.action);
    };

    const canAccessFeature = (featurePermissions: PermissionTuple[]): boolean => {
      return hasAnyPermission(featurePermissions);
    };

    const canAccessResource = (resource: PermissionResource, requiredActions?: PermissionAction[]): boolean => {
      if (!requiredActions || requiredActions.length === 0) {
        // Default to checking read or list access
        return hasAnyPermission([
          [resource, PERMISSION_ACTIONS.READ],
          [resource, PERMISSION_ACTIONS.LIST]
        ]);
      }

      return requiredActions.some(action => authHasPermission(resource, action));
    };

    // CRUD helpers
    const canCreate = (resource: PermissionResource): boolean => {
      return authHasPermission(resource, PERMISSION_ACTIONS.CREATE);
    };

    const canRead = (resource: PermissionResource): boolean => {
      return authHasPermission(resource, PERMISSION_ACTIONS.READ);
    };

    const canUpdate = (resource: PermissionResource): boolean => {
      return authHasPermission(resource, PERMISSION_ACTIONS.UPDATE);
    };

    const canDelete = (resource: PermissionResource): boolean => {
      return authHasPermission(resource, PERMISSION_ACTIONS.DELETE);
    };

    const canList = (resource: PermissionResource): boolean => {
      return authHasPermission(resource, PERMISSION_ACTIONS.LIST);
    };

    const canApprove = (resource: PermissionResource): boolean => {
      return authHasPermission(resource, PERMISSION_ACTIONS.APPROVE);
    };

    // Own resource helpers
    const canReadOwn = (resource: PermissionResource): boolean => {
      return authHasPermission(resource, PERMISSION_ACTIONS.READ_OWN);
    };

    const canUpdateOwn = (resource: PermissionResource): boolean => {
      return authHasPermission(resource, PERMISSION_ACTIONS.UPDATE_OWN);
    };

    const canDeleteOwn = (resource: PermissionResource): boolean => {
      return authHasPermission(resource, PERMISSION_ACTIONS.DELETE_OWN);
    };

    // Module and navigation helpers
    const hasModuleAccess = (moduleResources: string[]): boolean => {
      return moduleResources.some(resource => 
        hasAnyPermission([
          [resource as PermissionResource, PERMISSION_ACTIONS.READ],
          [resource as PermissionResource, PERMISSION_ACTIONS.LIST]
        ])
      );
    };

    const getAccessibleScreens = (screenPermissions: Record<string, PermissionTuple>): string[] => {
      return Object.entries(screenPermissions)
        .filter(([_, [resource, action]]) => authHasPermission(resource as string, action as string))
        .map(([screen, _]) => screen);
    };

    // Permission state
    const getAllPermissions = (): Record<string, string[]> => {
      const permissionsByResource: Record<string, string[]> = {};
      
      permissions.forEach(perm => {
        if (perm.is_granted) {
          if (!permissionsByResource[perm.resource]) {
            permissionsByResource[perm.resource] = [];
          }
          permissionsByResource[perm.resource].push(perm.action);
        }
      });

      return permissionsByResource;
    };

    const getPermissionMap = (): PermissionMap => {
      return permissionsMap;
    };

    const isUserAuthenticated = (): boolean => {
      return isAuthenticated;
    };

    const isAppOnline = (): boolean => {
      // This could be enhanced with actual network status checking
      return true;
    };

    // Error handling
    const createPermissionError = (
      type: PermissionErrorType,
      message: string,
      resource?: string,
      action?: string,
      requiredPermissions?: PermissionTuple[]
    ): PermissionError => {
      const error = new Error(message) as PermissionError;
      error.type = type;
      error.resource = resource;
      error.action = action;
      error.requiredPermissions = requiredPermissions;
      return error;
    };

    return {
      checkPermission,
      checkPermissionByConstant,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      getResourcePermissions,
      canAccessFeature,
      canAccessResource,
      canCreate,
      canRead,
      canUpdate,
      canDelete,
      canList,
      canApprove,
      canReadOwn,
      canUpdateOwn,
      canDeleteOwn,
      hasModuleAccess,
      getAccessibleScreens,
      getAllPermissions,
      getPermissionMap,
      isUserAuthenticated,
      isAppOnline,
      createPermissionError,
    };
  }, [authHasPermission, permissions, permissionsMap, isAuthenticated]);

  return permissionHelpers;
};