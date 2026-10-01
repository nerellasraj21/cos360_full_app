import { useAuthStore } from '@/lib/authStore'
import { PERMISSIONS, type PermissionResource, type PermissionAction } from '@/constants/permissions'

/**
 * Hook for checking user permissions
 * @returns Object with permission checking functions
 */
export const usePermission = () => {
  const hasPermission = useAuthStore(state => state.hasPermission)

  /**
   * Check if user has a specific permission
   * @param resource - The resource name (e.g., 'students', 'fee_categories')
   * @param action - The action name (e.g., 'create', 'read', 'update', 'delete', 'list')
   * @returns boolean - true if user has permission, false otherwise
   */
  const checkPermission = (resource: string, action: string): boolean => {
    return hasPermission(resource, action);
  }

  /**
   * Check if user has a specific permission using constants
   * @param resource - The resource constant (e.g., PERMISSIONS.STUDENTS)
   * @param action - The action key (e.g., 'CREATE', 'READ')
   * @returns boolean - true if user has permission, false otherwise
   */
  const checkPermissionByConstant = <T extends PermissionResource>(
    resource: T,
    action: PermissionAction<T>
  ): boolean => {
    const permissionString = PERMISSIONS[resource][action as keyof typeof PERMISSIONS[T]] as string
    if (!permissionString) return false

    const [res, act] = permissionString.split(':')
    return hasPermission(res, act)
  }

  /**
   * Check if user has any of the specified permissions
   * @param permissions - Array of [resource, action] pairs
   * @returns boolean - true if user has at least one of the permissions
   */
  const hasAnyPermission = (permissions: Array<[string, string]>): boolean => {
    return permissions.some(([resource, action]) => hasPermission(resource, action))
  }

  /**
   * Check if user has all of the specified permissions
   * @param permissions - Array of [resource, action] pairs
   * @returns boolean - true if user has all permissions
   */
  const hasAllPermissions = (permissions: Array<[string, string]>): boolean => {
    return permissions.every(([resource, action]) => hasPermission(resource, action))
  }

  /**
   * Get all permissions for a specific resource
   * @param resource - The resource name
   * @returns Array of actions the user has permission for
   */
  const getResourcePermissions = (resource: string): string[] => {
    // This would require access to the full permissions map
    // For now, we'll check common actions
    const actions = ['create', 'read', 'update', 'delete', 'list']
    return actions.filter(action => hasPermission(resource, action))
  }

  return {
    checkPermission,
    checkPermissionByConstant,
    hasAnyPermission,
    hasAllPermissions,
    getResourcePermissions,
  }
}