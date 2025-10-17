import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import { PERMISSIONS } from '@/constants/permissions';
import type { HolidayRead, HolidayCreate, HolidayUpdate, HolidayDropdown, PaginatedHolidayResponse } from '@/types/masters/holiday';
import {
  getHolidays,
  getHoliday,
  createHoliday,
  updateHoliday,
  deactivateHoliday,
  activateHoliday,
  getHolidaysDropdown
} from '@/api/masters/holidays';
import { toast } from 'sonner';

export interface HolidayQueryParams {
  skip?: number;
  limit?: number;
  active_only?: boolean;
  academic_year_id?: string;
}

export function useHolidays(params?: HolidayQueryParams) {
  const { checkPermission } = usePermission();
  const hasListPermission = checkPermission('holidays', 'list');

  return useQuery<PaginatedHolidayResponse>({
    queryKey: ['holidays', params],
    queryFn: () => getHolidays(params),
    enabled: hasListPermission,
  });
}

export function useHoliday(holidayId: string) {
  const { checkPermission } = usePermission();
  const hasReadPermission = checkPermission('holidays', 'read');

  return useQuery<HolidayRead>({
    queryKey: ['holiday', holidayId],
    queryFn: () => getHoliday(holidayId),
    enabled: !!holidayId && hasReadPermission,
  });
}

export function useHolidaysDropdown(activeOnly?: boolean) {
  const { checkPermission } = usePermission();
  const hasListPermission = checkPermission('holidays', 'list');

  return useQuery<HolidayDropdown[]>({
    queryKey: ['holidays-dropdown', activeOnly],
    queryFn: () => getHolidaysDropdown(activeOnly),
    enabled: hasListPermission,
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<HolidayRead, Error, HolidayCreate>({
    resource: 'holidays',
    action: 'create',
    mutationFn: createHoliday,
    onSuccess: () => {
      toast.success('Holiday created!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays-dropdown'] });
    },
    onError: () => {
      toast.error('Failed to create holiday');
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<HolidayRead, Error, { holidayId: string; holiday: HolidayUpdate }>({
    resource: 'holidays',
    action: 'update',
    mutationFn: ({ holidayId, holiday }) => updateHoliday(holidayId, holiday),
    onSuccess: () => {
      toast.success('Holiday updated!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays-dropdown'] });
    },
    onError: () => {
      toast.error('Failed to update holiday');
    },
  });
}

export function useDeactivateHoliday() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'holidays',
    action: 'delete',
    mutationFn: deactivateHoliday,
    onSuccess: () => {
      toast.success('Holiday deactivated!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays-dropdown'] });
    },
    onError: () => {
      toast.error('Failed to deactivate holiday');
    },
  });
}

export function useActivateHoliday() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'holidays',
    action: 'update', // Using UPDATE permission for activation as it's a modification
    mutationFn: activateHoliday,
    onSuccess: () => {
      toast.success('Holiday activated!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['holidays-dropdown'] });
    },
    onError: () => {
      toast.error('Failed to activate holiday');
    },
  });
}