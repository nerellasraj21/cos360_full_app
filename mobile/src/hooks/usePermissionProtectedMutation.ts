import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query'
import { useMobilePermission } from './useMobilePermission'
import { PermissionResource, PermissionAction } from '../constants/permissions'

interface UsePermissionProtectedMutationOptions<TData = unknown, TError = unknown, TVariables = unknown> extends UseMutationOptions<TData, TError, TVariables> {
  resource: PermissionResource
  action?: PermissionAction<PermissionResource>
  permissions?: Array<[string, string]>
  requireAll?: boolean
}

interface PermissionProtectedMutationResult<TData = unknown, TError = unknown, TVariables = unknown> {
  data: TData | undefined
  error: TError | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  isPending: boolean
  isIdle: boolean
  status: 'idle' | 'pending' | 'success' | 'error'
  hasPermission: boolean
  mutate: (variables: TVariables, options?: any) => void
  mutateAsync: (variables: TVariables, options?: any) => Promise<TData>
  reset: () => void
  failureCount: number
  failureReason: TError | null
  submittedAt: number
  variables: TVariables | undefined
}

/**
 * React Query mutation hook that wraps mutations with permission checks
 * Similar to web version's usePermissionProtectedMutation
 */
export const usePermissionProtectedMutation = <TData = unknown, TError = unknown, TVariables = unknown>(
  options: UsePermissionProtectedMutationOptions<TData, TError, TVariables>
): PermissionProtectedMutationResult<TData, TError, TVariables> => {
  const { checkPermissionByConstant, hasAnyPermission, hasAllPermissions } = useMobilePermission()

  // Check permissions
  let hasPermission = false

  if (options.permissions && options.permissions.length > 0) {
    hasPermission = options.requireAll
      ? hasAllPermissions(options.permissions)
      : hasAnyPermission(options.permissions)
  } else if (options.resource && options.action) {
    hasPermission = checkPermissionByConstant(options.resource, options.action)
  }

  // If no permission, return disabled mutation result
  if (!hasPermission) {
    return {
      data: undefined,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
      isPending: false,
      isIdle: true,
      status: 'idle',
      hasPermission: false,
      mutate: () => {
        // No-op mutation when no permission
        console.warn('Mutation blocked due to insufficient permissions')
      },
      mutateAsync: async () => {
        throw new Error('Insufficient permissions for this operation')
      },
      reset: () => {},
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
      variables: undefined,
    } as PermissionProtectedMutationResult<TData, TError, TVariables>
  }

  // Execute mutation if permission granted
  const mutationResult = useMutation(options)

  return {
    ...mutationResult,
    hasPermission: true,
    isLoading: mutationResult.isPending, // Map isPending to isLoading for compatibility
  }
}