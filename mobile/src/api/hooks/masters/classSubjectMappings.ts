import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../../components/FeedbackToast';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { classSubjectMappingsApi } from '../../index';
import type { ClassSubjectMapping, ClassSubjectMappingCreate, BulkClassSubjectMapping } from '../../masters';

// Get all class-subject mappings - permission protected
export function useClassSubjectMappings(academicYearId?: string) {
  return usePermissionProtectedQuery<ClassSubjectMapping[]>({
    queryKey: ['classSubjectMappings', academicYearId],
    queryFn: () => classSubjectMappingsApi.getClassSubjectMappings(academicYearId),
    resource: PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS,
    action: 'list',
  });
}

// Get mappings by class - permission protected
export function useClassSubjectMappingsByClass(classId: string) {
  return usePermissionProtectedQuery<ClassSubjectMapping[]>({
    queryKey: ['classSubjectMappings', 'byClass', classId],
    queryFn: () => classSubjectMappingsApi.getMappingsByClass(classId),
    resource: PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS,
    action: 'list',
    enabled: !!classId,
  });
}

// Create class-subject mapping - permission protected
export function useCreateClassSubjectMapping() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return usePermissionProtectedMutation<ClassSubjectMapping, Error, ClassSubjectMappingCreate>({
    mutationFn: (data) => classSubjectMappingsApi.createClassSubjectMapping(data),
    resource: PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSubjectMappings'] });
      showSuccess('Mapping created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create mapping');
    },
  });
}

// Bulk create class-subject mappings - permission protected
export function useBulkCreateClassSubjectMappings() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return usePermissionProtectedMutation<any, Error, BulkClassSubjectMapping>({
    mutationFn: (data) => classSubjectMappingsApi.bulkCreateClassSubjectMappings(data),
    resource: PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSubjectMappings'] });
      showSuccess('Mappings created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create mappings');
    },
  });
}

// Delete class-subject mapping - permission protected
export function useDeleteClassSubjectMapping() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => classSubjectMappingsApi.deleteClassSubjectMapping(id),
    resource: PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSubjectMappings'] });
      showSuccess('Mapping deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete mapping');
    },
  });
}
