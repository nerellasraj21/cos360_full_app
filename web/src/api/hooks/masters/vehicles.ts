import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type { Vehicle, VehicleInput } from '@/types/masters';
import { fetchVehicles, fetchVehicleById, createVehicle, updateVehicle, deleteVehicle, fetchPaginatedVehicles, fetchVehiclesPaginated } from '@/api/masters/vehicles';
import { toast } from 'sonner';

export function useVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
  });
}

export function useVehicle(id: number) {
  return useQuery<Vehicle>({
    queryKey: ['vehicle', id],
    queryFn: () => fetchVehicleById(id),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation<Vehicle, Error, VehicleInput>({
    mutationFn: createVehicle,
    onSuccess: () => {
      toast.success('Vehicle created!');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: () => {
      toast.error('Failed to create vehicle');
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation<Vehicle, Error, { id: number; vehicle: VehicleInput }>({
    mutationFn: updateVehicle,
    onSuccess: () => {
      toast.success('Vehicle updated!');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: () => {
      toast.error('Failed to update vehicle');
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      toast.success('Vehicle deleted!');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: () => {
      toast.error('Failed to delete vehicle');
    },
  });
}

export function usePaginatedVehicles(queryKey = ['vehicles'], PAGE_SIZE = 10) {
  return useInfiniteQuery<{ data: Vehicle[]; hasMore: boolean }, Error>({
    queryKey,
    queryFn: async (context) => {
      const pageParam = (context.pageParam ?? 0) as number;
      return fetchPaginatedVehicles(pageParam, PAGE_SIZE);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
  });
}

export function useVehiclesPaginated(page: number, pageSize: number) {
  return useQuery<{ total: number; data: Vehicle[]; hasMore: boolean }, Error>({
    queryKey: ['vehicles', page, pageSize],
    queryFn: async () => fetchVehiclesPaginated(page, pageSize),
    // keepPreviousData: true, 
  });
} 