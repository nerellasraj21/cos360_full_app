import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query'
import { usePermission } from './usePermission'
import { PERMISSIONS, type PermissionResource, type PermissionAction } from '@/constants/permissions'

interface PermissionProtectedMutationOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  resource?: string
  action?: string
  resourceConstant?: PermissionResource
  actionConstant?: PermissionAction<PermissionResource>
  permissions?: Array<[string, string]>
  requireAll?: boolean
  onPermissionDenied?: () => void
}

/**
 * Hook that wraps React Query mutations with permission checking
 * Prevents API calls if user doesn't have required permissions
 *
 * @param options - Mutation options including permission requirements
 * @returns Mutation result with permission-aware behavior
 */
export function usePermissionProtectedMutation<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
  TContext = unknown
>(
  options: PermissionProtectedMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> & {
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
    ...mutationOptions
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

  // Create a wrapper mutation function that checks permissions
  const permissionProtectedMutationFn = async (variables: TVariables) => {
    if (!hasPermission) {
      onPermissionDenied?.()
      throw new Error(`Permission denied: ${resource || resourceConstant}:${action || actionConstant}`)
    }

    // Call the original mutation function
    if (mutationOptions.mutationFn) {
      return mutationOptions.mutationFn(variables)
    }

    throw new Error('No mutation function provided')
  }

  // Use the permission-protected mutation function
  const mutation = useMutation({
    ...mutationOptions,
    mutationFn: permissionProtectedMutationFn,
  })

  return {
    ...mutation,
    hasPermission,
  }
}

// Convenience hooks for common CRUD operations
export function useCreateMutation<TData = unknown, TError = unknown, TVariables = unknown>(
  resource: string,
  options: Omit<PermissionProtectedMutationOptions<TData, TError, TVariables, unknown>, 'resource' | 'action'>
) {
  return usePermissionProtectedMutation({
    ...options,
    resource,
    action: 'create',
  })
}

export function useUpdateMutation<TData = unknown, TError = unknown, TVariables = unknown>(
  resource: string,
  options: Omit<PermissionProtectedMutationOptions<TData, TError, TVariables, unknown>, 'resource' | 'action'>
) {
  return usePermissionProtectedMutation({
    ...options,
    resource,
    action: 'update',
  })
}

export function useDeleteMutation<TData = unknown, TError = unknown, TVariables = unknown>(
  resource: string,
  options: Omit<PermissionProtectedMutationOptions<TData, TError, TVariables, unknown>, 'resource' | 'action'>
) {
  return usePermissionProtectedMutation({
    ...options,
    resource,
    action: 'delete',
  })
}

// Note: Convenience hooks for constants removed due to TypeScript complexity
// Use the main usePermissionProtectedMutation hook with resourceConstant and actionConstant