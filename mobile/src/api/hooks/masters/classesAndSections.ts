import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { classSectionsApi } from '../../index';

// ─── READ ────────────────────────────────────────────────────────────────────

export function useClassSections() {
  return usePermissionProtectedQuery<any[]>({
    queryKey: ['classSections'],
    queryFn: () => classSectionsApi.getClassSections(),
    resource: PERMISSION_RESOURCES.CLASSES,
    action: 'list',
  });
}

export function useClassList() {
  return usePermissionProtectedQuery<any[]>({
    queryKey: ['classList'],
    queryFn: () => classSectionsApi.getClassList(),
    resource: PERMISSION_RESOURCES.CLASSES,
    action: 'read',
  });
}

export function useSectionList() {
  return usePermissionProtectedQuery<any[]>({
    queryKey: ['sectionList'],
    queryFn: () => classSectionsApi.getSectionList(),
    resource: PERMISSION_RESOURCES.SECTIONS,
    action: 'read',
  });
}

export function useSectionsByClass(classId: string) {
  return usePermissionProtectedQuery<any[]>({
    queryKey: ['sections', classId],
    queryFn: () => classSectionsApi.getSectionsByClass(classId),
    resource: PERMISSION_RESOURCES.SECTIONS,
    action: 'read',
    enabled: !!classId,
  });
}

// ─── CLASS MUTATIONS ─────────────────────────────────────────────────────────

export function useCreateClassSection() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return usePermissionProtectedMutation<any, Error, any>({
    mutationFn: (data) => classSectionsApi.createClassSection(data),
    resource: PERMISSION_RESOURCES.CLASSES,
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

export function useUpdateClass() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return usePermissionProtectedMutation<any, Error, { classId: string; data: { name?: string; short_code?: string; description?: string; is_active?: boolean; academic_year_id?: string } }>({
    mutationFn: ({ classId, data }) => classSectionsApi.updateClassSection(classId, data),
    resource: PERMISSION_RESOURCES.CLASSES,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSections'] });
      showSuccess('Class updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update class');
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (classId) => classSectionsApi.deleteClassSection(classId),
    resource: PERMISSION_RESOURCES.CLASSES,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSections'] });
      showSuccess('Class deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete class');
    },
  });
}

// ─── SECTION MUTATIONS ────────────────────────────────────────────────────────

// Create a new section inside an existing class
export function useCreateSectionForClass() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return usePermissionProtectedMutation<any, Error, { classId: string; data: { name: string; description?: string; is_active?: boolean } }>({
    mutationFn: ({ classId, data }) => classSectionsApi.createSection(classId, data),
    resource: PERMISSION_RESOURCES.SECTIONS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSections'] });
      showSuccess('Section created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create section');
    },
  });
}

// Update a section — sends id in the body to match web behaviour
export function useUpdateSection() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return usePermissionProtectedMutation<any, Error, { sectionId: string; data: { name?: string; is_active?: boolean } }>({
    mutationFn: ({ sectionId, data }) =>
      classSectionsApi.updateSectionDirect(sectionId, { ...data, id: sectionId }),
    resource: PERMISSION_RESOURCES.SECTIONS,
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

// Delete a section — uses direct endpoint (no classId needed), matching web
export function useDeleteSection() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (sectionId) => classSectionsApi.deleteSectionDirect(sectionId),
    resource: PERMISSION_RESOURCES.SECTIONS,
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
