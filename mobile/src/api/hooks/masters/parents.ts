import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { parentsApi, SalaryRangeOption } from '../../index';
import type { Parent } from '../../masters';

export function useParents() {
  return useMastersQuery<Parent[]>({
    queryKey: ['parents'],
    queryFn: () => parentsApi.getParents(),
    resource: PERMISSION_RESOURCES.PARENTS,
    action: 'list',
  });
}

export function useParent(id: string) {
  return useMastersQuery<Parent>({
    queryKey: ['parents', id],
    queryFn: () => parentsApi.getParent(id),
    resource: PERMISSION_RESOURCES.PARENTS,
    action: 'read',
    enabled: !!id,
  });
}

export function useSalaryRangesDropdown() {
  return useMastersQuery<SalaryRangeOption[]>({
    queryKey: ['salaryRangesDropdown'],
    queryFn: () => parentsApi.getSalaryRangesDropdown(),
    resource: PERMISSION_RESOURCES.PARENTS,
    action: 'read',
  });
}

export function useUpdateParent() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<Parent, Error, { id: string; data: Partial<Parent> }>({
    mutationFn: ({ id, data }) => parentsApi.updateParent(id, data),
    resource: PERMISSION_RESOURCES.PARENTS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      showSuccess('Parent updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update parent');
    },
  });
}

export function useDeleteParent() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => parentsApi.deleteParent(id),
    resource: PERMISSION_RESOURCES.PARENTS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      showSuccess('Parent deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete parent');
    },
  });
}
