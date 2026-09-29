import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routeTypesApi, tripTypesApi } from '@/api/masters/transportTypes';
import type {
  RouteType,
  RouteTypeDropdown,
  RouteTypeCreate,
  RouteTypeUpdate,
  TripType,
  TripTypeDropdown,
  TripTypeCreate,
  TripTypeUpdate,
} from '@/types/masters/transportTypes';
import { toast } from 'sonner';

/**
 * React Query hooks for transport types (route types and trip types)
 *
 * These hooks fetch from the backend master data endpoints:
 * - GET /masters/route-types
 * - GET /masters/trip-types
 */

export const transportTypesKeys = {
  all: ['transportTypes'] as const,
  routeTypes: () => [...transportTypesKeys.all, 'routeTypes'] as const,
  routeTypesList: () => [...transportTypesKeys.routeTypes(), 'list'] as const,
  routeTypesDropdown: () => [...transportTypesKeys.routeTypes(), 'dropdown'] as const,
  tripTypes: () => [...transportTypesKeys.all, 'tripTypes'] as const,
  tripTypesList: () => [...transportTypesKeys.tripTypes(), 'list'] as const,
  tripTypesDropdown: () => [...transportTypesKeys.tripTypes(), 'dropdown'] as const,
};

// ============================================================================
// ROUTE TYPES HOOKS
// ============================================================================

/**
 * Hook to fetch all route types
 */
export function useRouteTypes() {
  return useQuery<RouteType[]>({
    queryKey: transportTypesKeys.routeTypesList(),
    queryFn: routeTypesApi.getAll,
  });
}

/**
 * Hook to fetch route types dropdown (for select components)
 *
 * @example
 * ```tsx
 * const { data: routeTypes, isLoading } = useRouteTypesDropdown();
 * // routeTypes = [{ id: "uuid", name: "Upward" }, ...]
 * ```
 */
export function useRouteTypesDropdown() {
  return useQuery<RouteTypeDropdown[]>({
    queryKey: transportTypesKeys.routeTypesDropdown(),
    queryFn: routeTypesApi.getDropdown,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new route type
 */
export function useCreateRouteType() {
  const queryClient = useQueryClient();
  return useMutation<RouteType, Error, RouteTypeCreate>({
    mutationFn: routeTypesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportTypesKeys.routeTypes() });
      toast.success('Route type created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create route type');
    },
  });
}

/**
 * Hook to update a route type
 */
export function useUpdateRouteType() {
  const queryClient = useQueryClient();
  return useMutation<RouteType, Error, { id: string; data: RouteTypeUpdate }>({
    mutationFn: ({ id, data }) => routeTypesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportTypesKeys.routeTypes() });
      toast.success('Route type updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update route type');
    },
  });
}

/**
 * Hook to delete a route type
 */
export function useDeleteRouteType() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: routeTypesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportTypesKeys.routeTypes() });
      toast.success('Route type deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete route type');
    },
  });
}

// ============================================================================
// TRIP TYPES HOOKS
// ============================================================================

/**
 * Hook to fetch all trip types
 */
export function useTripTypes() {
  return useQuery<TripType[]>({
    queryKey: transportTypesKeys.tripTypesList(),
    queryFn: tripTypesApi.getAll,
  });
}

/**
 * Hook to fetch trip types dropdown (for select components)
 *
 * @example
 * ```tsx
 * const { data: tripTypes, isLoading } = useTripTypesDropdown();
 * // tripTypes = [{ id: "uuid", name: "First Trip" }, ...]
 * ```
 */
export function useTripTypesDropdown() {
  return useQuery<TripTypeDropdown[]>({
    queryKey: transportTypesKeys.tripTypesDropdown(),
    queryFn: tripTypesApi.getDropdown,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new trip type
 */
export function useCreateTripType() {
  const queryClient = useQueryClient();
  return useMutation<TripType, Error, TripTypeCreate>({
    mutationFn: tripTypesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportTypesKeys.tripTypes() });
      toast.success('Trip type created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create trip type');
    },
  });
}

/**
 * Hook to update a trip type
 */
export function useUpdateTripType() {
  const queryClient = useQueryClient();
  return useMutation<TripType, Error, { id: string; data: TripTypeUpdate }>({
    mutationFn: ({ id, data }) => tripTypesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportTypesKeys.tripTypes() });
      toast.success('Trip type updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update trip type');
    },
  });
}

/**
 * Hook to delete a trip type
 */
export function useDeleteTripType() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: tripTypesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportTypesKeys.tripTypes() });
      toast.success('Trip type deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete trip type');
    },
  });
}
