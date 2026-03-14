import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../../components/FeedbackToast';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { academicYearsApi, AcademicYear } from '../../index';

// Get all academic years - permission protected
export function useAcademicYears() {
  return usePermissionProtectedQuery<AcademicYear[]>({
    queryKey: ['academicYears'],
    queryFn: () => academicYearsApi.getAcademicYears(),
    resource: PERMISSION_RESOURCES.ACADEMIC_YEARS,
    action: 'list',
  });
}

// Get academic years dropdown - permission protected
export function useAcademicYearsDropdown() {
  return usePermissionProtectedQuery<any[]>({
    queryKey: ['academicYearsDropdown'],
    queryFn: () => academicYearsApi.getAcademicYearsDropdown(),
    resource: PERMISSION_RESOURCES.ACADEMIC_YEARS,
    action: 'read',
  });
}

// Create academic year - permission protected
export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<AcademicYear, Error, any>({
    mutationFn: (data) => academicYearsApi.createAcademicYear(data),
    resource: PERMISSION_RESOURCES.ACADEMIC_YEARS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
      showSuccess('Academic year created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create academic year');
    },
  });
}

// Update academic year - permission protected
export function useUpdateAcademicYear() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<AcademicYear, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => academicYearsApi.updateAcademicYear(id, data),
    resource: PERMISSION_RESOURCES.ACADEMIC_YEARS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
      showSuccess('Academic year updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update academic year');
    },
  });
}

// Delete academic year - permission protected
export function useDeleteAcademicYear() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => academicYearsApi.deleteAcademicYear(id),
    resource: PERMISSION_RESOURCES.ACADEMIC_YEARS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
      showSuccess('Academic year deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete academic year');
    },
  });
}