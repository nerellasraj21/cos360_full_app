import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { Subject, SubjectInput, ClassSubjectMappingBulkCreate, ClassSubjectMappingBulkResponse } from '@/types/masters';
import type { SubjectDropdown } from '@/api/masters/subjects';
import { fetchSubjects, fetchSubjectById, createSubject, updateSubject, deleteSubject, createBulkClassSubjectMappings, fetchSubjectsDropdown } from '@/api/masters/subjects';
import { toast } from 'sonner';
import { useAcademicYearStore } from '@/lib/academicYearStore';

export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await fetchSubjects();
      return response.items;
    },
  });
}

export function useSubject(id: string) {
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
      toast.success('Subject created successfully!');
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (error) => {
      toast.error(`Failed to create subject: ${error.message}`);
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation<Subject, Error, { id: string; subject: SubjectInput }>({
    mutationFn: updateSubject,
    onSuccess: () => {
      toast.success('Subject updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (error) => {
      toast.error(`Failed to update subject: ${error.message}`);
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteSubject,
    onSuccess: () => {
      toast.success('Subject deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete subject: ${error.message}`);
    },
  });
}

export function useCreateBulkClassSubjectMappings() {
  const queryClient = useQueryClient();
  return useMutation<ClassSubjectMappingBulkResponse, Error, ClassSubjectMappingBulkCreate>({
    mutationFn: createBulkClassSubjectMappings,
    onSuccess: (data) => {
      toast.success(data.message || 'Bulk class-subject mappings created successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-subject-mappings'] });
    },
    onError: (error) => {
      toast.error(`Failed to create bulk mappings: ${error.message}`);
    },
  });
}

export function useSubjectsPaginated(page: number, pageSize: number, academicYearId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['subjects', 'paginated', page, pageSize, academicYearId],
    queryFn: async () => {
      const response = await fetchSubjects({
        skip: page * pageSize,
        limit: pageSize,
        active_only: false,
        academic_year_id: academicYearId
      });

      const total = response.total || response.items.length;
      const start = page * pageSize;
      const pageItems = response.items.length > pageSize
        ? response.items.slice(start, start + pageSize)
        : response.items;

      return {
        data: pageItems,
        total,
        hasMore: (page + 1) * pageSize < total,
      };
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSubjectsDropdown(params?: {
  category_id?: string;
  mandatory_only?: boolean;
  active_only?: boolean;
}) {
  return useQuery<SubjectDropdown[]>({
    queryKey: ['subjects-dropdown', params],
    queryFn: () => fetchSubjectsDropdown(params),
  });
}