import { useQuery, useMutation, UseQueryOptions, UseMutationOptions, QueryKey, UseMutateFunction } from '@tanstack/react-query';
import { useOptimizedMobilePermissions } from './use-optimized-mobile-permissions';
import { 
  PermissionResource, 
  PermissionAction, 
  PermissionTuple,
  PermissionErrorType 
} from '../src/types/permissions';

// Query hook interfaces
export interface UsePermissionProtectedQueryOptions<TData = unknown, TError = Error> 
  extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  resource: string;
  action: string;
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
}

export interface UsePermissionProtectedQueryResult<TData = unknown, TError = Error> {
  data: TData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: TError | null;
  hasPermission: boolean;
  isSuccess: boolean;
  refetch: () => void;
}

// Mutation hook interfaces
export interface UsePermissionProtectedMutationOptions<TData = unknown, TError = Error, TVariables = void>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  resource: string;
  action: string;
  mutationFn: (variables: TVariables) => Promise<TData>;
}

export interface UsePermissionProtectedMutationResult<TData = unknown, TError = Error, TVariables = void> {
  mutate: UseMutateFunction<TData, TError, TVariables, unknown>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  isPending: boolean;
  isError: boolean;
  error: TError | null;
  hasPermission: boolean;
  isSuccess: boolean;
  data: TData | undefined;
  reset: () => void;
}

// Multiple permissions query options
export interface UseMultiPermissionProtectedQueryOptions<TData = unknown, TError = Error>
  extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  permissions: PermissionTuple[];
  requireAll?: boolean;
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
}

/**
 * Hook for permission-protected queries
 * Only executes the query if the user has the required permission
 */
export const usePermissionProtectedQuery = <TData = unknown, TError = Error>(
  options: UsePermissionProtectedQueryOptions<TData, TError>
): UsePermissionProtectedQueryResult<TData, TError> => {
  const { hasPermission, createPermissionError } = useOptimizedMobilePermissions();
  const { resource, action, queryKey, queryFn, enabled = true, ...queryOptions } = options;

  const userHasPermission = hasPermission(resource, action);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userHasPermission) {
        throw createPermissionError(
          PermissionErrorType.INSUFFICIENT_PERMISSIONS,
          `Insufficient permissions for ${resource}:${action}`,
          resource,
          action
        );
      }
      return queryFn();
    },
    enabled: enabled && userHasPermission,
    ...queryOptions,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasPermission: userHasPermission,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
};

/**
 * Hook for permission-protected queries with multiple permission requirements
 */
export const useMultiPermissionProtectedQuery = <TData = unknown, TError = Error>(
  options: UseMultiPermissionProtectedQueryOptions<TData, TError>
): UsePermissionProtectedQueryResult<TData, TError> => {
  const { hasAllPermissions, hasAnyPermission, createPermissionError } = useOptimizedMobilePermissions();
  const { permissions, requireAll = false, queryKey, queryFn, enabled = true, ...queryOptions } = options;

  const userHasPermission = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userHasPermission) {
        throw createPermissionError(
          PermissionErrorType.INSUFFICIENT_PERMISSIONS,
          `Insufficient permissions for required actions`,
          undefined,
          undefined,
          permissions
        );
      }
      return queryFn();
    },
    enabled: enabled && userHasPermission,
    ...queryOptions,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasPermission: userHasPermission,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
};

/**
 * Hook for permission-protected mutations
 * Only allows mutation execution if the user has the required permission
 */
export const usePermissionProtectedMutation = <TData = unknown, TError = Error, TVariables = void>(
  options: UsePermissionProtectedMutationOptions<TData, TError, TVariables>
): UsePermissionProtectedMutationResult<TData, TError, TVariables> => {
  const { hasPermission, createPermissionError } = useOptimizedMobilePermissions();
  const { resource, action, mutationFn, ...mutationOptions } = options;

  const userHasPermission = hasPermission(resource, action);

  const mutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      if (!userHasPermission) {
        throw createPermissionError(
          PermissionErrorType.INSUFFICIENT_PERMISSIONS,
          `Insufficient permissions for ${resource}:${action}`,
          resource,
          action
        );
      }
      return mutationFn(variables);
    },
    ...mutationOptions,
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    hasPermission: userHasPermission,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
    reset: mutation.reset,
  };
};

// Convenience hooks for common CRUD operations
export const usePermissionProtectedCreateMutation = <TData = unknown, TError = Error, TVariables = void>(
  resource: PermissionResource,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>
) => {
  return usePermissionProtectedMutation({
    resource,
    action: 'create',
    mutationFn,
    ...options,
  });
};

export const usePermissionProtectedUpdateMutation = <TData = unknown, TError = Error, TVariables = void>(
  resource: PermissionResource,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>
) => {
  return usePermissionProtectedMutation({
    resource,
    action: 'update',
    mutationFn,
    ...options,
  });
};

export const usePermissionProtectedDeleteMutation = <TData = unknown, TError = Error, TVariables = void>(
  resource: PermissionResource,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>
) => {
  return usePermissionProtectedMutation({
    resource,
    action: 'delete',
    mutationFn,
    ...options,
  });
};

export const usePermissionProtectedListQuery = <TData = unknown, TError = Error>(
  resource: PermissionResource,
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) => {
  return usePermissionProtectedQuery({
    resource,
    action: 'list',
    queryKey,
    queryFn,
    ...options,
  });
};

export const usePermissionProtectedReadQuery = <TData = unknown, TError = Error>(
  resource: PermissionResource,
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) => {
  return usePermissionProtectedQuery({
    resource,
    action: 'read',
    queryKey,
    queryFn,
    ...options,
  });
};