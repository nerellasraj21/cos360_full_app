import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { locationsApi, LocationOut, LocationIn, LocationUpdate } from '../../index';

export function useLocations() {
  return useMastersQuery<LocationOut[]>({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll(),
    resource: PERMISSION_RESOURCES.LOCATIONS,
    action: 'list',
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<LocationOut, Error, LocationIn>({
    mutationFn: (data) => locationsApi.create(data),
    resource: PERMISSION_RESOURCES.LOCATIONS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      showSuccess('Location created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create location');
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<LocationOut, Error, { id: string; data: LocationUpdate }>({
    mutationFn: ({ id, data }) => locationsApi.update(id, data),
    resource: PERMISSION_RESOURCES.LOCATIONS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      showSuccess('Location updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update location');
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => locationsApi.delete(id),
    resource: PERMISSION_RESOURCES.LOCATIONS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      showSuccess('Location deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete location');
    },
  });
}
