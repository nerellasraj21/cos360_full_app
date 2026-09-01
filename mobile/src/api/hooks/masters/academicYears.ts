import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { academicYearsApi, AcademicYear } from '../../index';

// Get all academic years - permission protected
export function useAcademicYears() {
  return useMastersQuery<AcademicYear[]>({
    queryKey: ['academicYears'],
    queryFn: () => academicYearsApi.getAcademicYears({ limit: 100 }),
    resource: PERMISSION_RESOURCES.ACADEMIC_YEARS,
    action: 'list',
  });
}

// Get academic years dropdown - permission protected
export function useAcademicYearsDropdown() {
  return useMastersQuery<any[]>({
    queryKey: ['academicYearsDropdown'],
    queryFn: () => academicYearsApi.getAcademicYearsDropdown(),
    resource: PERMISSION_RESOURCES.ACADEMIC_YEARS,
    action: 'read',
  });
}

// Create academic year - permission protected
export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  
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
  const { showSuccess, showError } = useToastContext();
  
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
  const { showSuccess, showError } = useToastContext();

  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => academicYearsApi.deleteAcademicYear(id),
    resource: PERMISSION_RESOURCES.ACADEMIC_YEARS,
    action: 'delete',
    onSuccess: (_data, id) => {
      queryClient.setQueryData<AcademicYear[]>(['academicYears'], (old) =>
        old ? old.filter((y) => y.id !== id) : []
      );
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
      showSuccess('Academic year deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete academic year');
    },
  });
}