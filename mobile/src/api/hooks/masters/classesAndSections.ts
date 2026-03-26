import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../../components/FeedbackToast';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { classSectionsApi } from '../../index';

// Get all class sections - permission protected
export function useClassSections() {
  return usePermissionProtectedQuery<any[]>({
    queryKey: ['classSections'],
    queryFn: () => classSectionsApi.getClassSections(),
    resource: PERMISSION_RESOURCES.CLASSES_SECTIONS,
    action: 'list',
  });
}

// Get class list - permission protected
export function useClassList() {
  return usePermissionProtectedQuery<any[]>({
    queryKey: ['classList'],
    queryFn: () => classSectionsApi.getClassList(),
    resource: PERMISSION_RESOURCES.CLASSES,
    action: 'read',
  });
}

// Get section list - permission protected
export function useSectionList() {
  return usePermissionProtectedQuery<any[]>({
    queryKey: ['sectionList'],
    queryFn: () => classSectionsApi.getSectionList(),
    resource: PERMISSION_RESOURCES.SECTIONS,
    action: 'read',
  });
}

// Get sections by class - permission protected
export function useSectionsByClass(classId: string) {
  return usePermissionProtectedQuery<any[]>({
    queryKey: ['sections', classId],
    queryFn: () => classSectionsApi.getSectionsByClass(classId),
    resource: PERMISSION_RESOURCES.SECTIONS,
    action: 'read',
    enabled: !!classId,
  });
}

// Create class section - permission protected
export function useCreateClassSection() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<any, Error, any>({
    mutationFn: (data) => classSectionsApi.createClassSection(data),
    resource: PERMISSION_RESOURCES.CLASSES_SECTIONS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSections'] });
      showSuccess('Class and sections created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create class and sections');
    },
  });
}

// Update section - permission protected
export function useUpdateSection() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return usePermissionProtectedMutation<any, Error, { classId: string; sectionId: string; data: any }>({
    mutationFn: ({ sectionId, data }) => classSectionsApi.updateSectionDirect(sectionId, data),
    resource: PERMISSION_RESOURCES.CLASSES_SECTIONS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSections'] });
      showSuccess('Section updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update section');
    },
  });
}

// Delete section - permission protected
export function useDeleteSection() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<void, Error, { classId: string; sectionId: string }>({
    mutationFn: ({ classId, sectionId }) => classSectionsApi.deleteSection(classId, sectionId),
    resource: PERMISSION_RESOURCES.CLASSES_SECTIONS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSections'] });
      showSuccess('Section deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete section');
    },
  });
}