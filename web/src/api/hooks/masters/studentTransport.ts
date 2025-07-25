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

export function useStudentTransportsByStudent(studentId: number) {
    return useQuery<StudentTransport[]>({
        queryKey: ['student-transports', 'student', studentId],
        queryFn: () => fetchStudentTransportsByStudent(studentId),
        enabled: !!studentId,
    });
}

export function useCreateStudentTransport() {
    const queryClient = useQueryClient();
    return useMutation<StudentTransport, Error, StudentTransportInput>({
        mutationFn: createStudentTransport,
        onSuccess: () => {
            toast.success('Student transport assignment created!');
            queryClient.invalidateQueries({ queryKey: ['student-transports'] });
        },
        onError: () => {
            toast.error('Failed to create student transport assignment');
        },
    });
}

export function useUpdateStudentTransport() {
    const queryClient = useQueryClient();
    return useMutation<StudentTransport, Error, { id: number; transport: StudentTransportUpdateInput }>({
        mutationFn: ({ id, transport }) => updateStudentTransport(id, transport),
        onSuccess: () => {
            toast.success('Student transport assignment updated!');
            queryClient.invalidateQueries({ queryKey: ['student-transports'] });
        },
        onError: () => {
            toast.error('Failed to update student transport assignment');
        },
    });
}

export function useDeleteStudentTransport() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, number>({
        mutationFn: deleteStudentTransport,
        onSuccess: () => {
            toast.success('Student transport assignment deleted!');
            queryClient.invalidateQueries({ queryKey: ['student-transports'] });
        },
        onError: () => {
            toast.error('Failed to delete student transport assignment');
        },
    });
}