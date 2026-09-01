import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { useMastersQuery } from './useMastersQuery';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { transportPricingApi, TransportPricing, TransportPricingCreate, TransportPricingUpdate } from '../../index';

export function useTransportPricing(params?: { vehicle_id?: string; billing_cycle?: string }) {
  return useMastersQuery<TransportPricing[]>({
    queryKey: ['transportPricing', params],
    queryFn: () => transportPricingApi.list(params),
    resource: PERMISSION_RESOURCES.TRANSPORT_PRICING,
    action: 'list',
  });
}

export function useTransportPricingDropdown(params?: { vehicle_id?: string }) {
  return useQuery<Array<{ id: string; cycle_name: string; amount: number }>>({
    queryKey: ['transportPricingDropdown', params],
    queryFn: () => transportPricingApi.getDropdown(params),
  });
}

export function useTransportPricingById(id: string) {
  return useMastersQuery<TransportPricing>({
    queryKey: ['transportPricing', id],
    queryFn: () => transportPricingApi.getById(id),
    resource: PERMISSION_RESOURCES.TRANSPORT_PRICING,
    action: 'read',
    enabled: !!id,
  });
}

export function useCreateTransportPricing() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<TransportPricing, Error, TransportPricingCreate>({
    mutationFn: (data) => transportPricingApi.create(data),
    resource: PERMISSION_RESOURCES.TRANSPORT_PRICING,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportPricing'] });
      showSuccess('Transport pricing created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create transport pricing');
    },
  });
}

export function useUpdateTransportPricing() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<TransportPricing, Error, { id: string; data: TransportPricingUpdate }>({
    mutationFn: ({ id, data }) => transportPricingApi.update(id, data),
    resource: PERMISSION_RESOURCES.TRANSPORT_PRICING,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportPricing'] });
      showSuccess('Transport pricing updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update transport pricing');
    },
  });
}

export function useDeleteTransportPricing() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => transportPricingApi.delete(id),
    resource: PERMISSION_RESOURCES.TRANSPORT_PRICING,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportPricing'] });
      showSuccess('Transport pricing deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete transport pricing');
    },
  });
}
