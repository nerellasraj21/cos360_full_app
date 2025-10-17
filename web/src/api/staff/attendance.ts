import type {
    StaffAttendanceCreate,
    StaffAttendanceOut,
    StaffAttendanceUpdate,
    StaffAttendanceFilter,
    StaffAttendanceSummary,
    ReportResponse,
    ExportRequest
} from '@/types/attendance';
import type { ApiError } from '@/types/common';
import CAxios from '../index';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
    if (error.response?.data) {
        const apiError: ApiError = error.response.data;
        return new Error(apiError.detail || 'An error occurred');
    }
    return new Error(error.message || 'Network error');
};

// Create attendance
export const createStaffAttendance = async (
    attendanceData: StaffAttendanceCreate
): Promise<StaffAttendanceOut> => {
    try {
        const { data } = await CAxios.post('/masters/staff/attendance', attendanceData);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
};

// Get all attendances
export const getAllStaffAttendances = async (): Promise<StaffAttendanceOut[]> => {
    try {
        const { data } = await CAxios.get('/masters/staff/attendance');
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
};

// Get attendance by ID
export const getStaffAttendanceById = async (
    attendanceId: string
): Promise<StaffAttendanceOut> => {
    try {
        const { data } = await CAxios.get(`/masters/staff/attendance/${attendanceId}`);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
};

// Update attendance
export const updateStaffAttendance = async (
    attendanceId: string,
    attendanceData: StaffAttendanceUpdate
): Promise<StaffAttendanceOut> => {
    try {
        const { data } = await CAxios.patch(`/masters/staff/attendance/${attendanceId}`, attendanceData);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
};

// Delete attendance
export const deleteStaffAttendance = async (attendanceId: string): Promise<void> => {
    try {
        await CAxios.delete(`/masters/staff/attendance/${attendanceId}`);
    } catch (error) {
        throw handleApiError(error);
    }
};

// Filter staff attendance by date
export const getStaffAttendanceByDateFilter = async (
    staffId: string,
    params?: {
        start_date?: string;
        end_date?: string;
    }
): Promise<StaffAttendanceOut[]> => {
    try {
        const queryParams = new URLSearchParams();
        if (params?.start_date) queryParams.append('start_date', params.start_date);
        if (params?.end_date) queryParams.append('end_date', params.end_date);

        const { data } = await CAxios.get(`/masters/staff/${staffId}/attendance/filter?${queryParams.toString()}`);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
};

// Get attendance by date (for all staff)
export const getStaffAttendanceByDate = async (
    attendanceDate: string
): Promise<StaffAttendanceOut[]> => {
    try {
        // Try to get attendance for specific date
        const allAttendances = await getAllStaffAttendances();
        const filteredData = allAttendances.filter(att => att.date === attendanceDate);
        return filteredData;
    } catch (error) {
        throw handleApiError(error);
    }
};

// Bulk create/update attendance for a date
export const bulkUpdateStaffAttendanceByDate = async (
    attendanceDate: string,
    attendanceRecords: StaffAttendanceCreate[]
): Promise<StaffAttendanceOut[]> => {
    try {
        const promises = attendanceRecords.map(record => createStaffAttendance(record));
        const results = await Promise.all(promises);
        return results;
    } catch (error) {
        throw handleApiError(error);
    }
};

// Get staff attendance report
export const getStaffAttendanceReport = async (
    filters?: StaffAttendanceFilter
): Promise<ReportResponse> => {
    try {
        const queryParams = new URLSearchParams();
        if (filters?.staff_id) queryParams.append('staff_id', filters.staff_id);
        if (filters?.department) queryParams.append('department', filters.department);
        if (filters?.designation_id) queryParams.append('designation_id', filters.designation_id);
        if (filters?.date_from) queryParams.append('date_from', filters.date_from);
        if (filters?.date_to) queryParams.append('date_to', filters.date_to);
        if (filters?.attendance_status) queryParams.append('attendance_status', filters.attendance_status);
        if (filters?.month) queryParams.append('month', filters.month.toString());
        if (filters?.year) queryParams.append('year', filters.year.toString());
        if (filters?.page) queryParams.append('page', filters.page.toString());
        if (filters?.page_size) queryParams.append('page_size', filters.page_size.toString());
        if (filters?.sort_by) queryParams.append('sort_by', filters.sort_by);
        if (filters?.sort_order) queryParams.append('sort_order', filters.sort_order);

        const { data } = await CAxios.get(`/reports/attendance/staff?${queryParams.toString()}`);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
};

// Get staff attendance statistics
export const getStaffAttendanceStats = async (
    filters?: Omit<StaffAttendanceFilter, 'page' | 'page_size'>
): Promise<StaffAttendanceSummary> => {
    try {
        const queryParams = new URLSearchParams();
        if (filters?.staff_id) queryParams.append('staff_id', filters.staff_id);
        if (filters?.department) queryParams.append('department', filters.department);
        if (filters?.designation_id) queryParams.append('designation_id', filters.designation_id);
        if (filters?.date_from) queryParams.append('date_from', filters.date_from);
        if (filters?.date_to) queryParams.append('date_to', filters.date_to);
        if (filters?.attendance_status) queryParams.append('attendance_status', filters.attendance_status);
        if (filters?.month) queryParams.append('month', filters.month.toString());
        if (filters?.year) queryParams.append('year', filters.year.toString());
        if (filters?.sort_by) queryParams.append('sort_by', filters.sort_by);
        if (filters?.sort_order) queryParams.append('sort_order', filters.sort_order);

        const { data } = await CAxios.get(`/reports/attendance/staff/stats?${queryParams.toString()}`);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
};

// Export staff attendance report
export const exportStaffAttendanceReport = async (
    exportRequest: ExportRequest
): Promise<Blob> => {
    try {
        const { data } = await CAxios.post('/reports/attendance/export', exportRequest, {
            responseType: 'blob'
        });
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
};