import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import type {
  TransportPricing,
  TransportPricingInput,
  TransportPricingDropdown,
} from '@/types/masters/transportPricing';
import {
  fetchTransportPricings,
  fetchTransportPricingById,
  createTransportPricing,
  updateTransportPricing,
  deleteTransportPricing,
  fetchTransportPricingDropdown,
} from '@/api/masters/transportPricing';
import { toast } from 'sonner';

export const transportPricingKeys = {
  all: ['transportPricings'] as const,
  lists: () => [...transportPricingKeys.all, 'list'] as const,
  list: (vehicleId?: string, billingCycle?: string) => [...transportPricingKeys.lists(), { vehicleId, billingCycle }] as const,
  details: () => [...transportPricingKeys.all, 'detail'] as const,
  detail: (id: string) => [...transportPricingKeys.details(), id] as const,
  dropdown: (vehicleId?: string) => [...transportPricingKeys.all, 'dropdown', { vehicleId }] as const,
};

export function useTransportPricings(vehicleId?: string, billingCycle?: string) {
  const { checkPermission } = usePermission();
  const hasListPermission = checkPermission('transport_pricing', 'list');

  return useQuery<TransportPricing[]>({
    queryKey: transportPricingKeys.list(vehicleId, billingCycle),
    queryFn: () => fetchTransportPricings(vehicleId, billingCycle),
    enabled: hasListPermission,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTransportPricing(id: string) {
  const { checkPermission } = usePermission();
  const hasReadPermission = checkPermission('transport_pricing', 'read');

  return useQuery<TransportPricing>({
    queryKey: transportPricingKeys.detail(id),
    queryFn: () => fetchTransportPricingById(id),
    enabled: !!id && hasReadPermission,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTransportPricingDropdown(vehicleId?: string) {
  return useQuery<TransportPricingDropdown[]>({
    queryKey: transportPricingKeys.dropdown(vehicleId),
    queryFn: () => fetchTransportPricingDropdown(vehicleId!),
    enabled: !!vehicleId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTransportPricing() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<TransportPricing, Error, TransportPricingInput>({
    resource: 'transport_pricing',
    action: 'create',
    mutationFn: createTransportPricing,
    onSuccess: (data) => {
      toast.success(`Pricing "${data.cycle_name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: transportPricingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transportPricingKeys.dropdown() });
    },
    onError: (error) => {
      toast.error(`Failed to create pricing: ${error.message}`);
    },
  });
}

export function useUpdateTransportPricing() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<TransportPricing, Error, { id: string; pricing: TransportPricingInput }>({
    resource: 'transport_pricing',
    action: 'update',
    mutationFn: ({ id, pricing }) => updateTransportPricing(id, pricing),
    onSuccess: (data) => {
      toast.success(`Pricing "${data.cycle_name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: transportPricingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transportPricingKeys.details() });
      queryClient.invalidateQueries({ queryKey: transportPricingKeys.dropdown() });
    },
    onError: (error) => {
      toast.error(`Failed to update pricing: ${error.message}`);
    },
  });
}

export function useDeleteTransportPricing() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'transport_pricing',
    action: 'delete',
    mutationFn: deleteTransportPricing,
    onSuccess: () => {
      toast.success('Pricing deleted successfully!');
      queryClient.invalidateQueries({ queryKey: transportPricingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transportPricingKeys.dropdown() });
    },
    onError: (error) => {
      toast.error(`Failed to delete pricing: ${error.message}`);
    },
  });
}
