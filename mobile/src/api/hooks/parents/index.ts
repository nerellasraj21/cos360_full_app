import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  usePermissionProtectedQuery,
  usePermissionProtectedMutation,
  usePermissionProtectedListQuery,
  usePermissionProtectedCreateMutation,
  usePermissionProtectedUpdateMutation,
  usePermissionProtectedDeleteMutation
} from '@/hooks/use-permission-protected-api';
import { parentApi } from '@/src/api/staff';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import type { Parent, ParentInput } from '@/src/types/masters/staff';
import { useAuth } from '@/contexts/AuthContext';

// Parent list query hook
export const useParentsQuery = () => {
  return usePermissionProtectedListQuery<Parent[]>(
    PERMISSION_RESOURCES.PARENT_PROFILE,
    ['parents'],
    () => parentApi.getParents(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    }
  );
};

// Parent by ID query hook
export const useParentQuery = (id: string, enabled: boolean = true) => {
  return usePermissionProtectedQuery<Parent | null>({
    resource: PERMISSION_RESOURCES.PARENT_PROFILE,
    action: 'read',
    queryKey: ['parents', id],
    queryFn: () => parentApi.getParentById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Parent creation mutation hook
export const useCreateParentMutation = () => {
  const queryClient = useQueryClient();
  
  return usePermissionProtectedCreateMutation<Parent, Error, ParentInput>(
    PERMISSION_RESOURCES.PARENT_PROFILE,
    (data: ParentInput) => parentApi.createParent(data),
    {
      onSuccess: (newParent) => {
        // Invalidate and refetch parents list
        queryClient.invalidateQueries({ queryKey: ['parents'] });
        
        // Add the new parent to the cache
        queryClient.setQueryData(['parents', newParent.id], newParent);
      },
      onError: (error) => {
        console.error('Failed to create parent:', error);
      },
    }
  );
};

// Parent update mutation hook
export const useUpdateParentMutation = () => {
  const queryClient = useQueryClient();
  
  return usePermissionProtectedUpdateMutation<Parent, Error, { id: string; data: Partial<ParentInput> }>(
    PERMISSION_RESOURCES.PARENT_PROFILE,
    ({ id, data }) => parentApi.updateParent(id, data),
    {
      onSuccess: (updatedParent, { id }) => {
        // Update the specific parent in cache
        queryClient.setQueryData(['parents', id], updatedParent);
        
        // Invalidate parents list to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['parents'] });
      },
      onError: (error) => {
        console.error('Failed to update parent:', error);
      },
    }
  );
};

// Parent deletion mutation hook
export const useDeleteParentMutation = () => {
  const queryClient = useQueryClient();
  
  return usePermissionProtectedDeleteMutation<void, Error, string>(
    PERMISSION_RESOURCES.PARENT_PROFILE,
    (id: string) => parentApi.deleteParent(id),
    {
      onSuccess: (_, deletedId) => {
        // Remove the parent from cache
        queryClient.removeQueries({ queryKey: ['parents', deletedId] });
        
        // Invalidate parents list
        queryClient.invalidateQueries({ queryKey: ['parents'] });
      },
      onError: (error) => {
        console.error('Failed to delete parent:', error);
      },
    }
  );
};

// Student-context aware parent hooks for parent users
export const useParentStudentContextQuery = () => {
  const { selectedStudent, availableStudents } = useAuth();
  
  return usePermissionProtectedQuery<{
    selectedStudent: any;
    availableStudents: any[];
  }>({
    resource: PERMISSION_RESOURCES.PARENT_PROFILE,
    action: 'read_own',
    queryKey: ['parent-student-context', selectedStudent?.id],
    queryFn: async () => {
      return {
        selectedStudent,
        availableStudents,
      };
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
};

// Bulk operations for parent management
export const useBulkParentOperations = () => {
  const queryClient = useQueryClient();
  
  const bulkDeleteMutation = usePermissionProtectedMutation<void, Error, string[]>({
    resource: PERMISSION_RESOURCES.PARENT_PROFILE,
    action: 'delete',
    mutationFn: async (parentIds: string[]) => {
      await Promise.all(parentIds.map(id => parentApi.deleteParent(id)));
    },
    onSuccess: (_, deletedIds) => {
      // Remove all deleted parents from cache
      deletedIds.forEach(id => {
        queryClient.removeQueries({ queryKey: ['parents', id] });
      });
      
      // Invalidate parents list
      queryClient.invalidateQueries({ queryKey: ['parents'] });
    },
  });

  return {
    bulkDelete: bulkDeleteMutation,
  };
};

// Export all hooks
export {
  useParentsQuery as default,
};