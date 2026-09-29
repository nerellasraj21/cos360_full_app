import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { holidaysApi, HolidayRead, HolidayCreate, HolidayUpdate } from '../../index';

// Get all holidays - permission protected
export function useHolidays() {
  return useMastersQuery<HolidayRead[]>({
    queryKey: ['holidays'],
    queryFn: () => holidaysApi.getHolidays(),
    resource: PERMISSION_RESOURCES.HOLIDAYS,
    action: 'list',
  });
}

// Get holidays dropdown - permission protected
export function useHolidaysDropdown() {
  return useMastersQuery<any[]>({
    queryKey: ['holidaysDropdown'],
    queryFn: () => holidaysApi.getHolidaysDropdown(),
    resource: PERMISSION_RESOURCES.HOLIDAYS,
    action: 'read',
  });
}

// Get holiday by ID - permission protected
export function useHoliday(id: string) {
  return useMastersQuery<HolidayRead>({
    queryKey: ['holidays', id],
    queryFn: () => holidaysApi.getHoliday(id),
    resource: PERMISSION_RESOURCES.HOLIDAYS,
    action: 'read',
    enabled: !!id,
  });
}

// Create holiday - permission protected
export function useCreateHoliday() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<HolidayRead, Error, HolidayCreate>({
    mutationFn: (data) => holidaysApi.createHoliday(data),
    resource: PERMISSION_RESOURCES.HOLIDAYS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      showSuccess('Holiday created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create holiday');
    },
  });
}

// Update holiday - permission protected
export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<HolidayRead, Error, { id: string; data: HolidayUpdate }>({
    mutationFn: ({ id, data }) => holidaysApi.updateHoliday(id, data),
    resource: PERMISSION_RESOURCES.HOLIDAYS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      showSuccess('Holiday updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update holiday');
    },
  });
}

// Delete holiday - permission protected
export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => holidaysApi.deleteHoliday(id),
    resource: PERMISSION_RESOURCES.HOLIDAYS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      showSuccess('Holiday deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete holiday');
    },
  });
}

// Activate holiday - permission protected
export function useActivateHoliday() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<HolidayRead, Error, string>({
    mutationFn: (id) => holidaysApi.activateHoliday(id),
    resource: PERMISSION_RESOURCES.HOLIDAYS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      showSuccess('Holiday activated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to activate holiday');
    },
  });
}