import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { AcademicYear, AcademicYearInput } from '@/types/masters/academicyear';
import { fetchAcademicYears, fetchAcademicYearById, createAcademicYear, updateAcademicYear, deleteAcademicYear, fetchPaginatedAcademicYears } from '@/api/masters/academicyears';
import { toast } from 'sonner';

export function useAcademicYears() {
  return useQuery<AcademicYear[]>({
    queryKey: ['academicYears'],
    queryFn: fetchAcademicYears,
  });
}

export function useAcademicYear(id: number) {
  return useQuery<AcademicYear>({
    queryKey: ['academicYear', id],
    queryFn: () => fetchAcademicYearById(id),
    enabled: !!id,
  });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation<AcademicYear, Error, AcademicYearInput>({
    mutationFn: createAcademicYear,
    onSuccess: () => {
      toast.success('Academic year created!');
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
    },
    onError: () => {
      toast.error('Failed to create academic year');
    },
  });
}

export function useUpdateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation<AcademicYear, Error, { id: number; academicYear: AcademicYearInput }>({
    mutationFn: updateAcademicYear,
    onSuccess: () => {
      toast.success('Academic year updated!');
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
    },
    onError: () => {
      toast.error('Failed to update academic year');
    },
  });
}

export function useDeleteAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteAcademicYear,
    onSuccess: () => {
      toast.success('Academic year deleted!');
      queryClient.invalidateQueries({ queryKey: ['academicYears'] });
    },
    onError: () => {
      toast.error('Failed to delete academic year');
    },
  });
}

export function usePaginatedAcademicYears(queryKey = ['academicYears'], PAGE_SIZE = 10) {
  return useInfiniteQuery<AcademicYearsPageResult, Error>({
    queryKey,
    queryFn: async (context) => {
      const pageParam = (context.pageParam ?? 0) as number;
      return fetchPaginatedAcademicYears(pageParam, PAGE_SIZE);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: AcademicYearsPageResult, allPages: AcademicYearsPageResult[]) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
  });
}

export function useAcademicYearsPaginated(page: number, pageSize: number) {
  return useQuery<{ total: number; data: AcademicYear[]; hasMore: boolean }, Error>({
    queryKey: ['academicYears', page, pageSize],
    queryFn: async () => {
      const result = await fetchPaginatedAcademicYears(page * pageSize, pageSize);
      // Add total count once we recieve it from  backend supports it, here hardcoded for demo
      return { ...result, total: 15 };
    },
    // keepPreviousData: true, 
  });
}

type AcademicYearsPageResult = { data: AcademicYear[]; hasMore: boolean };

