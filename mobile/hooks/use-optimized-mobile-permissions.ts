import { useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionCache } from './use-permission-cache';
import { permissionAnalytics } from '../utils/permission-analytics';
import { 
  PermissionResource, 
  PermissionAction, 
  PermissionTuple, 
  PermissionMap,
  PERMISSION_ACTIONS,
  PermissionError,
  PermissionErrorType
} from '../src/types/permissions';

export interface UseOptimizedMobilePermissionResult {
  // Basic permission checking (cached)
  checkPermission: (resource: string, action: string) => boolean;
  checkPermissionByConstant: (resource: PermissionResource, action: PermissionAction) => boolean;
  hasPermission: (resource: string, action: string) => boolean;

  // Multiple permission checking (cached)
  hasAnyPermission: (permissions: PermissionTuple[]) => boolean;
  hasAllPermissions: (permissions: PermissionTuple[]) => boolean;

  // Batch permission checking (optimized)
  checkMultiplePermissions: (permissions: PermissionTuple[]) => Record<string, boolean>;
  
  // Resource-specific helpers (cached)
  getResourcePermissions: (resource: string) => string[];
  canAccessFeature: (featurePermissions: PermissionTuple[]) => boolean;
  canAccessResource: (resource: PermissionResource, requiredActions?: PermissionAction[]) => boolean;

  // CRUD helpers (cached)
  canCreate: (resource: PermissionResource) => boolean;
  canRead: (resource: PermissionResource) => boolean;
  canUpdate: (resource: PermissionResource) => boolean;
  canDelete: (resource: PermissionResource) => boolean;
  canList: (resource: PermissionResource) => boolean;
  canApprove: (resource: PermissionResource) => boolean;

  // Own resource helpers (cached)
  canReadOwn: (resource: PermissionResource) => boolean;
  canUpdateOwn: (resource: PermissionResource) => boolean;
  canDeleteOwn: (resource: PermissionResource) => boolean;

  // Module and navigation helpers (cached)
  hasModuleAccess: (moduleResources: string[]) => boolean;
  getAccessibleScreens: (screenPermissions: Record<string, PermissionTuple>) => string[];
  
  // Permission state (memoized)
  getAllPermissions: () => Record<string, string[]>;
  getPermissionMap: () => PermissionMap;
  isUserAuthenticated: () => boolean;
  isAppOnline: () => boolean;

  // Performance utilities
  getCacheStats: () => any;
  clearPermissionCache: () => void;
  preloadPermissions: (permissions: PermissionTuple[]) => void;

  // Error handling
  createPermissionError: (
    type: PermissionErrorType,
    message: string,
    resource?: string,
    action?: string,
    requiredPermissions?: PermissionTuple[]
  ) => PermissionError;
}

/**
 * Optimized mobile permissions hook with caching and performance improvements
 */
