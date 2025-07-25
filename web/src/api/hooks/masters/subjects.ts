import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { Subject, SubjectInput } from '@/types/masters';
import { fetchSubjects,fetchSubjectById,createSubject,updateSubject,deleteSubject, fetchPaginatedSubjects, fetchSubjectsPaginated } from '@/api/masters/subjects';
import { toast } from 'sonner';

export function useSubjects() {
    return useQuery<Subject[]>({
      queryKey: ['subjects'],
      queryFn: fetchSubjects,
    });
  }
  
  export function useSubject(id: number) {
    return useQuery<Subject>({
      queryKey: ['subject', id],
      queryFn: () => fetchSubjectById(id),
      enabled: !!id,
    });
  }
  
  export function useCreateSubject() {
    const queryClient = useQueryClient();
    return useMutation<Subject, Error, SubjectInput>({
      mutationFn: createSubject,
      onSuccess: () => {
        toast.success('Subject created!');
        queryClient.invalidateQueries({ queryKey: ['subjects'] });
      },
      onError: () => {
        toast.error('Failed to create subject');
      },
    });
  }
  
  export function useUpdateSubject() {
    const queryClient = useQueryClient();
    return useMutation<Subject, Error, { id: number; subject: SubjectInput }>({
      mutationFn: updateSubject,
      onSuccess: () => {
        toast.success('Subject updated!');
        queryClient.invalidateQueries({ queryKey: ['subjects'] });
      },
      onError: () => {
        toast.error('Failed to update subject');
      },
    });
  }
  
  export function useDeleteSubject() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, number>({
      mutationFn: deleteSubject,
      onSuccess: () => {
        toast.success('Subject deleted!');
        queryClient.invalidateQueries({ queryKey: ['subjects'] });
      },
      onError: () => {
        toast.error('Failed to delete subject');
      },
    });
  }
  
  export function usePaginatedSubjects(queryKey = ['subjects'], PAGE_SIZE = 10) {
    return useInfiniteQuery<{ data: Subject[]; hasMore: boolean }, Error>({
      queryKey,
      queryFn: async (context) => {
        const pageParam = (context.pageParam ?? 0) as number;
        return fetchPaginatedSubjects(pageParam, PAGE_SIZE);
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
    });
  }
  
  export function useSubjectsPaginated(page: number, pageSize: number, academicYearId?: number) {
    return useQuery<{ total: number; data: Subject[]; hasMore: boolean }, Error>({
      queryKey: ['subjects', page, pageSize, academicYearId],
      queryFn: async () => fetchSubjectsPaginated(page, pageSize, academicYearId),
      // keepPreviousData: true,
    });
  }
  