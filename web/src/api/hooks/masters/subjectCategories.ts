import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { SubjectCategory, SubjectCategoryInput } from '@/types/masters/subject';
import { fetchSubjectCategories, fetchSubjectCategoryById, createSubjectCategory, updateSubjectCategory, deleteSubjectCategory, fetchPaginatedSubjectCategories } from '@/api/masters/subjectCategories';
import { toast } from 'sonner';

export function useSubjectCategories(params?: { active_only?: boolean }) {
  return useQuery<SubjectCategory[]>({
    queryKey: ['subject-categories', params],
    queryFn: async () => {
      const response = await fetchSubjectCategories(0, 1000, params); // Fetch all for non-paginated use
      return response.items;
    },
  });
}

export function useSubjectCategoriesPaginated(page: number, pageSize: number, params?: { active_only?: boolean }) {
  return useQuery({
    queryKey: ['subject-categories', 'paginated', page, pageSize, params],
    queryFn: async () => {
      const response = await fetchPaginatedSubjectCategories(page * pageSize, pageSize, params);
      return {
        data: response.data,
        total: response.total,
        hasMore: response.hasMore,
      };
    },
  });
}

export function useSubjectCategory(id: string) {
  return useQuery<SubjectCategory>({
    queryKey: ['subject-category', id],
    queryFn: () => fetchSubjectCategoryById(id),
    enabled: !!id,
  });
}

export function useCreateSubjectCategory() {
  const queryClient = useQueryClient();
  return useMutation<SubjectCategory, Error, SubjectCategoryInput>({
    mutationFn: createSubjectCategory,
    onSuccess: () => {
      toast.success('Subject category created successfully!');
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] });
    },
    onError: (error) => {
      toast.error(`Failed to create subject category: ${error.message}`);
    },
  });
}

export function useUpdateSubjectCategory() {
  const queryClient = useQueryClient();
  return useMutation<SubjectCategory, Error, { id: string; category: SubjectCategoryInput }>({
    mutationFn: updateSubjectCategory,
    onSuccess: () => {
      toast.success('Subject category updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] });
    },
    onError: (error) => {
      toast.error(`Failed to update subject category: ${error.message}`);
    },
  });
}

export function useDeleteSubjectCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteSubjectCategory,
    onSuccess: () => {
      toast.success('Subject category deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete subject category: ${error.message}`);
    },
  });
}

export function useSubjectCategoriesDropdown(params?: { active_only?: boolean }) {
  return useQuery<SubjectCategory[]>({
    queryKey: ['subject-categories-dropdown', params],
    queryFn: async () => {
      const response = await fetchSubjectCategories(0, 1000, params); // Fetch all for dropdown
      return response.items;
    },
  });
}

export function useSubjectCategoriesInfinite(params?: { active_only?: boolean }) {
  return useInfiniteQuery({
    queryKey: ['subject-categories-infinite', params],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      const response = await fetchPaginatedSubjectCategories(pageParam, 20, params);
      return {
        data: response.data,
        hasNextPage: response.hasMore,
        nextCursor: pageParam + 20,
        total: response.total
      };
    },
    getNextPageParam: (lastPage: { hasNextPage: boolean; nextCursor: number }) => {
      return lastPage.hasNextPage ? lastPage.nextCursor : undefined;
    },
    initialPageParam: 0,
  });
}