import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
import { useMobilePermission } from './useMobilePermission'
import { PermissionResource, PermissionAction } from '../constants/permissions'

interface UsePermissionProtectedQueryOptions<TData = unknown, TError = unknown> extends UseQueryOptions<TData, TError> {
  resource: PermissionResource
  action?: PermissionAction<PermissionResource>
  permissions?: Array<[string, string]>
  requireAll?: boolean
  fallbackData?: TData
}

interface PermissionProtectedQueryResult<TData = unknown, TError = unknown> {
  data: TData | undefined
  error: TError | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  isPending: boolean
  isFetching: boolean
  isFetched: boolean
  isFetchedAfterMount: boolean
  isRefetching: boolean
  isStale: boolean
  dataUpdatedAt: number
  errorUpdatedAt: number
  failureCount: number
  failureReason: TError | null
  errorUpdateCount: number
  isPaused: boolean
  fetchStatus: 'fetching' | 'paused' | 'idle'
  status: 'loading' | 'error' | 'success' | 'pending'
  hasPermission: boolean
  refetch: (options?: any) => Promise<any>
  promise: Promise<any>
}

/**
 * React Query hook that wraps queries with permission checks
 * Similar to web version's usePermissionProtectedQuery
 */
export const usePermissionProtectedQuery = <TData = unknown, TError = unknown>(
  options: UsePermissionProtectedQueryOptions<TData, TError>
): PermissionProtectedQueryResult<TData, TError> => {
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

  // If no permission, return disabled query result
  if (!hasPermission) {
    return {
      data: options.fallbackData,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
      isPending: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: false,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isPaused: false,
      fetchStatus: 'idle',
      status: 'success',
      hasPermission: false,
      refetch: () => Promise.resolve({ data: options.fallbackData } as any),
      promise: Promise.resolve({ data: options.fallbackData } as any),
    } as PermissionProtectedQueryResult<TData, TError>
  }

  // Execute query if permission granted
  const queryResult = useQuery(options)

  return {
    ...queryResult,
    hasPermission: true,
  }
}