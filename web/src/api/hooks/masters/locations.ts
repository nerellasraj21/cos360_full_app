import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsApi } from '@/api/masters/locations';
import { toast } from 'sonner';
import type {
  StateDropdownOption,
  DistrictDropdownOption,
  MandalDropdownOption,
  State,
  District,
  Mandal,
} from '@/types/masters';

export const locationKeys = {
  all: ['locations'] as const,
  states: () => [...locationKeys.all, 'states'] as const,
  statesDropdown: () => [...locationKeys.states(), 'dropdown'] as const,
  statesList: () => [...locationKeys.states(), 'list'] as const,
  stateDetail: (id: string) => [...locationKeys.states(), id] as const,
  districts: (stateId: string) => [...locationKeys.all, 'states', stateId, 'districts'] as const,
  districtsDropdown: (stateId: string) => [...locationKeys.districts(stateId), 'dropdown'] as const,
  districtDetail: (id: string) => [...locationKeys.all, 'districts', id] as const,
  mandals: (districtId: string) => [...locationKeys.all, 'districts', districtId, 'mandals'] as const,
  mandalsDropdown: (districtId: string) => [...locationKeys.mandals(districtId), 'dropdown'] as const,
  mandalDetail: (id: string) => [...locationKeys.all, 'mandals', id] as const,
};

// Dropdown hooks (for admission form)
export const useStatesDropdown = (activeOnly: boolean = true) => {
  return useQuery<StateDropdownOption[]>({
    queryKey: [...locationKeys.statesDropdown(), activeOnly],
    queryFn: () => locationsApi.getStatesDropdown(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDistrictsDropdown = (stateId: string | undefined, activeOnly: boolean = true) => {
  return useQuery<DistrictDropdownOption[]>({
    queryKey: [...locationKeys.districtsDropdown(stateId || ''), activeOnly],
    queryFn: () => locationsApi.getDistrictsDropdown(stateId!, activeOnly),
    enabled: !!stateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useMandalsDropdown = (districtId: string | undefined, activeOnly: boolean = true) => {
  return useQuery<MandalDropdownOption[]>({
    queryKey: [...locationKeys.mandalsDropdown(districtId || ''), activeOnly],
    queryFn: () => locationsApi.getMandalsDropdown(districtId!, activeOnly),
    enabled: !!districtId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// State CRUD hooks (for master data pages)
export const useStates = (skip: number = 0, limit: number = 20, activeOnly: boolean = false) => {
  return useQuery<State[]>({
    queryKey: [...locationKeys.statesList(), skip, limit, activeOnly],
    queryFn: () => locationsApi.getStates(skip, limit, activeOnly),
  });
};

export const useState = (id: string) => {
  return useQuery<State>({
    queryKey: locationKeys.stateDetail(id),
    queryFn: () => locationsApi.getState(id),
    enabled: !!id,
  });
};

export const useCreateState = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.createState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.states() });
      toast.success('State created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create state');
    },
  });
};

export const useUpdateState = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => locationsApi.updateState(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.states() });
      toast.success('State updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update state');
    },
  });
};

export const useDeleteState = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.deleteState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.states() });
      toast.success('State deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete state');
    },
  });
};

// District hooks
export const useDistricts = (stateId: string, activeOnly: boolean = false) => {
  return useQuery<District[]>({
    queryKey: [...locationKeys.districts(stateId), activeOnly],
    queryFn: () => locationsApi.getDistricts(stateId, activeOnly),
    enabled: !!stateId,
  });
};

export const useCreateDistrict = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.createDistrict,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      toast.success('District created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create district');
    },
  });
};

export const useUpdateDistrict = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => locationsApi.updateDistrict(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      toast.success('District updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update district');
    },
  });
};

export const useDeleteDistrict = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.deleteDistrict,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      toast.success('District deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete district');
    },
  });
};

// Mandal hooks
export const useMandals = (districtId: string, activeOnly: boolean = false) => {
  return useQuery<Mandal[]>({
    queryKey: [...locationKeys.mandals(districtId), activeOnly],
    queryFn: () => locationsApi.getMandals(districtId, activeOnly),
    enabled: !!districtId,
  });
};

export const useCreateMandal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.createMandal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      toast.success('Mandal created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create mandal');
    },
  });
};

export const useUpdateMandal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => locationsApi.updateMandal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      toast.success('Mandal updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update mandal');
    },
  });
};

export const useDeleteMandal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationsApi.deleteMandal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.all });
      toast.success('Mandal deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete mandal');
    },
  });
};
