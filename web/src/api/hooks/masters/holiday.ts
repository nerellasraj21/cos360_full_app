import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Holiday, HolidayInput } from '@/types/masters/holiday';
import { fetchHolidays, fetchHolidayById, createHoliday, updateHoliday, deleteHoliday } from '@/api/masters/calendar';
import type { HolidayQueryParams } from '@/api/masters/calendar';
import { toast } from 'sonner';

export function useHolidays(params?: HolidayQueryParams) {
  return useQuery<Holiday[]>({
    queryKey: ['holidays'],
    // queryFn: () => fetchHolidays(params),
    queryFn: () => fetchHolidays(),
  });
}

export function useHoliday(id: number) {
  return useQuery<Holiday>({
    queryKey: ['holiday', id],
    queryFn: () => fetchHolidayById(id),
    enabled: !!id,
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation<Holiday, Error, HolidayInput>({
    mutationFn: createHoliday,
    onSuccess: () => {
      toast.success('Holiday created!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: () => {
      toast.error('Failed to create holiday');
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();
  return useMutation<Holiday, Error, { id: number; holiday: HolidayInput }>({
    mutationFn: updateHoliday,
    onSuccess: () => {
      toast.success('Holiday updated!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: () => {
      toast.error('Failed to update holiday');
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      toast.success('Holiday deleted!');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: () => {
      toast.error('Failed to delete holiday');
    },
  });
} 