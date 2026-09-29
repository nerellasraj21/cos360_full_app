import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query'
import { usePermission } from './usePermission'
import { PERMISSIONS, type PermissionResource, type PermissionAction } from '@/constants/permissions'

interface PermissionProtectedQueryOptions<TData, TError>
  extends UseQueryOptions<TData, TError> {
  resource?: string
  action?: string
  resourceConstant?: PermissionResource
  actionConstant?: PermissionAction<PermissionResource>
  permissions?: Array<[string, string]>
  requireAll?: boolean
  onPermissionDenied?: () => void
}

/**
 * Hook that wraps React Query queries with permission checking
 * Prevents API calls if user doesn't have required permissions
 *
 * @param options - Query options including permission requirements
 * @returns Query result with permission-aware behavior
 */
export function usePermissionProtectedQuery<
  TData = unknown,
  TError = unknown
>(
  options: PermissionProtectedQueryOptions<TData, TError>
): UseQueryResult<TData, TError> & {
  hasPermission: boolean
} {
  const {
    resource,
    action,
    resourceConstant,
    actionConstant,
    permissions,
    requireAll = false,
    onPermissionDenied,
    ...queryOptions
  } = options

  const { checkPermission, checkPermissionByConstant, hasAnyPermission, hasAllPermissions } = usePermission()

  // Determine if user has permission
  let hasPermission = false

  if (resource && action) {
    hasPermission = checkPermission(resource, action)
  } else if (resourceConstant && actionConstant) {
    hasPermission = checkPermissionByConstant(resourceConstant, actionConstant)
  } else if (permissions && permissions.length > 0) {
    hasPermission = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  } else {
    // No permission check required
    hasPermission = true
  }

  // Create a wrapper query function that checks permissions
  const permissionProtectedQueryFn = async (context: any) => {
    if (!hasPermission) {
      onPermissionDenied?.()
      throw new Error(`Permission denied: ${resource || resourceConstant}:${action || actionConstant}`)
    }

    // Call the original query function
    if (queryOptions.queryFn && typeof queryOptions.queryFn === 'function') {
      return queryOptions.queryFn(context)
    }

    throw new Error('No query function provided')
  }

  // Use the permission-protected query function
  const query = useQuery({
    ...queryOptions,
    queryFn: permissionProtectedQueryFn,
    enabled: hasPermission && (queryOptions.enabled ?? true), // Only enable if user has permission
  })

  return {
    ...query,
    hasPermission,
  }
}

// Convenience hooks for common read operations
export function useReadQuery<TData = unknown, TError = unknown>(
  resource: string,
  options: Omit<PermissionProtectedQueryOptions<TData, TError>, 'resource' | 'action'>
) {
  return usePermissionProtectedQuery({
    ...options,
    resource,
    action: 'read',
  })
}

export function useListQuery<TData = unknown, TError = unknown>(
  resource: string,
  options: Omit<PermissionProtectedQueryOptions<TData, TError>, 'resource' | 'action'>
) {
  return usePermissionProtectedQuery({
    ...options,
    resource,
    action: 'list',
  })
}