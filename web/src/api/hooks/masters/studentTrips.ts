import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import { PERMISSIONS } from '@/constants/permissions';
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
    const { checkPermission } = usePermission();
    const hasListPermission = checkPermission('transport_trips', 'list');

    return useQuery<StudentTrip[]>({
        queryKey: ['student-trips'],
        queryFn: fetchStudentTrips,
        enabled: hasListPermission,
    });
}

export function useStudentTripById(id: string) {
    const { checkPermission } = usePermission();
    const hasReadPermission = checkPermission('transport_trips', 'read');

    return useQuery<StudentTrip>({
        queryKey: ['student-trips', id],
        queryFn: () => fetchStudentTripById(id),
        enabled: !!id && hasReadPermission,
    });
}

export function useCreateStudentTrip() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<StudentTrip, Error, StudentTripInput>({
        resource: 'transport_trips',
        action: 'create',
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

    return usePermissionProtectedMutation<StudentTrip, Error, { id: string; trip: StudentTripInput }>({
        resource: 'transport_trips',
        action: 'update',
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

    return usePermissionProtectedMutation<StudentTrip, Error, { id: string; trip: StudentTripUpdateInput }>({
        resource: 'transport_trips',
        action: 'update',
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

    return usePermissionProtectedMutation<{ message: string }, Error, string>({
        resource: 'transport_trips',
        action: 'delete',
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