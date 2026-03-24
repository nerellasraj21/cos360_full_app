import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../../components/FeedbackToast';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { studentTransportApi, StudentTransportOut, StudentTransportCreate, StudentTransportUpdate } from '../../students';

// Get all student transport assignments - permission protected
export function useStudentTransports(params?: { student_id?: string }) {
  return usePermissionProtectedQuery<StudentTransportOut[]>({
    resource: PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    action: 'list',
    queryKey: ['student-transport', params],
    queryFn: () => studentTransportApi.listStudentTransport(params),
  });
}

// Get student transport by ID - permission protected
export function useStudentTransport(id: string) {
  return usePermissionProtectedQuery<StudentTransportOut>({
    resource: PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    action: 'read',
    queryKey: ['student-transport', 'detail', id],
    queryFn: () => studentTransportApi.getStudentTransport(id),
    enabled: !!id,
  });
}

// Create student transport assignment - permission protected
export function useCreateStudentTransport() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<StudentTransportOut, Error, StudentTransportCreate>({
    resource: PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    action: 'create',
    mutationFn: studentTransportApi.createStudentTransport,
    onSuccess: () => {
      showSuccess('Success', 'Student transport assignment created successfully!');
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
    },
    onError: (error: any) => {
      showError('Error', `Failed to create transport assignment: ${error.message}`);
    },
  });
}

// Update student transport assignment - permission protected
export function useUpdateStudentTransport() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<StudentTransportOut, Error, { id: string; data: StudentTransportUpdate }>({
    resource: PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    action: 'update',
    mutationFn: ({ id, data }: { id: string; data: StudentTransportUpdate }) => studentTransportApi.updateStudentTransport(id, data),
    onSuccess: () => {
      showSuccess('Success', 'Student transport assignment updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
    },
    onError: (error: any) => {
      showError('Error', `Failed to update transport assignment: ${error.message}`);
    },
  });
}

// Delete student transport assignment - permission protected
export function useDeleteStudentTransport() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<void, Error, string>({
    resource: PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    action: 'delete',
    mutationFn: studentTransportApi.deleteStudentTransport,
    onSuccess: () => {
      showSuccess('Success', 'Student transport assignment deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
    },
    onError: (error: any) => {
      showError('Error', `Failed to delete transport assignment: ${error.message}`);
    },
  });
}

// Get my transport assignments (for student/parent users)
export function useMyTransportAssignments(studentId?: string) {
  return usePermissionProtectedQuery<StudentTransportOut[]>({
    resource: PERMISSION_RESOURCES.STUDENT_TRANSPORT,
    action: 'read',
    queryKey: ['my-transport-assignments', studentId],
    queryFn: () => studentTransportApi.listStudentTransport({ student_id: studentId }),
    enabled: !!studentId,
  });
}