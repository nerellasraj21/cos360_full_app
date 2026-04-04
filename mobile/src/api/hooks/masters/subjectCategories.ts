import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { subjectCategoriesApi, SubjectCategory, SubjectCategoryCreate, SubjectCategoryUpdate } from '../../index';

// Get all subject categories - permission protected
export function useSubjectCategories() {
  return usePermissionProtectedQuery<SubjectCategory[]>({
    queryKey: ['subjectCategories'],
    queryFn: () => subjectCategoriesApi.getSubjectCategories(),
    resource: PERMISSION_RESOURCES.SUBJECT_CATEGORIES,
    action: 'list',
    staleTime: 0,
  });
}

// Get subject category by ID - permission protected
export function useSubjectCategory(id: string) {
  return usePermissionProtectedQuery<SubjectCategory>({
    queryKey: ['subjectCategories', id],
    queryFn: () => subjectCategoriesApi.getSubjectCategory(id),
    resource: PERMISSION_RESOURCES.SUBJECT_CATEGORIES,
    action: 'read',
    enabled: !!id,
  });
}

// Create subject category - permission protected
export function useCreateSubjectCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<SubjectCategory, Error, SubjectCategoryCreate>({
    mutationFn: (data) => subjectCategoriesApi.createSubjectCategory(data),
    resource: PERMISSION_RESOURCES.SUBJECT_CATEGORIES,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectCategories'] });
      showSuccess('Subject category created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create subject category');
    },
  });
}

// Update subject category - permission protected
export function useUpdateSubjectCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<SubjectCategory, Error, { id: string; data: SubjectCategoryUpdate }>({
    mutationFn: ({ id, data }) => subjectCategoriesApi.updateSubjectCategory(id, data),
    resource: PERMISSION_RESOURCES.SUBJECT_CATEGORIES,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectCategories'] });
      showSuccess('Subject category updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update subject category');
    },
  });
}

// Delete subject category - permission protected
export function useDeleteSubjectCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => subjectCategoriesApi.deleteSubjectCategory(id),
    resource: PERMISSION_RESOURCES.SUBJECT_CATEGORIES,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectCategories'] });
      showSuccess('Subject category deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete subject category');
    },
  });
}