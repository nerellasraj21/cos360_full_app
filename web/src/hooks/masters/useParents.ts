import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parentsApi } from '@/api/masters/parents';
import type {
  Parent,
  ParentCreateRequest,
  ParentUpdateRequest,
  ParentListResponse,
  StudentParentLink,
  StudentParentLinkInput
} from '@/types/masters/parent';

// Query keys for parents
export const parentKeys = {
  all: ['parents'] as const,
  lists: () => [...parentKeys.all, 'list'] as const,
  list: (params?: any) => [...parentKeys.lists(), params] as const,
  details: () => [...parentKeys.all, 'detail'] as const,
  detail: (id: string) => [...parentKeys.details(), id] as const,
  students: (parentId: string) => [...parentKeys.detail(parentId), 'students'] as const,
};

// Get all parents
export function useParents(params?: {
  skip?: number;
  limit?: number;
}) {
  return useQuery<ParentListResponse>({
    queryKey: parentKeys.list(params),
    queryFn: () => parentsApi.getAllParents(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get single parent by ID
export function useParent(id: string) {
  return useQuery<Parent>({
    queryKey: parentKeys.detail(id),
    queryFn: () => parentsApi.getParentById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Get parent's students
export function useParentStudents(parentId: string) {
  return useQuery<StudentParentLink[]>({
    queryKey: parentKeys.students(parentId),
    queryFn: () => parentsApi.getParentStudents(parentId),
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000,
  });
}

// Create parent mutation
export function useCreateParent() {
  const queryClient = useQueryClient();

  return useMutation<Parent, Error, ParentCreateRequest>({
    mutationFn: parentsApi.createParent,
    onSuccess: (data) => {
      // Invalidate and refetch parents list
      queryClient.invalidateQueries({ queryKey: parentKeys.lists() });

      // Add the new parent to the cache
      queryClient.setQueryData(parentKeys.detail(data.id), data);

      toast.success('Parent profile created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create parent profile: ${error.message}`);
    },
  });
}

// Update parent mutation
export function useUpdateParent() {
  const queryClient = useQueryClient();

  return useMutation<Parent, Error, { id: string; data: ParentUpdateRequest }>({
    mutationFn: ({ id, data }) => parentsApi.updateParent(id, data),
    onSuccess: (data) => {
      // Update the specific parent in cache
      queryClient.setQueryData(parentKeys.detail(data.id), data);

      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: parentKeys.lists() });

      toast.success('Parent profile updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update parent profile: ${error.message}`);
    },
  });
}

// Delete parent mutation
export function useDeleteParent() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: parentsApi.deleteParent,
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: parentKeys.detail(id) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: parentKeys.lists() });

      toast.success('Parent profile deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete parent profile: ${error.message}`);
    },
  });
}

// Create student-parent link mutation
export function useCreateStudentParentLink() {
  const queryClient = useQueryClient();

  return useMutation<StudentParentLink, Error, StudentParentLinkInput>({
    mutationFn: parentsApi.createStudentParentLink,
    onSuccess: () => {
      // Invalidate parent and student queries to refresh relationships
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      toast.success('Student-parent association created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create student-parent association: ${error.message}`);
    },
  });
}

// Delete student-parent link mutation
export function useDeleteStudentParentLink() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: parentsApi.deleteStudentParentLink,
    onSuccess: () => {
      // Invalidate parent and student queries to refresh relationships
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      toast.success('Student-parent association removed successfully');
    },
    onError: (error) => {
      toast.error(`Failed to remove student-parent association: ${error.message}`);
    },
  });
}