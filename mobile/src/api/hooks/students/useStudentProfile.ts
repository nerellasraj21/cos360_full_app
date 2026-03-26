import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastContext as useToast } from '../../../../components/ToastProvider';
import { useAuth } from '../../../../contexts/AuthContext';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import apiClient from '../../client';

export interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  email?: string;
  admission_number?: string;
  roll_number?: string;
  class_name?: string;
  section_name?: string;
  academic_year?: string;
  profile_picture_url?: string;
}

export function useStudentProfile() {
  const { studentId } = useAuth();
  return usePermissionProtectedQuery<StudentProfile>({
    resource: PERMISSION_RESOURCES.STUDENTS,
    action: 'read',
    queryKey: ['student', 'profile', studentId],
    queryFn: async () => {
      const response = await apiClient.get(`/students/profile/${studentId}`);
      return response.data;
    },
    enabled: !!studentId,
  });
}

export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();
  const { studentId } = useAuth();
  const { showSuccess, showError } = useToast();

  return usePermissionProtectedMutation<StudentProfile, Error, Partial<StudentProfile>>({
    resource: PERMISSION_RESOURCES.STUDENTS,
    action: 'update',
    mutationFn: (data: Partial<StudentProfile>) =>
      apiClient.patch(`/students/profile/${studentId}`, data).then(res => res.data),
    onSuccess: () => {
      showSuccess('Success', 'Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['student', 'profile', studentId] });
    },
    onError: (error) => {
      showError('Error', `Failed to update profile: ${error.message}`);
    },
  });
}