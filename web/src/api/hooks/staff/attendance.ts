import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createStaffAttendance,
    getAllStaffAttendances,
    getStaffAttendanceById,
    updateStaffAttendance,
    deleteStaffAttendance,
    getStaffAttendanceByDateFilter,
    getStaffAttendanceByDate,
    bulkUpdateStaffAttendanceByDate,
    getStaffAttendanceReport,
    getStaffAttendanceStats,
    exportStaffAttendanceReport
} from '@/api/staff/attendance';
import type {
    StaffAttendanceCreate,
    StaffAttendanceUpdate,
    StaffAttendanceFilter,
    ExportRequest
} from '@/types/attendance';

// Query hooks
export const useStaffAttendances = () => {
    return useQuery({
        queryKey: ['staff-attendances'],
        queryFn: getAllStaffAttendances,
    });
};

export const useStaffAttendance = (attendanceId: string) => {
    return useQuery({
        queryKey: ['staff-attendance', attendanceId],
        queryFn: () => getStaffAttendanceById(attendanceId),
        enabled: !!attendanceId,
    });
};

export const useStaffAttendanceByDate = (date: string) => {
    return useQuery({
        queryKey: ['staff-attendance-by-date', date],
        queryFn: () => getStaffAttendanceByDate(date),
        enabled: !!date,
    });
};

export const useStaffAttendanceByDateFilter = (
    staffId: string,
    params?: { start_date?: string; end_date?: string }
) => {
    return useQuery({
        queryKey: ['staff-attendance-filter', staffId, params],
        queryFn: () => getStaffAttendanceByDateFilter(staffId, params),
        enabled: !!staffId,
    });
};

export const useStaffAttendanceReport = (filters?: StaffAttendanceFilter) => {
    return useQuery({
        queryKey: ['staff-attendance-report', filters],
        queryFn: () => getStaffAttendanceReport(filters),
        enabled: false, // Only run when explicitly called
    });
};

export const useStaffAttendanceStats = (
    filters?: Omit<StaffAttendanceFilter, 'page' | 'page_size'>
) => {
    return useQuery({
        queryKey: ['staff-attendance-stats', filters],
        queryFn: () => getStaffAttendanceStats(filters),
        enabled: false, // Only run when explicitly called
    });
};

// Mutation hooks
export const useCreateStaffAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createStaffAttendance,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-attendances'] });
            queryClient.invalidateQueries({ queryKey: ['staff-attendance-by-date'] });
        },
    });
};

export const useUpdateStaffAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: StaffAttendanceUpdate }) =>
            updateStaffAttendance(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-attendances'] });
            queryClient.invalidateQueries({ queryKey: ['staff-attendance-by-date'] });
        },
    });
};

export const useDeleteStaffAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteStaffAttendance,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-attendances'] });
            queryClient.invalidateQueries({ queryKey: ['staff-attendance-by-date'] });
        },
    });
};

export const useBulkUpdateStaffAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ date, records }: { date: string; records: StaffAttendanceCreate[] }) =>
            bulkUpdateStaffAttendanceByDate(date, records),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-attendances'] });
            queryClient.invalidateQueries({ queryKey: ['staff-attendance-by-date'] });
        },
    });
};

export const useExportStaffAttendance = () => {
    return useMutation({
        mutationFn: exportStaffAttendanceReport,
    });
};