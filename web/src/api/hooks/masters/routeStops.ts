import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRouteStops,
  createRouteStop,
  updateRouteStop,
  deleteRouteStop,
} from '@/api/masters/routeStops';
import type { RouteStop, RouteStopInput } from '@/types/masters/routeStop';
import { toast } from 'sonner';

export function useRouteStops() {
  return useQuery<RouteStop[]>({
    queryKey: ['routeStops'],
    queryFn: fetchRouteStops,
  });
}

export function useCreateRouteStop() {
  const queryClient = useQueryClient();
  return useMutation<RouteStop, Error, RouteStopInput>({
    mutationFn: createRouteStop,
    onSuccess: () => {
      toast.success('Route stop created!');
      queryClient.invalidateQueries({ queryKey: ['routeStops'] });
    },
    onError: () => {
      toast.error('Failed to create route stop');
    },
  });
}

export function useUpdateRouteStop() {
  const queryClient = useQueryClient();
  return useMutation<RouteStop, Error, { id: number; routeStop: RouteStopInput }>({
    mutationFn: ({ id, routeStop }) => updateRouteStop(id, routeStop),
    onSuccess: () => {
      toast.success('Route stop updated!');
      queryClient.invalidateQueries({ queryKey: ['routeStops'] });
    },
    onError: () => {
      toast.error('Failed to update route stop');
    },
  });
}

export function useDeleteRouteStop() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteRouteStop,
    onSuccess: () => {
      toast.success('Route stop deleted!');
      queryClient.invalidateQueries({ queryKey: ['routeStops'] });
    },
    onError: () => {
      toast.error('Failed to delete route stop');
    },
  });
} 