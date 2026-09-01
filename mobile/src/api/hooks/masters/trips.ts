import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { tripsApi, Trip, TripCreate, TripUpdate } from '../../index';

export function useTrips(params?: { vehicle_id?: string; route_id?: string; driver_id?: string }) {
  return useMastersQuery<Trip[]>({
    queryKey: ['trips', params],
    queryFn: () => tripsApi.getTrips(params),
    resource: PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    action: 'list',
  });
}

export function useTrip(id: string) {
  return useMastersQuery<Trip>({
    queryKey: ['trips', id],
    queryFn: () => tripsApi.getTrip(id),
    resource: PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    action: 'read',
    enabled: !!id,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<Trip, Error, TripCreate>({
    mutationFn: (data) => tripsApi.createTrip(data),
    resource: PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      showSuccess('Trip created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create trip');
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<Trip, Error, { id: string; data: TripUpdate }>({
    mutationFn: ({ id, data }) => tripsApi.updateTrip(id, data),
    resource: PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      showSuccess('Trip updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update trip');
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => tripsApi.deleteTrip(id),
    resource: PERMISSION_RESOURCES.TRANSPORT_TRIPS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      showSuccess('Trip deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete trip');
    },
  });
}
