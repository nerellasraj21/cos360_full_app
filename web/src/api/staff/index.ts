import CAxios from '../index';
import type {
  Staff,
  StaffEnrollmentCreateRequest,
  StaffEnrollmentUpdateRequest,
  StaffListResponse,
  StaffAttendance,
  StaffAttendanceCreateRequest,
  StaffAttendanceUpdateRequest,
  StaffAttendanceListResponse,
  Designation,
  DesignationCreateRequest,
  DesignationUpdateRequest,
  DesignationListResponse,
  StaffFilters,
  StaffAttendanceFilters,
  StaffQueryParams,
  StaffAttendanceQueryParams
} from '@/types/staff/index';

// ============================================================================
// STAFF ENROLLMENT API
// ============================================================================

export const staffEnrollmentApi = {
  // Create staff enrollment
  createStaff: async (data: StaffEnrollmentCreateRequest): Promise<Staff> => {
    const response = await CAxios.post('/masters/staff/enrollment', data);
    return response.data.data || response.data;
  },

  // Update staff enrollment
  updateStaff: async (staffId: string, data: StaffEnrollmentUpdateRequest): Promise<Staff> => {
    const response = await CAxios.patch(`/masters/staff/enrollment/${staffId}`, data);
    return response.data.data || response.data;
  },

  // Get all staff enrollments
  getAllStaff: async (params?: StaffQueryParams): Promise<StaffListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.gender) queryParams.append('gender', params.gender);
    if (params?.designation_id) queryParams.append('designation_id', params.designation_id);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = `/masters/staff/enrollments${queryString ? `?${queryString}` : ''}`;

    const response = await CAxios.get(endpoint);
    return response.data.data || response.data;
  },

  // Get staff by ID
  getStaffById: async (staffId: string): Promise<Staff> => {
    const response = await CAxios.get(`/masters/staff/enrollment/${staffId}`);
    return response.data.data || response.data;
  },

  // Delete staff enrollment
  deleteStaff: async (staffId: string): Promise<void> => {
    await CAxios.delete(`/masters/staff/enrollment/${staffId}`);
  },

  // Get staff list (alternative endpoint)
  getStaffList: async (params?: StaffFilters): Promise<Staff[]> => {
    const queryParams = new URLSearchParams();
    if (params?.gender) queryParams.append('gender', params.gender);
    if (params?.designation_id) queryParams.append('designation_id', params.designation_id);
    if (params?.department) queryParams.append('department', params.department);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

    const queryString = queryParams.toString();
    const endpoint = `/masters/staff/${queryString ? `?${queryString}` : ''}`;

    const response = await CAxios.get(endpoint);
    return response.data.data || response.data;
  },

  // Get staff by designation
  getStaffByDesignation: async (designationId?: string): Promise<Staff[]> => {
    const queryParams = designationId ? `?designation_id=${designationId}` : '';
    const response = await CAxios.get(`/masters/staff/by-designation${queryParams}`);
    return response.data.data || response.data;
  },

  // Get drivers list
  getDriversList: async (): Promise<{ full_name: string; user_id: string }[]> => {
    const response = await CAxios.get('/masters/staff/drivers');
    return response.data.data || response.data;
  }
};

// ============================================================================
// STAFF ATTENDANCE API
// ============================================================================

export const staffAttendanceApi = {
  // Create staff attendance
  createAttendance: async (data: StaffAttendanceCreateRequest): Promise<StaffAttendance> => {
    const response = await CAxios.post('/masters/staff/attendance', data);
    return response.data.data || response.data;
  },

  // Update staff attendance
  updateAttendance: async (attendanceId: string, data: StaffAttendanceUpdateRequest): Promise<StaffAttendance> => {
    const response = await CAxios.patch(`/masters/staff/attendance/${attendanceId}`, data);
    return response.data.data || response.data;
  },

  // Get all staff attendance
  getAllAttendance: async (params?: StaffAttendanceQueryParams): Promise<StaffAttendanceListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.name) queryParams.append('name', params.name);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = `/masters/staff/attendance${queryString ? `?${queryString}` : ''}`;

    const response = await CAxios.get(endpoint);
    return response.data.data || response.data;
  },

  // Get attendance by ID
  getAttendanceById: async (attendanceId: string): Promise<StaffAttendance> => {
    const response = await CAxios.get(`/masters/staff/attendance/${attendanceId}`);
    return response.data.data || response.data;
  },

  // Delete staff attendance
  deleteAttendance: async (attendanceId: string): Promise<void> => {
    await CAxios.delete(`/masters/staff/attendance/${attendanceId}`);
  },

  // Get attendance by staff ID with date filter
  getAttendanceByStaff: async (staffId: string, params?: { start_date?: string; end_date?: string }): Promise<StaffAttendance[]> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const queryString = queryParams.toString();
    const endpoint = `/masters/staff/${staffId}/attendance/filter${queryString ? `?${queryString}` : ''}`;

    const response = await CAxios.get(endpoint);
    return response.data.data || response.data;
  }
};

// ============================================================================
// DESIGNATION API
// ============================================================================

export const designationApi = {
  // Create designation
  createDesignation: async (data: DesignationCreateRequest): Promise<Designation> => {
    const response = await CAxios.post('/masters/staff/designations/', data);
    return response.data.data || response.data;
  },

  // Get all designations
  getAllDesignations: async (params?: { skip?: number; limit?: number }): Promise<DesignationListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = `/masters/staff/designations/${queryString ? `?${queryString}` : ''}`;

    const response = await CAxios.get(endpoint);
    return response.data.data || response.data;
  },

  // Get designations dropdown
  getDesignationsDropdown: async (): Promise<Designation[]> => {
    const response = await CAxios.get('/masters/staff/designations/dropdown');
    return response.data.data || response.data;
  },

  // Get designation by ID
  getDesignationById: async (designationId: string): Promise<Designation> => {
    const response = await CAxios.get(`/masters/staff/designations/${designationId}`);
    return response.data.data || response.data;
  },

  // Update designation
  updateDesignation: async (designationId: string, data: DesignationUpdateRequest): Promise<Designation> => {
    const response = await CAxios.put(`/masters/staff/designations/${designationId}`, data);
    return response.data.data || response.data;
  },

  // Delete designation
  deleteDesignation: async (designationId: string): Promise<void> => {
    await CAxios.delete(`/masters/staff/designations/${designationId}`);
  }
};

// Export individual functions for convenience
export const {
  createStaff,
  updateStaff,
  getAllStaff,
  getStaffById,
  deleteStaff,
  getStaffList,
  getStaffByDesignation,
  getDriversList
} = staffEnrollmentApi;

export const {
  createAttendance,
  updateAttendance,
  getAllAttendance,
  getAttendanceById,
  deleteAttendance,
  getAttendanceByStaff
} = staffAttendanceApi;

export const {
  createDesignation,
  getAllDesignations,
  getDesignationsDropdown,
  getDesignationById,
  updateDesignation,
  deleteDesignation
} = designationApi;