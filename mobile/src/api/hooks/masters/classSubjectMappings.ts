import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { classSubjectMappingsApi } from '../../index';
import type { ClassSubjectMapping, ClassSubjectMappingCreate, ClassSubjectMappingBulkCreate } from '../../masters';

// Get all class-subject mappings - permission protected
export function useClassSubjectMappings(academicYearId?: string) {
  return useMastersQuery<ClassSubjectMapping[]>({
    queryKey: ['classSubjectMappings', academicYearId],
    queryFn: () => classSubjectMappingsApi.getClassSubjectMappings(academicYearId),
    resource: PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS,
    action: 'list',
  });
}

// Get mappings by class - permission protected
export function useClassSubjectMappingsByClass(classId: string, academicYearId?: string) {
  return useMastersQuery<ClassSubjectMapping[]>({
    queryKey: ['classSubjectMappings', 'byClass', classId, academicYearId],
    queryFn: () => classSubjectMappingsApi.getMappingsByClass(classId, academicYearId),
    resource: PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS,
    action: 'list',
    enabled: !!classId,
  });
}

// Create class-subject mapping - permission protected
export function useCreateClassSubjectMapping() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

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
  const { showSuccess, showError } = useToastContext();

  return usePermissionProtectedMutation<any, Error, ClassSubjectMappingBulkCreate>({
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

// Update class-subject mapping - permission protected
export function useUpdateClassSubjectMapping() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return usePermissionProtectedMutation<ClassSubjectMapping, Error, { id: string; data: Partial<ClassSubjectMapping> }>({
    mutationFn: ({ id, data }) => classSubjectMappingsApi.updateClassSubjectMapping(id, data),
    resource: PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSubjectMappings'] });
      showSuccess('Mapping updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update mapping');
    },
  });
}

// Delete class-subject mapping - permission protected
export function useDeleteClassSubjectMapping() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

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
