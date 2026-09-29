import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastContext as useToast } from '../../../../components/ToastProvider';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import {
  studentAttendanceApi,
  StudentAttendanceOut,
  StudentAttendanceCreate,
  StudentAttendanceUpdate
} from '../../students';

// Get all attendances (admin function) - permission protected
export function useAllAttendances(params?: { date?: string; class_id?: string; section_id?: string }) {
  return usePermissionProtectedQuery<StudentAttendanceOut[]>({
    resource: PERMISSION_RESOURCES.STUDENT_ATTENDANCE,
    action: 'list',
    queryKey: ['attendance', 'all', params],
    queryFn: () => studentAttendanceApi.getAllAttendances(params),
  });
}

// Create attendance record - permission protected
export function useCreateAttendance() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<StudentAttendanceOut, Error, StudentAttendanceCreate>({
    resource: PERMISSION_RESOURCES.STUDENT_ATTENDANCE,
    action: 'create',
    mutationFn: studentAttendanceApi.createAttendance,
    onSuccess: () => {
      showSuccess('Success', 'Attendance record created successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => {
      showError('Error', `Failed to create attendance: ${error.message}`);
    },
  });
}

// Update attendance record - permission protected
export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<StudentAttendanceOut, Error, { id: string; data: StudentAttendanceUpdate }>({
    resource: PERMISSION_RESOURCES.STUDENT_ATTENDANCE,
    action: 'update',
    mutationFn: ({ id, data }) => studentAttendanceApi.updateAttendance(id, data),
    onSuccess: () => {
      showSuccess('Success', 'Attendance record updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => {
      showError('Error', `Failed to update attendance: ${error.message}`);
    },
  });
}

// Delete attendance record - permission protected
export function useDeleteAttendance() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<void, Error, string>({
    resource: PERMISSION_RESOURCES.STUDENT_ATTENDANCE,
    action: 'delete',
    mutationFn: studentAttendanceApi.deleteAttendance,
    onSuccess: () => {
      showSuccess('Success', 'Attendance record deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => {
      showError('Error', `Failed to delete attendance: ${error.message}`);
    },
  });
}