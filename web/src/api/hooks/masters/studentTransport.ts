import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchStudentTransports,
    fetchStudentTransportsByStudent,
    createStudentTransport,
    updateStudentTransport,
    deleteStudentTransport
} from '@/api/masters/studentTransport';
import type { StudentTransport, StudentTransportInput, StudentTransportUpdateInput } from '@/types/masters/studentTransport';
import { toast } from 'sonner';

export function useStudentTransports() {
    return useQuery<StudentTransport[]>({
        queryKey: ['student-transports'],
        queryFn: fetchStudentTransports,
    });
}

export function useStudentTransportsByStudent(studentId: string) {
    return useQuery<StudentTransport[]>({
        queryKey: ['student-transports', studentId],
        queryFn: () => fetchStudentTransportsByStudent(studentId),
        enabled: !!studentId,
    });
}

export function useCreateStudentTransport() {
    const queryClient = useQueryClient();
    return useMutation<StudentTransport, Error, StudentTransportInput>({
        mutationFn: createStudentTransport,
        onSuccess: () => {
            toast.success('Student transport created!');
            queryClient.invalidateQueries({ queryKey: ['student-transports'] });
        },
        onError: () => {
            toast.error('Failed to create student transport');
        },
    });
}

export function useUpdateStudentTransport() {
    const queryClient = useQueryClient();
    return useMutation<StudentTransport, Error, { id: string; transport: StudentTransportInput }>({
        mutationFn: ({ id, transport }) => updateStudentTransport(id, transport),
        onSuccess: () => {
            toast.success('Student transport updated!');
            queryClient.invalidateQueries({ queryKey: ['student-transports'] });
        },
        onError: () => {
            toast.error('Failed to update student transport');
        },
    });
}

export function useDeleteStudentTransport() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: deleteStudentTransport,
        onSuccess: () => {
            toast.success('Student transport deleted!');
            queryClient.invalidateQueries({ queryKey: ['student-transports'] });
        },
        onError: () => {
            toast.error('Failed to delete student transport');
        },
    });
}