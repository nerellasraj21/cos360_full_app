import type {
  StudentAttendanceCreate,
  StudentAttendanceOut,
  StudentAttendanceUpdate,
  BulkAttendanceUpdate
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
export const createAttendance = async (
  attendanceData: StudentAttendanceCreate
): Promise<StudentAttendanceOut> => {
  try {
    const { data } = await CAxios.post('/student/attendance/', attendanceData);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get all attendances
export const getAllAttendances = async (): Promise<StudentAttendanceOut[]> => {
  try {
    const { data } = await CAxios.get('/student/attendance/');
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get attendance by ID
export const getAttendanceById = async (
  attendanceId: string
): Promise<StudentAttendanceOut> => {
  try {
    const { data } = await CAxios.get(`/student/attendance/${attendanceId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get attendance with filters
export const getAttendanceWithFilters = async (params?: {
  start_date?: string;
  end_date?: string;
  student_name?: string;
}): Promise<StudentAttendanceOut[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.student_name) queryParams.append('student_name', params.student_name);

    const { data } = await CAxios.get(`/student/attendance/search?${queryParams.toString()}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get attendance for specific student with date filtering
export const getStudentAttendance = async (
  studentId: string,
  params?: {
    start_date?: string;
    end_date?: string;
  }
): Promise<StudentAttendanceOut[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const { data } = await CAxios.get(`/student/attendance/student/${studentId}/filter?${queryParams.toString()}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get attendance by date
export const getAttendanceByDate = async (
  attendanceDate: string
): Promise<StudentAttendanceOut[]> => {
  try {
    const { data } = await CAxios.get(`/student/attendance/by-date/${attendanceDate}`);
    return data || [];
  } catch (error) {
    // Return empty array if no attendance found for this date
    // This is normal for dates with no attendance records yet
    if ((error as any).response?.status === 404) {
      return [];
    }
    throw handleApiError(error);
  }
};

// Bulk update attendance by date
export const bulkUpdateAttendanceByDate = async (
  attendanceDate: string,
  attendanceRecords: BulkAttendanceUpdate[]
): Promise<StudentAttendanceOut[]> => {
  try {
    const { data } = await CAxios.patch(`/student/attendance/by-date/${attendanceDate}`, attendanceRecords);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update attendance
export const updateAttendance = async (
  attendanceId: string,
  attendanceData: StudentAttendanceUpdate
): Promise<StudentAttendanceOut> => {
  try {
    const { data } = await CAxios.patch(`/student/attendance/${attendanceId}`, attendanceData);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete attendance
export const deleteAttendance = async (attendanceId: string): Promise<void> => {
  try {
    await CAxios.delete(`/student/attendance/${attendanceId}`);
  } catch (error) {
    throw handleApiError(error);
  }
};