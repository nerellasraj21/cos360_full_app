import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { subjectsApi, Subject, SubjectInput, SubjectUpdate } from '../../index';

// Get all subjects - permission protected
export function useSubjects(params?: { academic_year_id?: string; active_only?: boolean; limit?: number }) {
  return useMastersQuery<Subject[]>({
    queryKey: ['subjects', params?.academic_year_id, params?.active_only, params?.limit],
    queryFn: () => subjectsApi.getSubjects(params),
    resource: PERMISSION_RESOURCES.SUBJECTS,
    action: 'list',
    enabled: !params?.academic_year_id || !!params?.academic_year_id,
  });
}

// Get subject by ID - permission protected
export function useSubject(id: string) {
  return useMastersQuery<Subject>({
    queryKey: ['subjects', id],
    queryFn: () => subjectsApi.getSubject(id),
    resource: PERMISSION_RESOURCES.SUBJECTS,
    action: 'read',
    enabled: !!id,
  });
}

// Create subject - permission protected
export function useCreateSubject() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<Subject, Error, SubjectInput>({
    mutationFn: (data) => subjectsApi.createSubject(data),
    resource: PERMISSION_RESOURCES.SUBJECTS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      showSuccess('Subject created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create subject');
    },
  });
}

// Update subject - permission protected
export function useUpdateSubject() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<Subject, Error, { id: string; data: SubjectUpdate }>({
    mutationFn: ({ id, data }) => subjectsApi.updateSubject(id, data),
    resource: PERMISSION_RESOURCES.SUBJECTS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      showSuccess('Subject updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update subject');
    },
  });
}

// Delete subject - permission protected
export function useDeleteSubject() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => subjectsApi.deleteSubject(id),
    resource: PERMISSION_RESOURCES.SUBJECTS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      showSuccess('Subject deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete subject');
    },
  });
}