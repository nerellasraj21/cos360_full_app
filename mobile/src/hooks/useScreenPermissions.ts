import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getScreenPermissions, 
  validateScreenAccess, 
  getAccessibleScreens,
  screenRequiresPermissions,
  type ScreenPermissionConfig 
} from '../config/screenPermissions';
import { PermissionTuple } from '../types/permissions';

export interface UseScreenPermissionsResult {
  // Screen validation
  validateScreen: (screenPath: string) => {
    hasAccess: boolean;
    config: ScreenPermissionConfig | null;
    reason?: string;
  };
  
  // Screen configuration
  getScreenConfig: (screenPath: string) => ScreenPermissionConfig | null;
  requiresPermissions: (screenPath: string) => boolean;
  
  // Bulk operations
  getAccessibleScreenPaths: () => string[];
  filterAccessibleScreens: (screenPaths: string[]) => string[];
  
  // Permission checking
  canAccessScreen: (screenPath: string) => boolean;
  getScreenAccessReason: (screenPath: string) => string;
}

export const useScreenPermissions = (): UseScreenPermissionsResult => {
  const { hasPermission, permissions } = useAuth();

  // Convert permissions to tuple format for compatibility
  const permissionTuples = useMemo((): PermissionTuple[] => {
    return permissions
      .filter(p => p.is_granted)
      .map(p => [p.resource, p.action] as PermissionTuple);
  }, [permissions]);

  const screenPermissions = useMemo(() => {
    // Screen validation
    const validateScreen = (screenPath: string) => {
      return validateScreenAccess(screenPath, hasPermission);
    };

    // Screen configuration
    const getScreenConfig = (screenPath: string) => {
      return getScreenPermissions(screenPath);
    };

    const requiresPermissions = (screenPath: string) => {
      return screenRequiresPermissions(screenPath);
    };

    // Bulk operations
    const getAccessibleScreenPaths = () => {
      return getAccessibleScreens(permissionTuples, hasPermission);
    };

    const filterAccessibleScreens = (screenPaths: string[]) => {
      return screenPaths.filter(screenPath => {
        const { hasAccess } = validateScreen(screenPath);
        return hasAccess;
      });
    };

    // Permission checking
    const canAccessScreen = (screenPath: string) => {
      const { hasAccess } = validateScreen(screenPath);
      return hasAccess;
    };

    const getScreenAccessReason = (screenPath: string) => {
      const { reason } = validateScreen(screenPath);
      return reason || 'Unknown access status';
    };

    return {
      validateScreen,
      getScreenConfig,
      requiresPermissions,
      getAccessibleScreenPaths,
      filterAccessibleScreens,
      canAccessScreen,
      getScreenAccessReason,
    };
  }, [hasPermission, permissionTuples]);

  return screenPermissions;
};