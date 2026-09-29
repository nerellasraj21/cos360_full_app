import CAxios from '../index';
import type {
  Staff,
  StaffEnrollmentCreateRequest,
  StaffUpdateRequest,
  StaffListResponse,
  StaffAttendance,
  StaffAttendanceCreateRequest,
  StaffAttendanceUpdateRequest,
  StaffAttendanceListResponse,
  Designation,
  DesignationCreateRequest,
  DesignationUpdateRequest,
  DesignationListResponse,
  DesignationDropdown,
  StaffDriver
} from '@/types/masters/staff';

export const staffApi = {
  // Staff Enrollment APIs
  getAllStaffEnrollments: async (params?: {
    skip?: number;
    limit?: number;
    gender?: string;
  }): Promise<StaffListResponse> => {
    console.log('[DEBUG] staffApi.getAllStaffEnrollments called with params:', params);

    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.gender) queryParams.append('gender', params.gender);

    const response = await CAxios.get(`/staff/enrollments?${queryParams.toString()}`);
    console.log('[DEBUG] staffApi.getAllStaffEnrollments returning:', response.data);
    return response.data;
  },

  getStaffEnrollmentById: async (id: string): Promise<Staff> => {
    console.log('[DEBUG] staffApi.getStaffEnrollmentById called with id:', id);

    const response = await CAxios.get(`/staff/enrollment/${id}`);
    console.log('[DEBUG] staffApi.getStaffEnrollmentById returning:', response.data);
    return response.data;
  },

  createStaffEnrollment: async (data: StaffEnrollmentCreateRequest): Promise<Staff> => {
    console.log('[DEBUG] staffApi.createStaffEnrollment called with data:', data);

    try {
      const response = await CAxios.post('/staff/enrollment', data);
      console.log('[DEBUG] staffApi.createStaffEnrollment success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] staffApi.createStaffEnrollment failed:', error);
      throw error;
    }
  },

  updateStaffEnrollment: async (id: string, data: StaffUpdateRequest): Promise<Staff> => {
    console.log('[DEBUG] staffApi.updateStaffEnrollment called with id:', id, 'data:', data);

    const response = await CAxios.patch(`/staff/enrollment/${id}`, data);
    console.log('[DEBUG] staffApi.updateStaffEnrollment updated:', response.data);
    return response.data;
  },

  deleteStaffEnrollment: async (id: string): Promise<void> => {
    console.log('[DEBUG] staffApi.deleteStaffEnrollment called with id:', id);

    await CAxios.delete(`/staff/enrollment/${id}`);
    console.log('[DEBUG] staffApi.deleteStaffEnrollment deleted staff with id:', id);
  },

  // Staff Attendance APIs
  getAllStaffAttendance: async (params?: {
    start_date?: string;
    end_date?: string;
    name?: string;
    skip?: number;
    limit?: number;
  }): Promise<StaffAttendanceListResponse> => {
    console.log('[DEBUG] staffApi.getAllStaffAttendance called with params:', params);

    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.name) queryParams.append('name', params.name);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const response = await CAxios.get(`/staff/attendance?${queryParams.toString()}`);
    console.log('[DEBUG] staffApi.getAllStaffAttendance returning:', response.data);
    return response.data;
  },

  getStaffAttendanceById: async (id: string): Promise<StaffAttendance> => {
    console.log('[DEBUG] staffApi.getStaffAttendanceById called with id:', id);

    const response = await CAxios.get(`/staff/attendance/${id}`);
    console.log('[DEBUG] staffApi.getStaffAttendanceById returning:', response.data);
    return response.data;
  },

  createStaffAttendance: async (data: StaffAttendanceCreateRequest): Promise<StaffAttendance> => {
    console.log('[DEBUG] staffApi.createStaffAttendance called with data:', data);

    try {
      const response = await CAxios.post('/staff/attendance', data);
      console.log('[DEBUG] staffApi.createStaffAttendance success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] staffApi.createStaffAttendance failed:', error);
      throw error;
    }
  },

  updateStaffAttendance: async (id: string, data: StaffAttendanceUpdateRequest): Promise<StaffAttendance> => {
    console.log('[DEBUG] staffApi.updateStaffAttendance called with id:', id, 'data:', data);

    const response = await CAxios.patch(`/staff/attendance/${id}`, data);
    console.log('[DEBUG] staffApi.updateStaffAttendance updated:', response.data);
    return response.data;
  },

  deleteStaffAttendance: async (id: string): Promise<void> => {
    console.log('[DEBUG] staffApi.deleteStaffAttendance called with id:', id);

    await CAxios.delete(`/staff/attendance/${id}`);
    console.log('[DEBUG] staffApi.deleteStaffAttendance deleted attendance with id:', id);
  },

  getStaffAttendanceByDateRange: async (staffId: string, params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<StaffAttendance[]> => {
    console.log('[DEBUG] staffApi.getStaffAttendanceByDateRange called with staffId:', staffId, 'params:', params);

    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const response = await CAxios.get(`/staff/${staffId}/attendance/filter?${queryParams.toString()}`);
    console.log('[DEBUG] staffApi.getStaffAttendanceByDateRange returning:', response.data);
    return response.data;
  },

  // Staff Query APIs
  getStaffByGender: async (gender: string): Promise<Staff[]> => {
    console.log('[DEBUG] staffApi.getStaffByGender called with gender:', gender);

    const response = await CAxios.get(`/staff/?gender=${gender}`);
    console.log('[DEBUG] staffApi.getStaffByGender returning:', response.data);
    return response.data;
  },

  getStaffByDesignation: async (designationId: string): Promise<Staff[]> => {
    console.log('[DEBUG] staffApi.getStaffByDesignation called with designationId:', designationId);

    const response = await CAxios.get(`/staff/by-designation?designation_id=${designationId}`);
    console.log('[DEBUG] staffApi.getStaffByDesignation returning:', response.data);
    return response.data;
  },

  getAllDrivers: async (): Promise<StaffDriver[]> => {
    console.log('[DEBUG] staffApi.getAllDrivers called');

    const response = await CAxios.get('/staff/drivers');
    console.log('[DEBUG] staffApi.getAllDrivers returning:', response.data);
    return response.data;
  },

  // Designation APIs
  getAllDesignations: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<DesignationListResponse> => {
    console.log('[DEBUG] staffApi.getAllDesignations called with params:', params);

    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const response = await CAxios.get(`/staff/designations/?${queryParams.toString()}`);
    console.log('[DEBUG] staffApi.getAllDesignations returning:', response.data);
    return response.data;
  },

  getDesignationById: async (id: string): Promise<Designation> => {
    console.log('[DEBUG] staffApi.getDesignationById called with id:', id);

    const response = await CAxios.get(`/staff/designations/${id}`);
    console.log('[DEBUG] staffApi.getDesignationById returning:', response.data);
    return response.data;
  },

  getDesignationsDropdown: async (): Promise<DesignationDropdown[]> => {
    console.log('[DEBUG] staffApi.getDesignationsDropdown called');

    const response = await CAxios.get('/staff/designations/dropdown');
    console.log('[DEBUG] staffApi.getDesignationsDropdown returning:', response.data);
    return response.data;
  },

  createDesignation: async (data: DesignationCreateRequest): Promise<Designation> => {
    console.log('[DEBUG] staffApi.createDesignation called with data:', data);

    try {
      const response = await CAxios.post('/staff/designations/', data);
      console.log('[DEBUG] staffApi.createDesignation success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] staffApi.createDesignation failed:', error);
      throw error;
    }
  },

  updateDesignation: async (id: string, data: DesignationUpdateRequest): Promise<Designation> => {
    console.log('[DEBUG] staffApi.updateDesignation called with id:', id, 'data:', data);

    const response = await CAxios.put(`/staff/designations/${id}`, data);
    console.log('[DEBUG] staffApi.updateDesignation updated:', response.data);
    return response.data;
  },

  deleteDesignation: async (id: string): Promise<void> => {
    console.log('[DEBUG] staffApi.deleteDesignation called with id:', id);

    await CAxios.delete(`/staff/designations/${id}`);
    console.log('[DEBUG] staffApi.deleteDesignation deleted designation with id:', id);
  },
};

export const {
  getAllStaffEnrollments,
  getStaffEnrollmentById,
  createStaffEnrollment,
  updateStaffEnrollment,
  deleteStaffEnrollment,
  getAllStaffAttendance,
  getStaffAttendanceById,
  createStaffAttendance,
  updateStaffAttendance,
  deleteStaffAttendance,
  getStaffAttendanceByDateRange,
  getStaffByGender,
  getStaffByDesignation,
  getAllDrivers,
  getAllDesignations,
  getDesignationById,
  getDesignationsDropdown,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} = staffApi;