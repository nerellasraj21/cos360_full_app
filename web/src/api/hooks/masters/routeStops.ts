import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import { PERMISSIONS } from '@/constants/permissions';
import type {
  RouteStop,
  RouteStopInput,
  RouteStopUpdate
} from '@/types/masters/routeStop';
import {
  fetchRouteStops,
  fetchRouteStopsByRouteId,
  fetchRouteStopById,
  createRouteStop,
  updateRouteStop,
  updateRouteStopPartial,
  deleteRouteStop,
  fetchRouteStopsPaginated
} from '@/api/masters/routeStops';
import { toast } from 'sonner';

// Query keys for route stops
export const routeStopsKeys = {
  all: ['routeStops'] as const,
  lists: () => [...routeStopsKeys.all, 'list'] as const,
  list: (activeOnly?: boolean) => [...routeStopsKeys.lists(), { activeOnly }] as const,
  details: () => [...routeStopsKeys.all, 'detail'] as const,
  detail: (id: string) => [...routeStopsKeys.details(), id] as const,
};

// Get all route stops
export function useRouteStops(activeOnly = true) {
  return useQuery<RouteStop[]>({
    queryKey: routeStopsKeys.list(activeOnly),
    queryFn: () => fetchRouteStops(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get route stops by route ID (for the stops manager panel)
export function useRouteStopsByRoute(routeId: string) {
  return useQuery<RouteStop[]>({
    queryKey: [...routeStopsKeys.lists(), 'byRoute', routeId],
    queryFn: () => fetchRouteStopsByRouteId(routeId),
    enabled: !!routeId,
    staleTime: 2 * 60 * 1000,
  });
}

// Get route stop by ID
export function useRouteStop(id: string) {
  const { checkPermission } = usePermission();
  const hasReadPermission = checkPermission('route_stops', 'read');

  return useQuery<RouteStop>({
    queryKey: routeStopsKeys.detail(id),
    queryFn: () => fetchRouteStopById(id),
    enabled: !!id && hasReadPermission,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create route stop
export function useCreateRouteStop() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<RouteStop, Error, RouteStopInput>({
    resource: 'route_stops',
    action: 'create',
    mutationFn: createRouteStop,
    onSuccess: (data) => {
      toast.success(`Route stop "${data.name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: routeStopsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to create route stop: ${error.message}`);
    },
  });
}

// Update route stop (full)
export function useUpdateRouteStop() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<RouteStop, Error, { id: string; routeStop: RouteStopInput }>({
    resource: 'route_stops',
    action: 'update',
    mutationFn: ({ id, routeStop }) => updateRouteStop(id, routeStop),
    onSuccess: (data) => {
      toast.success(`Route stop "${data.name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: routeStopsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routeStopsKeys.details() });
    },
    onError: (error) => {
      toast.error(`Failed to update route stop: ${error.message}`);
    },
  });
}

// Update route stop (partial)
export function useUpdateRouteStopPartial() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<RouteStop, Error, { id: string; routeStop: RouteStopUpdate }>({
    resource: 'route_stops',
    action: 'update',
    mutationFn: ({ id, routeStop }) => updateRouteStopPartial(id, routeStop),
    onSuccess: (data) => {
      toast.success(`Route stop "${data.name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: routeStopsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routeStopsKeys.details() });
    },
    onError: (error) => {
      toast.error(`Failed to update route stop: ${error.message}`);
    },
  });
}

// Delete route stop
export function useDeleteRouteStop() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'route_stops',
    action: 'delete',
    mutationFn: deleteRouteStop,
    onSuccess: () => {
      toast.success('Route stop deleted successfully!');
      queryClient.invalidateQueries({ queryKey: routeStopsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to delete route stop: ${error.message}`);
    },
  });
}

// Paginated route stops
export function useRouteStopsPaginated(page: number, pageSize: number, activeOnly = true) {
  return useQuery<{ data: RouteStop[]; total: number; hasMore: boolean }, Error>({
    queryKey: [...routeStopsKeys.list(activeOnly), 'paginated', page, pageSize],
    queryFn: () => fetchRouteStopsPaginated(page, pageSize, activeOnly),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}