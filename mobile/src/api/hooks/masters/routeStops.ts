import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { routeStopsApi, RouteStop, RouteStopCreate, RouteStopUpdate } from '../../index';

export function useRouteStops(params?: { route_id?: string; is_active?: boolean }) {
  return useMastersQuery<RouteStop[]>({
    queryKey: ['routeStops', params],
    queryFn: () => routeStopsApi.getRouteStops(params),
    resource: PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    action: 'list',
  });
}

export function useRouteStop(id: string) {
  return useMastersQuery<RouteStop>({
    queryKey: ['routeStops', id],
    queryFn: () => routeStopsApi.getRouteStop(id),
    resource: PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    action: 'read',
    enabled: !!id,
  });
}

export function useRouteStopsByRoute(routeId: string) {
  return useQuery<RouteStop[]>({
    queryKey: ['routeStops', 'byRoute', routeId],
    queryFn: () => routeStopsApi.getRouteStops({ route_id: routeId }),
    enabled: !!routeId,
  });
}

export function useCreateRouteStop() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<RouteStop, Error, RouteStopCreate>({
    mutationFn: (data) => routeStopsApi.createRouteStop(data),
    resource: PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routeStops'] });
      showSuccess('Route stop created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create route stop');
    },
  });
}

export function useUpdateRouteStop() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<RouteStop, Error, { id: string; data: RouteStopUpdate }>({
    mutationFn: ({ id, data }) => routeStopsApi.updateRouteStop(id, data),
    resource: PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routeStops'] });
      showSuccess('Route stop updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update route stop');
    },
  });
}

export function useDeleteRouteStop() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => routeStopsApi.deleteRouteStop(id),
    resource: PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routeStops'] });
      showSuccess('Route stop deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete route stop');
    },
  });
}
