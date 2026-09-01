import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { vehiclesApi, Vehicle, VehicleCreate, VehicleUpdate } from '../../index';

export function useVehicles(params?: { is_active?: boolean }) {
  return useMastersQuery<Vehicle[]>({
    queryKey: ['vehicles', params],
    queryFn: () => vehiclesApi.getVehicles(params),
    resource: PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    action: 'list',
  });
}

export function useVehiclesDropdown() {
  return useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['vehiclesDropdown'],
    queryFn: () => vehiclesApi.getVehiclesDropdown(),
  });
}

export function useVehicle(id: string) {
  return useMastersQuery<Vehicle>({
    queryKey: ['vehicles', id],
    queryFn: () => vehiclesApi.getVehicle(id),
    resource: PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    action: 'read',
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<Vehicle, Error, VehicleCreate>({
    mutationFn: (data) => vehiclesApi.createVehicle(data),
    resource: PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      showSuccess('Vehicle created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create vehicle');
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<Vehicle, Error, { id: string; data: VehicleUpdate }>({
    mutationFn: ({ id, data }) => vehiclesApi.updateVehicle(id, data),
    resource: PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      showSuccess('Vehicle updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update vehicle');
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => vehiclesApi.deleteVehicle(id),
    resource: PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      showSuccess('Vehicle deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete vehicle');
    },
  });
}
