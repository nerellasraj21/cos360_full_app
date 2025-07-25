import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoutes, fetchRouteById, createRoute, updateRoute, deleteRoute } from '@/api/masters/routes';
import type { Route, RouteInput } from '@/types/masters/route';
import { toast } from 'sonner';

export function useRoutes() {
  return useQuery<Route[]>({
    queryKey: ['routes'],
    queryFn: fetchRoutes,
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation<Route, Error, RouteInput>({
    mutationFn: createRoute,
    onSuccess: () => {
      toast.success('Route created!');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: () => {
      toast.error('Failed to create route');
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  return useMutation<Route, Error, { id: number; route: RouteInput }>({
    mutationFn: ({ id, route }) => updateRoute(id, route),
    onSuccess: () => {
      toast.success('Route updated!');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: () => {
      toast.error('Failed to update route');
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteRoute,
    onSuccess: () => {
      toast.success('Route deleted!');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: () => {
      toast.error('Failed to delete route');
    },
  });
} 