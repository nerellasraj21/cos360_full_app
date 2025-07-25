import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    fetchStudentTrips, 
    fetchStudentTripById,
    createStudentTrip, 
    updateStudentTrip,
    patchStudentTrip, 
    deleteStudentTrip 
} from '@/api/masters/studentTrips';
import type { StudentTrip, StudentTripInput, StudentTripUpdateInput } from '@/types/masters/studentTrips';
import { toast } from 'sonner';

export function useStudentTrips() {
    return useQuery<StudentTrip[]>({
        queryKey: ['student-trips'],
        queryFn: fetchStudentTrips,
    });
}

export function useStudentTripById(id: number) {
    return useQuery<StudentTrip>({
        queryKey: ['student-trips', id],
        queryFn: () => fetchStudentTripById(id),
        enabled: !!id,
    });
}

export function useCreateStudentTrip() {
    const queryClient = useQueryClient();
    return useMutation<StudentTrip, Error, StudentTripInput>({
        mutationFn: createStudentTrip,
        onSuccess: () => {
            toast.success('Student trip created!');
            queryClient.invalidateQueries({ queryKey: ['student-trips'] });
        },
        onError: () => {
            toast.error('Failed to create student trip');
        },
    });
}

export function useUpdateStudentTrip() {
    const queryClient = useQueryClient();
    return useMutation<StudentTrip, Error, { id: number; trip: StudentTripInput }>({
        mutationFn: ({ id, trip }) => updateStudentTrip(id, trip),
        onSuccess: () => {
            toast.success('Student trip updated!');
            queryClient.invalidateQueries({ queryKey: ['student-trips'] });
        },
        onError: () => {
            toast.error('Failed to update student trip');
        },
    });
}

export function usePatchStudentTrip() {
    const queryClient = useQueryClient();
    return useMutation<StudentTrip, Error, { id: number; trip: StudentTripUpdateInput }>({
        mutationFn: ({ id, trip }) => patchStudentTrip(id, trip),
        onSuccess: () => {
            toast.success('Student trip updated!');
            queryClient.invalidateQueries({ queryKey: ['student-trips'] });
        },
        onError: () => {
            toast.error('Failed to update student trip');
        },
    });
}

export function useDeleteStudentTrip() {
    const queryClient = useQueryClient();
    return useMutation<string, Error, number>({
        mutationFn: deleteStudentTrip,
        onSuccess: () => {
            toast.success('Student trip deleted!');
            queryClient.invalidateQueries({ queryKey: ['student-trips'] });
        },
        onError: () => {
            toast.error('Failed to delete student trip');
        },
    });
}