export const useOptimizedMobilePermissions = (): UseOptimizedMobilePermissionResult => {
  const { 
    hasPermission: authHasPermission, 
    permissions, 
    permissionsMap, 
    isAuthenticated,
    selectedStudent,
    studentId,
    user,
    role
  } = useAuth();

  const cache = usePermissionCache({
    maxSize: 2000,
    ttl: 10 * 60 * 1000, // 10 minutes
    enableMetrics: true,
  });

  // Performance tracking
  const performanceMetrics = useRef({
    totalChecks: 0,
    cacheHits: 0,
    averageCheckTime: 0,
  });

  // Generate context for cache key (includes student context for parent users)
  const getCacheContext = useCallback(() => {
    return selectedStudent?.id || studentId || 'default';
  }, [selectedStudent?.id, studentId]);

  // Optimized permission checking with caching
  const checkPermissionOptimized = useCallback((resource: string, action: string): boolean => {
    const startTime = performance.now();
    const context = getCacheContext();
    const cacheKey = cache.generateCacheKey(resource, action, context);
    
    // Try cache first
    const cachedResult = cache.getCachedResult(cacheKey);
    if (cachedResult !== null) {
      performanceMetrics.current.cacheHits++;
      
      // Record cache hit analytics
      if (user && role) {
        const checkTime = performance.now() - startTime;
        permissionAnalytics.recordPermissionCheck(
          String(user.id) || 'unknown',
          role.name || 'unknown',
          resource,
          action,
          cachedResult,
          {
            studentId: selectedStudent?.id || studentId || undefined,
          },
          {
            checkDuration: checkTime,
            cacheHit: true,
          }
        );
      }
      
      return cachedResult;
    }

    // Compute result
    const result = authHasPermission(resource, action);
    
    // Cache result
    cache.setCachedResult(cacheKey, result);
    
    // Update performance metrics
    performanceMetrics.current.totalChecks++;
    const checkTime = performance.now() - startTime;
    performanceMetrics.current.averageCheckTime = 
      (performanceMetrics.current.averageCheckTime * (performanceMetrics.current.totalChecks - 1) + checkTime) / 
      performanceMetrics.current.totalChecks;

    // Record analytics
    if (user && role) {
      permissionAnalytics.recordPermissionCheck(
        String(user.id) || 'unknown',
        role.name || 'unknown',
        resource,
        action,
        result,
        {
          studentId: selectedStudent?.id || studentId || undefined,
        },
        {
          checkDuration: checkTime,
          cacheHit: false,
        }
      );
    }

    return result;
  }, [authHasPermission, cache, getCacheContext]);

  // Batch permission checking for better performance
  const checkMultiplePermissions = useCallback((permissions: PermissionTuple[]): Record<string, boolean> => {
    const results: Record<string, boolean> = {};
    const context = getCacheContext();
    const uncachedPermissions: PermissionTuple[] = [];

    // Check cache for all permissions first
    permissions.forEach(([resource, action]) => {
      const cacheKey = cache.generateCacheKey(resource, action, context);
      const cachedResult = cache.getCachedResult(cacheKey);
      
      if (cachedResult !== null) {
        results[`${resource}:${action}`] = cachedResult;
        performanceMetrics.current.cacheHits++;
      } else {
        uncachedPermissions.push([resource, action]);
      }
    });

    // Compute uncached permissions in batch
    uncachedPermissions.forEach(([resource, action]) => {
      const result = authHasPermission(resource, action);
      const cacheKey = cache.generateCacheKey(resource, action, context);
      
      results[`${resource}:${action}`] = result;
      cache.setCachedResult(cacheKey, result);
      performanceMetrics.current.totalChecks++;
    });

    return results;
  }, [authHasPermission, cache, getCacheContext]);

  // Memoized permission helpers with caching
  const permissionHelpers = useMemo(() => {
    // Basic permission checking
    const checkPermission = (resource: string, action: string): boolean => {
      return checkPermissionOptimized(resource, action);
    };

    const checkPermissionByConstant = (resource: PermissionResource, action: PermissionAction): boolean => {
      return checkPermissionOptimized(resource, action);
    };

    const hasPermission = (resource: string, action: string): boolean => {
      return checkPermissionOptimized(resource, action);
    };

    // Multiple permission checking with caching
    const hasAnyPermission = (permissionList: PermissionTuple[]): boolean => {
      const context = getCacheContext();
      const cacheKey = cache.generateMultiPermissionKey(permissionList, false, context);
      
      const cachedResult = cache.getCachedResult(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      const result = permissionList.some(([resource, action]) => 
        checkPermissionOptimized(resource, action)
      );
      
      cache.setCachedResult(cacheKey, result);
      return result;
    };

    const hasAllPermissions = (permissionList: PermissionTuple[]): boolean => {
      const context = getCacheContext();
      const cacheKey = cache.generateMultiPermissionKey(permissionList, true, context);
      
      const cachedResult = cache.getCachedResult(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      const result = permissionList.every(([resource, action]) => 
        checkPermissionOptimized(resource, action)
      );
      
      cache.setCachedResult(cacheKey, result);
      return result;
    };

    // Resource-specific helpers with caching
    const getResourcePermissions = (resource: string): string[] => {
      // Use memoized computation for resource permissions
      return permissions
        .filter(perm => perm.resource === resource && perm.is_granted)
        .map(perm => perm.action);
    };

    const canAccessFeature = (featurePermissions: PermissionTuple[]): boolean => {
      return hasAnyPermission(featurePermissions);
    };

    const canAccessResource = (resource: PermissionResource, requiredActions?: PermissionAction[]): boolean => {
      if (!requiredActions || requiredActions.length === 0) {
        return hasAnyPermission([
          [resource, PERMISSION_ACTIONS.READ],
          [resource, PERMISSION_ACTIONS.LIST]
        ]);
      }

      return requiredActions.some(action => checkPermissionOptimized(resource, action));
    };

    // CRUD helpers with caching
    const canCreate = (resource: PermissionResource): boolean => {
      return checkPermissionOptimized(resource, PERMISSION_ACTIONS.CREATE);
    };

    const canRead = (resource: PermissionResource): boolean => {
      return checkPermissionOptimized(resource, PERMISSION_ACTIONS.READ);
    };

    const canUpdate = (resource: PermissionResource): boolean => {
      return checkPermissionOptimized(resource, PERMISSION_ACTIONS.UPDATE);
    };

    const canDelete = (resource: PermissionResource): boolean => {
      return checkPermissionOptimized(resource, PERMISSION_ACTIONS.DELETE);
    };

    const canList = (resource: PermissionResource): boolean => {
      return checkPermissionOptimized(resource, PERMISSION_ACTIONS.LIST);
    };

    const canApprove = (resource: PermissionResource): boolean => {
      return checkPermissionOptimized(resource, PERMISSION_ACTIONS.APPROVE);
    };

    // Own resource helpers with caching
    const canReadOwn = (resource: PermissionResource): boolean => {
      return checkPermissionOptimized(resource, PERMISSION_ACTIONS.READ_OWN);
    };

    const canUpdateOwn = (resource: PermissionResource): boolean => {
      return checkPermissionOptimized(resource, PERMISSION_ACTIONS.UPDATE_OWN);
    };

    const canDeleteOwn = (resource: PermissionResource): boolean => {
      return checkPermissionOptimized(resource, PERMISSION_ACTIONS.DELETE_OWN);
    };

    // Module and navigation helpers with caching
    const hasModuleAccess = (moduleResources: string[]): boolean => {
      const modulePermissions = moduleResources.flatMap(resource => [
        [resource as PermissionResource, PERMISSION_ACTIONS.READ],
        [resource as PermissionResource, PERMISSION_ACTIONS.LIST]
      ]) as PermissionTuple[];
      
      return hasAnyPermission(modulePermissions);
    };

    const getAccessibleScreens = (screenPermissions: Record<string, PermissionTuple>): string[] => {
      const permissionChecks = Object.values(screenPermissions);
      const results = checkMultiplePermissions(permissionChecks);
      
      return Object.entries(screenPermissions)
        .filter(([_, [resource, action]]) => results[`${resource}:${action}`])
        .map(([screen, _]) => screen);
    };

    // Permission state (memoized)
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
      return true; // Could be enhanced with actual network status
    };

    // Performance utilities
    const getCacheStats = () => {
      return {
        ...cache.getCacheStats(),
        performanceMetrics: { ...performanceMetrics.current },
      };
    };

    const clearPermissionCache = () => {
      cache.clearCache();
      performanceMetrics.current = {
        totalChecks: 0,
        cacheHits: 0,
        averageCheckTime: 0,
      };
    };

    const preloadPermissions = (permissionList: PermissionTuple[]) => {
      // Preload permissions into cache
      permissionList.forEach(([resource, action]) => {
        checkPermissionOptimized(resource, action);
      });
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
      checkMultiplePermissions,
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
      getCacheStats,
      clearPermissionCache,
      preloadPermissions,
      createPermissionError,
    };
  }, [
    checkPermissionOptimized,
    checkMultiplePermissions,
    permissions,
    permissionsMap,
    isAuthenticated,
    cache,
    getCacheContext
  ]);

  return permissionHelpers;
};