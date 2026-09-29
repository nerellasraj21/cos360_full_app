import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { castesApi } from '@/api/masters/castes';
import { toast } from 'sonner';
import type { CasteDropdownOption, SubCasteDropdownOption, Caste, SubCaste } from '@/types/masters';

export const casteKeys = {
  all: ['castes'] as const,
  dropdown: () => [...casteKeys.all, 'dropdown'] as const,
  list: () => [...casteKeys.all, 'list'] as const,
  detail: (id: string) => [...casteKeys.all, id] as const,
  subCastes: (casteId: string) => [...casteKeys.all, casteId, 'sub-castes'] as const,
  subCasteDropdown: (casteId: string) => [
    ...casteKeys.all,
    casteId,
    'sub-castes',
    'dropdown',
  ] as const,
};

// Dropdown hooks (for admission form)
export const useCastesDropdown = (activeOnly: boolean = true) => {
  return useQuery<CasteDropdownOption[]>({
    queryKey: [...casteKeys.dropdown(), activeOnly],
    queryFn: () => castesApi.getCastesDropdown(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSubCastesDropdown = (casteId: string | undefined, activeOnly: boolean = true) => {
  return useQuery<SubCasteDropdownOption[]>({
    queryKey: [...casteKeys.subCasteDropdown(casteId || ''), activeOnly],
    queryFn: () => castesApi.getSubCastesDropdown(casteId!, activeOnly),
    enabled: !!casteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// CRUD hooks (for master data pages)
export const useCastes = (skip: number = 0, limit: number = 20, activeOnly: boolean = false) => {
  return useQuery<Caste[]>({
    queryKey: [...casteKeys.list(), skip, limit, activeOnly],
    queryFn: () => castesApi.getCastes(skip, limit, activeOnly),
  });
};

export const useCaste = (id: string) => {
  return useQuery<Caste>({
    queryKey: casteKeys.detail(id),
    queryFn: () => castesApi.getCaste(id),
    enabled: !!id,
  });
};

export const useCreateCaste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: castesApi.createCaste,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casteKeys.all });
      toast.success('Caste created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create caste');
    },
  });
};

export const useUpdateCaste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => castesApi.updateCaste(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casteKeys.all });
      toast.success('Caste updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update caste');
    },
  });
};

export const useDeleteCaste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: castesApi.deleteCaste,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casteKeys.all });
      toast.success('Caste deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete caste');
    },
  });
};

// Sub-caste hooks
export const useSubCastes = (casteId: string, activeOnly: boolean = false) => {
  return useQuery<SubCaste[]>({
    queryKey: [...casteKeys.subCastes(casteId), activeOnly],
    queryFn: () => castesApi.getSubCastes(casteId, activeOnly),
    enabled: !!casteId,
  });
};

export const useCreateSubCaste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: castesApi.createSubCaste,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casteKeys.all });
      toast.success('Sub-caste created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create sub-caste');
    },
  });
};

export const useUpdateSubCaste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => castesApi.updateSubCaste(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casteKeys.all });
      toast.success('Sub-caste updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update sub-caste');
    },
  });
};

export const useDeleteSubCaste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: castesApi.deleteSubCaste,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: casteKeys.all });
      toast.success('Sub-caste deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete sub-caste');
    },
  });
};
