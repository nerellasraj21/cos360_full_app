import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import { PERMISSIONS } from '@/constants/permissions';
import { toast } from 'sonner';
import {
  fetchVehicles,
  fetchVehicleById,
  createVehicle,
  updateVehicle,
  updateVehiclePartial,
  deleteVehicle,
  fetchVehiclesDropdown,
  fetchVehiclesPaginated
} from '@/api/masters/vehicles';
import type {
  Vehicle,
  VehicleInput,
  VehicleUpdate,
  VehicleDropdown
} from '@/types/masters/vehicle';

// Query keys for vehicles
export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (activeOnly?: boolean) => [...vehicleKeys.lists(), activeOnly] as const,
  paginated: (page?: number, pageSize?: number, activeOnly?: boolean) => [...vehicleKeys.lists(), 'paginated', page, pageSize, activeOnly] as const,
  details: () => [...vehicleKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleKeys.details(), id] as const,
  dropdowns: () => [...vehicleKeys.all, 'dropdown'] as const,
  dropdown: (activeOnly?: boolean) => [...vehicleKeys.dropdowns(), activeOnly] as const,
};

// Hook for getting vehicles list with permission check
export function useVehicles(activeOnly = true) {
  const { checkPermission } = usePermission();
  const hasListPermission = checkPermission('vehicles', 'list');

  return useQuery<Vehicle[]>({
    queryKey: vehicleKeys.list(activeOnly),
    queryFn: () => fetchVehicles(activeOnly),
    enabled: hasListPermission,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for getting paginated vehicles with permission check
export function useVehiclesPaginated(page = 0, pageSize = 10, activeOnly = true) {
  const { checkPermission } = usePermission();
  const hasListPermission = checkPermission('vehicles', 'list');

  return useQuery({
    queryKey: vehicleKeys.paginated(page, pageSize, activeOnly),
    queryFn: () => fetchVehiclesPaginated(page, pageSize, activeOnly),
    enabled: hasListPermission,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for getting single vehicle with permission check
export function useVehicle(id: string) {
  const { checkPermission } = usePermission();
  const hasReadPermission = checkPermission('vehicles', 'read');

  return useQuery<Vehicle>({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => fetchVehicleById(id),
    enabled: !!id && hasReadPermission,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for getting vehicles dropdown with permission check
export function useVehiclesDropdown(activeOnly = true) {
  const { checkPermission } = usePermission();
  const hasListPermission = checkPermission('vehicles', 'list');

  return useQuery<VehicleDropdown[]>({
    queryKey: vehicleKeys.dropdown(activeOnly),
    queryFn: () => fetchVehiclesDropdown(activeOnly),
    enabled: hasListPermission,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for creating vehicle with permission guard
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<Vehicle, Error, VehicleInput>({
    resource: 'vehicles',
    action: 'create',
    mutationFn: createVehicle,
    onSuccess: (data) => {
      // Invalidate and refetch vehicles lists
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.dropdowns() });

      // Add the new vehicle to the cache
      queryClient.setQueryData(vehicleKeys.detail(data.id), data);

      toast.success('Vehicle created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create vehicle: ${error.message}`);
    },
  });
}

// Hook for updating vehicle with permission guard
export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<Vehicle, Error, { id: string; data: VehicleInput }>({
    resource: 'vehicles',
    action: 'update',
    mutationFn: ({ id, data }) => updateVehicle(id, data),
    onSuccess: (data) => {
      // Update the specific vehicle in cache
      queryClient.setQueryData(vehicleKeys.detail(data.id), data);

      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.dropdowns() });

      toast.success('Vehicle updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update vehicle: ${error.message}`);
    },
  });
}

// Hook for partial updating vehicle with permission guard
export function useUpdateVehiclePartial() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<Vehicle, Error, { id: string; data: VehicleUpdate }>({
    resource: 'vehicles',
    action: 'update',
    mutationFn: ({ id, data }) => updateVehiclePartial(id, data),
    onSuccess: (data) => {
      // Update the specific vehicle in cache
      queryClient.setQueryData(vehicleKeys.detail(data.id), data);

      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.dropdowns() });

      toast.success('Vehicle updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update vehicle: ${error.message}`);
    },
  });
}

// Hook for deleting vehicle with permission guard
export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'vehicles',
    action: 'delete',
    mutationFn: deleteVehicle,
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: vehicleKeys.detail(id) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.dropdowns() });

      toast.success('Vehicle deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete vehicle: ${error.message}`);
    },
  });
}