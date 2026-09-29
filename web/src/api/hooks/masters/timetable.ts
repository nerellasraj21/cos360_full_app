import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CAxios from '@/api';

// Types
export interface TimetableSlot {
    id: string;
    timetable_id: string;
    day_of_week: number;
    slot_time_id: string;
    subject_id?: string;
    staff_id?: string;
    is_active: boolean;
}

export interface Timetable {
    id: string;
    academic_year_id: string;
    class_id: string;
    section_id: string;
    created_at: string;
    updated_at: string;
}

export interface BulkTimetableRequest {
    academic_year_id: string;
    class_id: string;
    section_id: string;
    slots: {
        day_of_week: number;
        slot_time_id: string;
        subject_id?: string;
        staff_id?: string;
        is_active?: boolean;
    }[];
}

// Query hooks
export function useTimetableSlots(params: {
    section_id: string;
    academic_year_id?: string;
}) {
    return useQuery<TimetableSlot[]>({
        queryKey: ['timetable-slots', params],
        queryFn: async () => {
            const response = await CAxios.get(`/masters/timetables/section/${params.section_id}`);
            return response.data;
        },
        enabled: !!params.section_id,
    });
}

export function useTimetable(id: string) {
    return useQuery<Timetable>({
        queryKey: ['timetable', id],
        queryFn: async () => {
            const response = await CAxios.get(`/masters/timetables/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
}

// Mutation hooks
export function useCreateBulkTimetable() {
    const queryClient = useQueryClient();
    return useMutation<{
        success: boolean;
        created_count: number;
        message: string;
        created_slots: TimetableSlot[];
    }, Error, BulkTimetableRequest>({
        mutationFn: async (data) => {
            const response = await CAxios.post('/masters/timetables/bulk', data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            toast.success(data.message || 'Timetable slots created successfully!');
            queryClient.invalidateQueries({
                queryKey: ['timetable-slots', { section_id: variables.section_id }]
            });
        },
        onError: (error) => {
            toast.error(`Failed to create timetable: ${error.message}`);
        },
    });
}

export function useUpdateTimetableSlot() {
    const queryClient = useQueryClient();
    return useMutation<TimetableSlot, Error, {
        id: string;
        data: Partial<{
            day_of_week: number;
            slot_time_id: string;
            subject_id: string;
            staff_id: string;
            is_active: boolean;
        }>;
        section_id: string;
    }>({
        mutationFn: async ({ id, data }) => {
            const response = await CAxios.put(`/masters/timetables/slots/${id}`, data);
            return response.data;
        },
        onSuccess: (data, variables) => {
            toast.success('Timetable slot updated successfully!');
            queryClient.invalidateQueries({
                queryKey: ['timetable-slots', { section_id: variables.section_id }]
            });
        },
        onError: (error) => {
            toast.error(`Failed to update timetable slot: ${error.message}`);
        },
    });
}

export function useDeleteTimetableSlot() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { id: string; section_id: string }>({
        mutationFn: async ({ id }) => {
            await CAxios.delete(`/masters/timetables/slots/${id}`);
        },
        onSuccess: (_, variables) => {
            toast.success('Timetable slot deleted successfully!');
            queryClient.invalidateQueries({
                queryKey: ['timetable-slots', { section_id: variables.section_id }]
            });
        },
        onError: (error) => {
            toast.error(`Failed to delete timetable slot: ${error.message}`);
        },
    });
}