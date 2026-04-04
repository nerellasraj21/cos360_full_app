import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { timetableApi, FrontendTimetableCreate } from '../../index';

// Get frontend timetable - permission protected
export function useFrontendTimetable(sectionId: string) {
  return usePermissionProtectedQuery<any>({
    queryKey: ['timetable', sectionId],
    queryFn: () => timetableApi.getFrontendTimetable(sectionId),
    resource: PERMISSION_RESOURCES.TIMETABLES,
    action: 'read',
    enabled: !!sectionId,
  });
}

// Create frontend timetable - permission protected
export function useCreateFrontendTimetable() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<any, Error, FrontendTimetableCreate>({
    mutationFn: (data) => timetableApi.createFrontendTimetable(data),
    resource: PERMISSION_RESOURCES.TIMETABLES,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      showSuccess('Timetable created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create timetable');
    },
  });
}

// Update frontend timetable - permission protected
export function useUpdateFrontendTimetable() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<any, Error, { sectionId: string; data: FrontendTimetableCreate }>({
    mutationFn: ({ sectionId, data }) => timetableApi.updateFrontendTimetable(sectionId, data),
    resource: PERMISSION_RESOURCES.TIMETABLES,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      showSuccess('Timetable updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update timetable');
    },
  });
}