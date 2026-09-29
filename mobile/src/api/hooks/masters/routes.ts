import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { routesApi, Route, RouteCreate, RouteUpdate } from '../../index';

export function useRoutes(params?: { active_only?: boolean }) {
  return useMastersQuery<Route[]>({
    queryKey: ['routes', params],
    queryFn: () => routesApi.getRoutes(params),
    resource: PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    action: 'list',
  });
}

export function useRoutesDropdown() {
  return useQuery<Array<{ id: string; route_name: string }>>({
    queryKey: ['routesDropdown'],
    queryFn: () => routesApi.getRoutesDropdown(),
  });
}

export function useRoute(id: string) {
  return useMastersQuery<Route>({
    queryKey: ['routes', id],
    queryFn: () => routesApi.getRoute(id),
    resource: PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    action: 'read',
    enabled: !!id,
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<Route, Error, RouteCreate>({
    mutationFn: (data) => routesApi.createRoute(data),
    resource: PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      showSuccess('Route created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create route');
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<Route, Error, { id: string; data: RouteUpdate }>({
    mutationFn: ({ id, data }) => routesApi.updateRoute(id, data),
    resource: PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      showSuccess('Route updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update route');
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => routesApi.deleteRoute(id),
    resource: PERMISSION_RESOURCES.TRANSPORT_ROUTES,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      showSuccess('Route deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete route');
    },
  });
}
