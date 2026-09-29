import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import { PERMISSIONS } from '@/constants/permissions';
import type {
  Route,
  RouteInput,
  RouteUpdate,
  RouteDropdown
} from '@/types/masters/route';
import {
  fetchRoutes,
  fetchRouteById,
  createRoute,
  updateRoute,
  updateRoutePartial,
  deleteRoute,
  fetchRoutesDropdown,
  fetchStopsByRouteName,
  fetchRoutesPaginated
} from '@/api/masters/routes';
import { toast } from 'sonner';

// Query keys for routes
export const routesKeys = {
  all: ['routes'] as const,
  lists: () => [...routesKeys.all, 'list'] as const,
  list: (activeOnly?: boolean) => [...routesKeys.lists(), { activeOnly }] as const,
  dropdown: (activeOnly?: boolean) => [...routesKeys.all, 'dropdown', { activeOnly }] as const,
  details: () => [...routesKeys.all, 'detail'] as const,
  detail: (id: string) => [...routesKeys.details(), id] as const,
  stopsByName: (routeName: string) => [...routesKeys.all, 'stops', routeName] as const,
};

// Get all routes
export function useRoutes(activeOnly = true) {
  const { checkPermission } = usePermission();
  const hasListPermission = checkPermission('routes', 'list');

  return useQuery<Route[]>({
    queryKey: routesKeys.list(activeOnly),
    queryFn: () => fetchRoutes(activeOnly),
    enabled: hasListPermission,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get route by ID
export function useRoute(id: string) {
  const { checkPermission } = usePermission();
  const hasReadPermission = checkPermission('routes', 'read');

  return useQuery<Route>({
    queryKey: routesKeys.detail(id),
    queryFn: () => fetchRouteById(id),
    enabled: !!id && hasReadPermission,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create route
export function useCreateRoute() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<Route, Error, RouteInput>({
    resource: 'routes',
    action: 'create',
    mutationFn: createRoute,
    onSuccess: (data) => {
      toast.success(`Route "${data.route_name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: routesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routesKeys.dropdown(true) });
    },
    onError: (error) => {
      toast.error(`Failed to create route: ${error.message}`);
    },
  });
}

// Update route (full)
export function useUpdateRoute() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<Route, Error, { id: string; route: RouteInput }>({
    resource: 'routes',
    action: 'update',
    mutationFn: ({ id, route }) => updateRoute(id, route),
    onSuccess: (data) => {
      toast.success(`Route "${data.route_name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: routesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routesKeys.details() });
      queryClient.invalidateQueries({ queryKey: routesKeys.dropdown(true) });
    },
    onError: (error) => {
      toast.error(`Failed to update route: ${error.message}`);
    },
  });
}

// Update route (partial)
export function useUpdateRoutePartial() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<Route, Error, { id: string; route: RouteUpdate }>({
    resource: 'routes',
    action: 'update',
    mutationFn: ({ id, route }) => updateRoutePartial(id, route),
    onSuccess: (data) => {
      toast.success(`Route "${data.route_name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: routesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routesKeys.details() });
      queryClient.invalidateQueries({ queryKey: routesKeys.dropdown(true) });
    },
    onError: (error) => {
      toast.error(`Failed to update route: ${error.message}`);
    },
  });
}

// Delete route
export function useDeleteRoute() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'routes',
    action: 'delete',
    mutationFn: deleteRoute,
    onSuccess: () => {
      toast.success('Route deleted successfully!');
      queryClient.invalidateQueries({ queryKey: routesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routesKeys.dropdown(true) });
    },
    onError: (error) => {
      toast.error(`Failed to delete route: ${error.message}`);
    },
  });
}

// Get routes dropdown
export function useRoutesDropdown(activeOnly = true) {
  return useQuery<RouteDropdown[]>({
    queryKey: routesKeys.dropdown(activeOnly),
    queryFn: () => fetchRoutesDropdown(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get stops by route name
export function useStopsByRouteName(routeName: string) {
  return useQuery<any[]>({
    queryKey: routesKeys.stopsByName(routeName),
    queryFn: () => fetchStopsByRouteName(routeName),
    enabled: !!routeName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Paginated routes
export function useRoutesPaginated(page: number, pageSize: number, activeOnly = true) {
  return useQuery<{ data: Route[]; total: number; hasMore: boolean }, Error>({
    queryKey: [...routesKeys.list(activeOnly), 'paginated', page, pageSize],
    queryFn: () => fetchRoutesPaginated(page, pageSize, activeOnly),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}