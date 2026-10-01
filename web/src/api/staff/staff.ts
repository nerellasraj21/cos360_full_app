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
  StaffDriver,
  StaffProfile,
  StaffQualification,
  StaffQualificationInput,
  StaffQualificationUpdate,
  BulkStaffUploadResponse,
} from '@/types/staff/staff';
import {
  STAFF_ENROLLMENT_BULK_TEMPLATE,
  STAFF_ENROLLMENT_BULK_UPLOAD,
} from '@/constants/api/staff';

export const staffApi = {
  // Staff Enrollment APIs
  getAllStaffEnrollments: async (params?: {
    skip?: number;
    limit?: number;
    gender?: string;
  }): Promise<Staff[]> => {

    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.gender) queryParams.append('gender', params.gender);

    const query = queryParams.toString();
    const response = await CAxios.get(`/staff/enrollments${query ? `?${query}` : ''}`);
    return response.data;
  },

  getStaffEnrollmentById: async (id: string): Promise<Staff> => {

    const response = await CAxios.get(`/staff/enrollment/${id}`);
    return response.data;
  },

  createStaffEnrollment: async (data: StaffEnrollmentCreateRequest): Promise<Staff> => {

    try {
      const response = await CAxios.post('/staff/enrollment', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateStaffEnrollment: async (id: string, data: StaffUpdateRequest): Promise<Staff> => {

    const response = await CAxios.patch(`/staff/enrollment/${id}`, data);
    return response.data;
  },

  deleteStaffEnrollment: async (id: string): Promise<void> => {

    await CAxios.delete(`/staff/enrollment/${id}`);
  },

  // Staff Attendance APIs
  getAllStaffAttendance: async (params?: {
    start_date?: string;
    end_date?: string;
    name?: string;
    skip?: number;
    limit?: number;
  }): Promise<StaffAttendanceListResponse> => {

    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.name) queryParams.append('name', params.name);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const response = await CAxios.get(`/staff/attendance?${queryParams.toString()}`);
    return response.data;
  },

  getStaffAttendanceById: async (id: string): Promise<StaffAttendance> => {

    const response = await CAxios.get(`/staff/attendance/${id}`);
    return response.data;
  },

  createStaffAttendance: async (data: StaffAttendanceCreateRequest): Promise<StaffAttendance> => {

    try {
      const response = await CAxios.post('/staff/attendance', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateStaffAttendance: async (id: string, data: StaffAttendanceUpdateRequest): Promise<StaffAttendance> => {

    const response = await CAxios.patch(`/staff/attendance/${id}`, data);
    return response.data;
  },

  deleteStaffAttendance: async (id: string): Promise<void> => {

    await CAxios.delete(`/staff/attendance/${id}`);
  },

  getStaffAttendanceByDateRange: async (staffId: string, params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<StaffAttendance[]> => {

    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const response = await CAxios.get(`/staff/${staffId}/attendance/filter?${queryParams.toString()}`);
    return response.data;
  },

  // Staff Query APIs
  getStaffByGender: async (gender: string): Promise<Staff[]> => {

    const response = await CAxios.get(`/staff/?gender=${gender}`);
    return response.data;
  },

  getStaffByDesignation: async (designationId: string): Promise<Staff[]> => {

    const response = await CAxios.get(`/staff/by-designation?designation_id=${designationId}`);
    return response.data;
  },

  getAllDrivers: async (): Promise<StaffDriver[]> => {

    const response = await CAxios.get('/staff/drivers');
    return response.data;
  },

  // Designation APIs
  getAllDesignations: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<DesignationListResponse> => {

    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const response = await CAxios.get(`/staff/designations/?${queryParams.toString()}`);
    return response.data;
  },

  getDesignationById: async (id: string): Promise<Designation> => {

    const response = await CAxios.get(`/staff/designations/${id}`);
    return response.data;
  },

  getDesignationsDropdown: async (): Promise<DesignationDropdown[]> => {

    const response = await CAxios.get('/staff/designations/dropdown');
    return response.data;
  },

  createDesignation: async (data: DesignationCreateRequest): Promise<Designation> => {

    try {
      const response = await CAxios.post('/staff/designations/', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateDesignation: async (id: string, data: DesignationUpdateRequest): Promise<Designation> => {

    const response = await CAxios.put(`/staff/designations/${id}`, data);
    return response.data;
  },

  deleteDesignation: async (id: string): Promise<void> => {

    await CAxios.delete(`/staff/designations/${id}`);
  },

  // Staff Profile APIs
  fetchStaffProfile: async (): Promise<StaffProfile> => {

    const response = await CAxios.get('/profile/staff/me');
    return response.data;
  },

  updateStaffProfile: async (data: { email?: string | null; phone?: string | null }): Promise<StaffProfile> => {

    const response = await CAxios.put('/profile/staff/me', data);
    return response.data;
  },

  // Staff Qualification APIs
  getQualifications: async (staffId: string): Promise<StaffQualification[]> => {
    const response = await CAxios.get(`/staff/${staffId}/qualifications`);
    return response.data;
  },

  addQualification: async (staffId: string, data: StaffQualificationInput): Promise<StaffQualification> => {
    const response = await CAxios.post(`/staff/${staffId}/qualifications`, data);
    return response.data;
  },

  updateQualification: async (staffId: string, qualificationId: string, data: StaffQualificationUpdate): Promise<StaffQualification> => {
    const response = await CAxios.put(`/staff/${staffId}/qualifications/${qualificationId}`, data);
    return response.data;
  },

  deleteQualification: async (staffId: string, qualificationId: string): Promise<void> => {
    await CAxios.delete(`/staff/${staffId}/qualifications/${qualificationId}`);
  },

  uploadStaffPhoto: async (staffId: string, file: File): Promise<Staff> => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await CAxios.post(`/staff/enrollment/${staffId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteStaffPhoto: async (staffId: string): Promise<void> => {
    await CAxios.delete(`/staff/enrollment/${staffId}/photo`);
  },

  // Bulk Staff Enrollment APIs
  downloadBulkStaffTemplate: async (): Promise<Blob> => {
    const response = await CAxios.get(STAFF_ENROLLMENT_BULK_TEMPLATE, {
      responseType: 'blob',
    });
    return response.data;
  },

  bulkUploadStaff: async (file: File): Promise<BulkStaffUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await CAxios.post(STAFF_ENROLLMENT_BULK_UPLOAD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
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
  fetchStaffProfile,
  updateStaffProfile,
} = staffApi;