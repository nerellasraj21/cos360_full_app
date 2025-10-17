import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Vehicle,
  VehicleInput,
  VehicleUpdate,
  VehicleDropdown,
  VehicleRoute,
  VehicleRouteStop
} from '@/types/masters/vehicle';
import {
  fetchVehicles,
  fetchVehicleById,
  createVehicle,
  updateVehicle,
  updateVehiclePartial,
  deleteVehicle,
  fetchVehiclesDropdown,
  fetchVehicleRoutes,
  fetchVehicleRouteStops,
  fetchVehiclesPaginated
} from '@/api/masters/vehicles';
import { toast } from 'sonner';

// Query keys for vehicles
export const vehiclesKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehiclesKeys.all, 'list'] as const,
  list: (activeOnly?: boolean) => [...vehiclesKeys.lists(), { activeOnly }] as const,
  dropdown: (activeOnly?: boolean) => [...vehiclesKeys.all, 'dropdown', { activeOnly }] as const,
  details: () => [...vehiclesKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehiclesKeys.details(), id] as const,
  routes: (id: string) => [...vehiclesKeys.detail(id), 'routes'] as const,
  routeStops: (vehicleId: string, routeId: string) => [...vehiclesKeys.routes(vehicleId), routeId, 'stops'] as const,
};

// Get all vehicles
export function useVehicles(activeOnly = true) {
  return useQuery<Vehicle[]>({
    queryKey: vehiclesKeys.list(activeOnly),
    queryFn: () => fetchVehicles(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get vehicle by ID
export function useVehicle(id: string) {
  return useQuery<Vehicle>({
    queryKey: vehiclesKeys.detail(id),
    queryFn: () => fetchVehicleById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create vehicle
export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation<Vehicle, Error, VehicleInput>({
    mutationFn: createVehicle,
    onSuccess: (data) => {
      toast.success(`Vehicle "${data.name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to create vehicle: ${error.message}`);
    },
  });
}

// Update vehicle (full)
export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation<Vehicle, Error, { id: string; vehicle: VehicleInput }>({
    mutationFn: ({ id, vehicle }) => updateVehicle(id, vehicle),
    onSuccess: (data) => {
      toast.success(`Vehicle "${data.name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.details() });
    },
    onError: (error) => {
      toast.error(`Failed to update vehicle: ${error.message}`);
    },
  });
}

// Update vehicle (partial)
export function useUpdateVehiclePartial() {
  const queryClient = useQueryClient();
  return useMutation<Vehicle, Error, { id: string; vehicle: VehicleUpdate }>({
    mutationFn: ({ id, vehicle }) => updateVehiclePartial(id, vehicle),
    onSuccess: (data) => {
      toast.success(`Vehicle "${data.name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.details() });
    },
    onError: (error) => {
      toast.error(`Failed to update vehicle: ${error.message}`);
    },
  });
}

// Delete vehicle
export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      toast.success('Vehicle deleted successfully!');
      queryClient.invalidateQueries({ queryKey: vehiclesKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to delete vehicle: ${error.message}`);
    },
  });
}

// Get vehicles dropdown
export function useVehiclesDropdown(activeOnly = true) {
  return useQuery<VehicleDropdown[]>({
    queryKey: vehiclesKeys.dropdown(activeOnly),
    queryFn: () => fetchVehiclesDropdown(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get vehicle routes
export function useVehicleRoutes(vehicleId: string) {
  return useQuery<VehicleRoute[]>({
    queryKey: vehiclesKeys.routes(vehicleId),
    queryFn: () => fetchVehicleRoutes(vehicleId),
    enabled: !!vehicleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get vehicle route stops
export function useVehicleRouteStops(vehicleId: string, routeId: string) {
  return useQuery<VehicleRouteStop[]>({
    queryKey: vehiclesKeys.routeStops(vehicleId, routeId),
    queryFn: () => fetchVehicleRouteStops(vehicleId, routeId),
    enabled: !!vehicleId && !!routeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Paginated vehicles
export function useVehiclesPaginated(page: number, pageSize: number, activeOnly = true) {
  return useQuery<{ data: Vehicle[]; total: number; hasMore: boolean }, Error>({
    queryKey: [...vehiclesKeys.list(activeOnly), 'paginated', page, pageSize],
    queryFn: () => fetchVehiclesPaginated(page, pageSize, activeOnly),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}