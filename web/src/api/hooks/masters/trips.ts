import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllTrips, getTripById, getTripsByVehicle, createTrip, updateTrip, deleteTrip } from '@/api/masters/trips';
import type { TripOut, TripCreate, TripListResponse } from '@/types/masters/trip';
import { toast } from 'sonner';

export function useTrips() {
    return useQuery<TripOut[] | TripListResponse>({
        queryKey: ['trips'],
        queryFn: getAllTrips,
    });
}

export function useTripsByVehicle(vehicleId: string) {
    return useQuery<TripOut[]>({
        queryKey: ['trips', 'by-vehicle', vehicleId],
        queryFn: () => getTripsByVehicle(vehicleId),
        enabled: !!vehicleId,
        staleTime: 30 * 1000,
    });
}

export function useCreateTrip() {
    const queryClient = useQueryClient();
    return useMutation<TripOut, Error, TripCreate>({
        mutationFn: createTrip,
        onSuccess: (data) => {
            toast.success('Trip created!');
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            queryClient.invalidateQueries({ queryKey: ['trips', 'by-vehicle', data.vehicle_id] });
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create trip');
        },
    });
}

export function useUpdateTrip() {
    const queryClient = useQueryClient();
    return useMutation<TripOut, Error, { id: string; trip: TripCreate }>({
        mutationFn: ({ id, trip }) => updateTrip(id, trip),
        onSuccess: () => {
            toast.success('Trip updated!');
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to update trip');
        },
    });
}

export function useDeleteTrip() {
    const queryClient = useQueryClient();
    return useMutation<{ message: string }, Error, string>({
        mutationFn: deleteTrip,
        onSuccess: () => {
            toast.success('Trip deleted!');
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete trip');
        },
    });
}