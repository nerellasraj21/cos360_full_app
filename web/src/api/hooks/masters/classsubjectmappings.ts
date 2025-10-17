import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ClassSubjectMapping,
  ClassSubjectMappingInput,
  ClassSubjectMappingUpdate,
  ClassSubjectMappingDropdown,
  ClassSubjectMappingBulkCreate,
  ClassSubjectMappingBulkResponse
} from '@/types/masters';
import {
  fetchClassSubjectMappings,
  fetchMappingsByClass,
  fetchMappingsDropdown,
  fetchMappingById,
  createClassSubjectMapping,
  createBulkClassSubjectMappings,
  updateClassSubjectMapping,
  deleteClassSubjectMapping
} from '@/api/masters/classsubjectmappings';
import { toast } from 'sonner';

export function useClassSubjectMappings(params?: {
  skip?: number;
  limit?: number;
  academic_year_id?: string;
  active_only?: boolean;
}) {
  return useQuery({
    queryKey: ['class-subject-mappings', params],
    queryFn: () => fetchClassSubjectMappings(params),
  });
}

export function useMappingsByClass(classId: string, params?: {
  academic_year_id?: string;
  active_only?: boolean;
}) {
  return useQuery({
    queryKey: ['class-subject-mappings', 'by-class', classId, params],
    queryFn: () => fetchMappingsByClass(classId, params),
    enabled: !!classId,
  });
}

export function useMappingsDropdown(params?: {
  class_id?: string;
  academic_year_id?: string;
}) {
  return useQuery<ClassSubjectMappingDropdown[]>({
    queryKey: ['class-subject-mappings', 'dropdown', params],
    queryFn: () => fetchMappingsDropdown(params),
  });
}

export function useClassSubjectMapping(id: string) {
  return useQuery<ClassSubjectMapping>({
    queryKey: ['class-subject-mapping', id],
    queryFn: () => fetchMappingById(id),
    enabled: !!id,
  });
}

export function useCreateClassSubjectMapping() {
  const queryClient = useQueryClient();
  return useMutation<ClassSubjectMapping, Error, ClassSubjectMappingInput>({
    mutationFn: createClassSubjectMapping,
    onSuccess: () => {
      toast.success('Class-subject mapping created successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-subject-mappings'] });
    },
    onError: (error) => {
      toast.error(`Failed to create mapping: ${error.message}`);
    },
  });
}

export function useCreateBulkClassSubjectMappings() {
  const queryClient = useQueryClient();
  return useMutation<ClassSubjectMappingBulkResponse, Error, ClassSubjectMappingBulkCreate>({
    mutationFn: createBulkClassSubjectMappings,
    onSuccess: (data) => {
      toast.success(data.message || 'Bulk mappings created successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-subject-mappings'] });
    },
    onError: (error) => {
      toast.error(`Failed to create bulk mappings: ${error.message}`);
    },
  });
}

export function useUpdateClassSubjectMapping() {
  const queryClient = useQueryClient();
  return useMutation<ClassSubjectMapping, Error, { id: string; mapping: ClassSubjectMappingUpdate }>({
    mutationFn: ({ id, mapping }) => updateClassSubjectMapping(id, mapping),
    onSuccess: () => {
      toast.success('Class-subject mapping updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-subject-mappings'] });
    },
    onError: (error) => {
      toast.error(`Failed to update mapping: ${error.message}`);
    },
  });
}

export function useDeleteClassSubjectMapping() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteClassSubjectMapping,
    onSuccess: () => {
      toast.success('Class-subject mapping deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['class-subject-mappings'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete mapping: ${error.message}`);
    },
  });
}

export function useClassSubjectMappingsPaginated(page: number, pageSize: number, academicYearId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['class-subject-mappings', 'paginated', page, pageSize, academicYearId],
    queryFn: async () => {
      const response = await fetchClassSubjectMappings({
        skip: page * pageSize,
        limit: pageSize,
        active_only: true,
        academic_year_id: academicYearId
      });

      return {
        data: response.items,
        total: response.total,
        hasMore: response.total ? (page + 1) * pageSize < response.total : false,
      };
    },
    enabled,
  });
}