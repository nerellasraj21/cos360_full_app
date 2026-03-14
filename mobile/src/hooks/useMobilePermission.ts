import { useAuth } from '../../contexts/AuthContext'
import { PERMISSIONS, type PermissionResource, type PermissionAction } from '../constants/permissions'
import { buildPermissionMap, type PermissionMap } from '../stores/mobileAuthStore'
import { useCallback, useMemo } from 'react'

export const useMobilePermission = () => {
  const { hasPermission, permissions, isAuthenticated } = useAuth()

  // Build permission map for efficient lookups - similar to web version
  const permissionsMap = useMemo(() => buildPermissionMap(permissions), [permissions])

  // Legacy array-based permissions map for backward compatibility
  const permissionsArrayMap = useMemo(() => permissions.reduce((map, perm) => {
    if (!map[perm.resource]) {
      map[perm.resource] = []
    }
    if (perm.is_granted) {
      map[perm.resource].push(perm.action)
    }
    return map
  }, {} as Record<string, string[]>), [permissions])

  const checkPermission = useCallback((resource: string, action: string): boolean => {
    return hasPermission(resource, action)
  }, [hasPermission])

  const checkPermissionByConstant = useCallback(<T extends PermissionResource>(
    resource: T,
    action: PermissionAction<T>
  ): boolean => {
    const permissionString = (PERMISSIONS[resource] as any)[action as keyof typeof PERMISSIONS[T]]
    if (!permissionString) return false

    const [res, act] = permissionString.split(':')
    return hasPermission(res, act)
  }, [hasPermission])

  const hasAnyPermission = useCallback((permissions: Array<[string, string]>): boolean => {
    return permissions.some(([resource, action]) => hasPermission(resource, action))
  }, [hasPermission])

  const hasAllPermissions = useCallback((permissions: Array<[string, string]>): boolean => {
    return permissions.every(([resource, action]) => hasPermission(resource, action))
  }, [hasPermission])

  const getResourcePermissions = useCallback((resource: string): string[] => {
    return permissionsArrayMap[resource] || []
  }, [permissionsArrayMap])

  const canAccessFeature = useCallback((featurePermissions: Array<[string, string]>): boolean => {
    // For mobile, we might want to cache this check or add offline support
    return hasAnyPermission(featurePermissions)
  }, [hasAnyPermission])

  const canAccessResource = useCallback((resource: PermissionResource, requiredActions: PermissionAction[] = ['read']): boolean => {
    return requiredActions.every(action => checkPermissionByConstant(resource, action as any))
  }, [checkPermissionByConstant])

  const canCreate = useCallback((resource: PermissionResource): boolean => {
    return checkPermissionByConstant(resource, 'create' as any)
  }, [checkPermissionByConstant])

  const canRead = useCallback((resource: PermissionResource): boolean => {
    return checkPermissionByConstant(resource, 'read' as any)
  }, [checkPermissionByConstant])

  const canUpdate = useCallback((resource: PermissionResource): boolean => {
    return checkPermissionByConstant(resource, 'update' as any)
  }, [checkPermissionByConstant])

  const canDelete = useCallback((resource: PermissionResource): boolean => {
    return checkPermissionByConstant(resource, 'delete' as any)
  }, [checkPermissionByConstant])

  const canList = useCallback((resource: PermissionResource): boolean => {
    return checkPermissionByConstant(resource, 'list' as any)
  }, [checkPermissionByConstant])

  const canApprove = useCallback((resource: PermissionResource): boolean => {
    return checkPermissionByConstant(resource, 'approve' as any)
  }, [checkPermissionByConstant])

  // Check if user has any permissions for a module
  const hasModuleAccess = useCallback((moduleResources: string[]): boolean => {
    return moduleResources.some(resource => getResourcePermissions(resource).length > 0)
  }, [getResourcePermissions])

  // Get all permissions for current user (array format)
  const getAllPermissions = useCallback((): Record<string, string[]> => {
    return permissionsArrayMap
  }, [permissionsArrayMap])

  // Get permission map for efficient lookups
  const getPermissionMap = useCallback((): PermissionMap => {
    return permissionsMap
  }, [permissionsMap])

  // Check if user is authenticated
  const isUserAuthenticated = useCallback((): boolean => {
    return isAuthenticated
  }, [isAuthenticated])

  // Check if app is online (simplified - always return true for now)
  const isAppOnline = useCallback((): boolean => {
    return true
  }, [])

  return {
    // Basic permission checking
    checkPermission,
    checkPermissionByConstant,
    hasPermission,

    // Multiple permission checking
    hasAnyPermission,
    hasAllPermissions,

    // Resource-specific helpers
    getResourcePermissions,
    canAccessFeature,
    canAccessResource,

    // CRUD helpers
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canList,
    canApprove,

    // Module access
    hasModuleAccess,

    // User state
    getAllPermissions,
    getPermissionMap,
    isUserAuthenticated,
    isAppOnline,
  }
}