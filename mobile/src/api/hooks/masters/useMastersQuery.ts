import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';

import { useOptimizedMobilePermissions } from '../../../../hooks/use-optimized-mobile-permissions';

export interface UseMastersQueryOptions<TData = unknown, TError = Error>
  extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  resource: string;
  action: string;
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
}

/**
 * Read hook for the Masters module, matching the web app's behaviour.
 *
 * `usePermissionProtectedQuery` disables the query when the local permission
 * map has no entry for `resource:action`, so any mismatch between the backend's
 * permission keys and `PERMISSION_RESOURCES` leaves the screen silently empty
 * with no request and no error. The web app does not gate reads this way — it
 * fires the request and lets the backend answer (403 surfaces as a real error).
 *
 * `resource` / `action` are still accepted and `hasPermission` is still
 * returned, so callers can keep showing permission-aware empty states, but they
 * no longer decide whether the request happens.
 */
export function useMastersQuery<TData = unknown, TError = Error>(
  options: UseMastersQueryOptions<TData, TError>
) {
  const { hasPermission } = useOptimizedMobilePermissions();
  const { resource, action, ...queryOptions } = options;

  const query = useQuery<TData, TError>(queryOptions);

  return {
    ...query,
    hasPermission: hasPermission(resource, action),
  };
}
