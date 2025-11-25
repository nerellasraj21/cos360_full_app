import AsyncStorage from '@react-native-async-storage/async-storage'

// Permission interface - aligned with web version
export interface Permission {
  resource: string
  action: string
  is_granted: boolean
}

// Permission map for quick lookup - similar to web version
export interface PermissionMap {
  [resource: string]: {
    [action: string]: boolean
  }
}

// Enhanced permission utility functions - aligned with web RBAC
export const hasPermission = (permissions: Permission[], resource: string, action: string): boolean => {
  const permission = permissions.find(p => p.resource === resource && p.action === action)
  return permission?.is_granted || false
}

// Build permission map for efficient lookups
export const buildPermissionMap = (permissions: Permission[]): PermissionMap => {
  const map: PermissionMap = {}
  permissions.forEach(perm => {
    if (!map[perm.resource]) {
      map[perm.resource] = {}
    }
    map[perm.resource][perm.action] = perm.is_granted
  })
  return map
}

export const checkPermissionByConstant = <T extends import('../constants/permissions').PermissionResource>(
  permissions: Permission[],
  resource: T,
  action: import('../constants/permissions').PermissionAction<T>
): boolean => {
  return permissions.some(p => p.resource === resource && p.action === action && p.is_granted)
}

export const hasAnyPermission = (permissions: Permission[], requiredPermissions: Array<[string, string]>): boolean => {
  return requiredPermissions.some(([resource, action]) =>
    hasPermission(permissions, resource, action)
  )
}

export const hasAllPermissions = (permissions: Permission[], requiredPermissions: Array<[string, string]>): boolean => {
  return requiredPermissions.every(([resource, action]) =>
    hasPermission(permissions, resource, action)
  )
}

export const getResourcePermissions = (permissions: Permission[], resource: string): string[] => {
  return permissions
    .filter(p => p.resource === resource && p.is_granted)
    .map(p => p.action)
}

export const canAccessFeature = (permissions: Permission[], featurePermissions: Array<[string, string]>): boolean => {
  return hasAnyPermission(permissions, featurePermissions)
}

export const canAccessResource = <T extends import('../constants/permissions').PermissionResource>(
  permissions: Permission[],
  resource: T,
  requiredActions: import('../constants/permissions').PermissionAction[] = ['read']
): boolean => {
  return requiredActions.every(action => checkPermissionByConstant(permissions, resource, action as any))
}

// Enhanced permission checking with permission map
export const hasPermissionWithMap = (permissionMap: PermissionMap, resource: string, action: string): boolean => {
  return permissionMap[resource]?.[action] || false
}

export const checkPermissionByConstantWithMap = <T extends import('../constants/permissions').PermissionResource>(
  permissionMap: PermissionMap,
  resource: T,
  action: import('../constants/permissions').PermissionAction<T>
): boolean => {
  return permissionMap[resource]?.[action as string] || false
}

export const canCreate = <T extends import('../constants/permissions').PermissionResource>(permissions: Permission[], resource: T): boolean => {
  return checkPermissionByConstant(permissions, resource, 'create' as any)
}

export const canRead = <T extends import('../constants/permissions').PermissionResource>(permissions: Permission[], resource: T): boolean => {
  return checkPermissionByConstant(permissions, resource, 'read' as any)
}

export const canUpdate = <T extends import('../constants/permissions').PermissionResource>(permissions: Permission[], resource: T): boolean => {
  return checkPermissionByConstant(permissions, resource, 'update' as any)
}

export const canDelete = <T extends import('../constants/permissions').PermissionResource>(permissions: Permission[], resource: T): boolean => {
  return checkPermissionByConstant(permissions, resource, 'delete' as any)
}

export const canList = <T extends import('../constants/permissions').PermissionResource>(permissions: Permission[], resource: T): boolean => {
  return checkPermissionByConstant(permissions, resource, 'list' as any)
}

export const canApprove = <T extends import('../constants/permissions').PermissionResource>(permissions: Permission[], resource: T): boolean => {
  return checkPermissionByConstant(permissions, resource, 'approve' as any)
}

export const hasModuleAccess = (permissions: Permission[], moduleResources: import('../constants/permissions').PermissionResource[]): boolean => {
  return moduleResources.some(resource => getResourcePermissions(permissions, resource).length > 0)
}

// PermissionMap is already exported above