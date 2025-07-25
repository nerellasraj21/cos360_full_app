import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrips, fetchTripById, createTrip, updateTrip, deleteTrip } from '@/api/masters/trips';
import type { Trip, TripInput } from '@/types/masters/trip';
import { toast } from 'sonner';

export function useTrips() {
    return useQuery<Trip[]>({
        queryKey: ['trips'],
        queryFn: fetchTrips,
    });
}

export function useCreateTrip() {
    const queryClient = useQueryClient();
    return useMutation<Trip, Error, TripInput>({
        mutationFn: createTrip,
        onSuccess: () => {
            toast.success('Trip created!');
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
        onError: () => {
            toast.error('Failed to create trip');
        },
    });
}

export function useUpdateTrip() {
    const queryClient = useQueryClient();
    return useMutation<Trip, Error, { id: number; trip: TripInput }>({
        mutationFn: ({ id, trip }) => updateTrip(id, trip),
        onSuccess: () => {
            toast.success('Trip updated!');
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
        onError: () => {
            toast.error('Failed to update trip');
        },
    });
}

export function useDeleteTrip() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, number>({
        mutationFn: deleteTrip,
        onSuccess: () => {
            toast.success('Trip deleted!');
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
        onError: () => {
            toast.error('Failed to delete trip');
        },
    });
} 