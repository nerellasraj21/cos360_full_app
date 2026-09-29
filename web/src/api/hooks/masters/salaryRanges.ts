import { useQuery } from '@tanstack/react-query';
import { salaryRangesApi } from '@/api/masters/salaryRanges';
import type { SalaryRange } from '@/types/masters';

export const salaryRangeKeys = {
  all: ['salary-ranges'] as const,
  dropdown: () => [...salaryRangeKeys.all, 'dropdown'] as const,
};

export const useSalaryRanges = () => {
  return useQuery<SalaryRange[]>({
    queryKey: salaryRangeKeys.dropdown(),
    queryFn: () => salaryRangesApi.getDropdownOptions(),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};
