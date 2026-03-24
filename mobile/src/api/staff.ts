import apiClient from './client';
import type {
    Parent,
    ParentInput,
    Staff,
    StaffAssignment,
    StaffAssignmentInput,
    StaffDesignation,
    StaffEnrollment,
    StaffEnrollmentInput,
    StaffInput,
    Designation,
    DesignationInput,
    StaffAttendance,
    StaffAttendanceInput,
    StaffProfile,
    StaffQualification,
    StaffQualificationInput,
    StaffQualificationUpdate,
} from '@/src/types/masters/staff';

// Staff Enrollment API functions
export const staffApi = {
  // List Staff — GET /staff/?skip=0&limit=20&search={text}&designation_id={uuid}&is_active={bool}
  getStaffEnrollments: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    designation_id?: string;
    is_active?: boolean;
    gender?: string;
  }): Promise<{ items: Staff[]; total: number }> => {
    const response = await apiClient.get('/staff/', { params });
    const data = response.data;
    if (Array.isArray(data)) {
      return { items: data, total: data.length };
    }
    return data;
  },

  // Get Staff by ID — GET /staff/enrollment/{staff_id}
  getStaffEnrollmentById: async (id: string): Promise<Staff> => {
    const response = await apiClient.get(`/staff/enrollment/${id}`);
    return response.data;
  },

  // Create Staff — POST /staff/enrollment
  createStaffEnrollment: async (data: StaffInput): Promise<Staff> => {
    const response = await apiClient.post('/staff/enrollment', data);
    return response.data;
  },

  // Update Staff — PATCH /staff/enrollment/{id}
  updateStaffEnrollment: async (id: string, data: Partial<StaffInput>): Promise<Staff> => {
    const response = await apiClient.patch(`/staff/enrollment/${id}`, data);
    return response.data;
  },

  // Delete Staff — DELETE /staff/enrollment/{id}
  deleteStaffEnrollment: async (id: string): Promise<void> => {
    await apiClient.delete(`/staff/enrollment/${id}`);
  },

  // Filter by designation — GET /staff/by-designation?designation_id={id}
  getStaffByDesignation: async (designationId: string): Promise<Staff[]> => {
    const response = await apiClient.get('/staff/by-designation', { params: { designation_id: designationId } });
    return response.data.items || response.data;
  },

  // Drivers — GET /staff/drivers
  getDrivers: async (): Promise<Staff[]> => {
    const response = await apiClient.get('/staff/drivers');
    return response.data.items || response.data;
  },
};

// Staff Attendance API functions
export const staffAttendanceApi = {
  // Get Staff Attendance
  getStaffAttendance: async (params?: {
    start_date?: string;
    end_date?: string;
    name?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ items: StaffAttendance[]; total: number }> => {
    const queryParams = params ? new URLSearchParams(params as any).toString() : '';
    const response = await apiClient.get(`/staff/attendance${queryParams ? '?' + queryParams : ''}`);
    return response.data;
  },

  // Create Staff Attendance
  createStaffAttendance: async (data: StaffAttendanceInput): Promise<StaffAttendance> => {
    const response = await apiClient.post('/staff/attendance', data);
    return response.data;
  },

  // Update Staff Attendance
  updateStaffAttendance: async (id: string, data: Partial<StaffAttendanceInput>): Promise<StaffAttendance> => {
    const response = await apiClient.patch(`/staff/attendance/${id}`, data);
    return response.data;
  },

  // Delete Staff Attendance
  deleteStaffAttendance: async (id: string): Promise<void> => {
    await apiClient.delete(`/staff/attendance/${id}`);
  },

  // Get Staff Attendance by ID — GET /staff/attendance/{id}
  getStaffAttendanceById: async (id: string): Promise<StaffAttendance> => {
    const response = await apiClient.get(`/staff/attendance/${id}`);
    return response.data;
  },

  // Get Staff Attendance by Date Range — GET /masters/staff/{staffId}/attendance/filter
  getStaffAttendanceByDateRange: async (staffId: string, params: {
    start_date: string;
    end_date: string;
  }): Promise<StaffAttendance[]> => {
    const response = await apiClient.get(`/masters/staff/${staffId}/attendance/filter`, { params });
    return response.data;
  },
};

// Designations API functions
export const designationsApi = {
  // List Designations
  getDesignations: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<{ items: Designation[]; total: number }> => {
    const queryParams = params ? new URLSearchParams(params as any).toString() : '';
    const response = await apiClient.get(`/staff/designations/${queryParams ? '?' + queryParams : ''}`);
    // Handle both direct array response and wrapped response
    const data = response.data;
    if (Array.isArray(data)) {
      return { items: data, total: data.length };
    }
    return data;
  },

  // Get Designation by ID
  getDesignationById: async (id: string): Promise<Designation> => {
    const response = await apiClient.get(`/staff/designations/${id}`);
    return response.data;
  },

  // Get Designations Dropdown
  getDesignationsDropdown: async (): Promise<{ id: string; title: string }[]> => {
    const response = await apiClient.get('/staff/designations/dropdown');
    return response.data;
  },

  // Create Designation
  createDesignation: async (data: DesignationInput): Promise<Designation> => {
    const response = await apiClient.post('/staff/designations/', data);
    return response.data;
  },

  // Update Designation
  updateDesignation: async (id: string, data: Partial<DesignationInput>): Promise<Designation> => {
    const response = await apiClient.put(`/staff/designations/${id}`, data);
    return response.data;
  },

  // Delete Designation
  deleteDesignation: async (id: string): Promise<void> => {
    await apiClient.delete(`/staff/designations/${id}`);
  }
};

// Staff Profile API functions
export const staffProfileApi = {
  // Get Staff Profile
  getStaffProfile: async (): Promise<StaffProfile> => {
    const response = await apiClient.get('/profile/staff/me');
    return response.data;
  },

  // Update Staff Profile
  updateStaffProfile: async (data: { email?: string; phone?: string }): Promise<StaffProfile> => {
    const response = await apiClient.put('/profile/staff/me', data);
    return response.data;
  }
};

// Legacy API functions for backward compatibility
export const legacyStaffApi = {
  // Get all staff
  getStaff: async (params?: { gender?: string }): Promise<Staff[]> => {
    const response = await staffApi.getStaffEnrollments(params);
    return response.items;
  },

  // Get staff by ID
  getStaffById: async (id: string): Promise<Staff | null> => {
    try {
      return await staffApi.getStaffEnrollmentById(id);
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  // Create new staff
  createStaff: async (data: StaffInput): Promise<Staff> => {
    return await staffApi.createStaffEnrollment(data);
  },

  // Update staff
  updateStaff: async (id: string, data: Partial<StaffInput>): Promise<Staff> => {
    return await staffApi.updateStaffEnrollment(id, data);
  },

  // Delete staff
  deleteStaff: async (id: string): Promise<void> => {
    await staffApi.deleteStaffEnrollment(id);
  }
};

// Parent API functions
export const parentApi = {
  // Get all parents
  getParents: async (): Promise<Parent[]> => {
    const response = await apiClient.get('/parents/');
    return response.data.items || response.data;
  },

  // Get parent by ID
  getParentById: async (id: string): Promise<Parent | null> => {
    try {
      const response = await apiClient.get(`/parents/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  // Create new parent
  createParent: async (data: ParentInput): Promise<Parent> => {
    const response = await apiClient.post('/parents/', data);
    return response.data;
  },

  // Update parent
  updateParent: async (id: string, data: Partial<ParentInput>): Promise<Parent> => {
    const response = await apiClient.put(`/parents/${id}`, data);
    return response.data;
  },

  // Delete parent
  deleteParent: async (id: string): Promise<void> => {
    await apiClient.delete(`/parents/${id}`);
  }
};

// Staff Designations API functions
export const staffDesignationsApi = {
  // Get all staff designations — GET /staff/designations/
  getStaffDesignations: async (): Promise<StaffDesignation[]> => {
    const response = await apiClient.get('/staff/designations/');
    return response.data.items || response.data;
  },

  // Get designation by ID — GET /staff/designations/{id}
  getDesignationById: async (id: number): Promise<StaffDesignation | null> => {
    try {
      const response = await apiClient.get(`/staff/designations/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }
};

// Staff Enrollment API functions
export const staffEnrollmentApi = {
  // Get all enrollments
  getEnrollments: async (): Promise<StaffEnrollment[]> => {
    const response = await apiClient.get('/staff/enrollments/');
    return response.data.items || response.data;
  },

  // Get enrollment by staff ID — GET /staff/enrollment/{staff_id}
  getEnrollmentByStaffId: async (staffId: string): Promise<StaffEnrollment | null> => {
    try {
      const response = await apiClient.get(`/staff/enrollment/${staffId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  // Create enrollment
  createEnrollment: async (staffId: string, data: StaffEnrollmentInput): Promise<StaffEnrollment> => {
    const response = await apiClient.post('/staff/enrollments/', { ...data, staff_id: staffId });
    return response.data;
  },

  // Update enrollment
  updateEnrollment: async (id: string, data: Partial<StaffEnrollmentInput>): Promise<StaffEnrollment> => {
    const response = await apiClient.put(`/staff/enrollments/${id}`, data);
    return response.data;
  }
};

// Staff Assignments API functions
export const staffAssignmentsApi = {
  // Get all assignments
  getAssignments: async (): Promise<StaffAssignment[]> => {
    const response = await apiClient.get('/staff/assignments/');
    return response.data.items || response.data;
  },

  // Get assignments by staff ID
  getAssignmentsByStaffId: async (staffId: string): Promise<StaffAssignment[]> => {
    const response = await apiClient.get(`/staff/assignments/staff/${staffId}`);
    return response.data.items || response.data;
  },

  // Create assignment
  createAssignment: async (data: StaffAssignmentInput): Promise<StaffAssignment> => {
    const response = await apiClient.post('/staff/assignments/', data);
    return response.data;
  },

  // Update assignment
  updateAssignment: async (id: string, data: Partial<StaffAssignmentInput>): Promise<StaffAssignment> => {
    const response = await apiClient.put(`/staff/assignments/${id}`, data);
    return response.data;
  }
};

// Staff Qualifications API
export const staffQualificationsApi = {
  // GET /staff/{staffId}/qualifications
  getQualifications: async (staffId: string): Promise<StaffQualification[]> => {
    const response = await apiClient.get(`/staff/${staffId}/qualifications`);
    return response.data.items || response.data;
  },

  // POST /staff/{staffId}/qualifications
  addQualification: async (staffId: string, data: StaffQualificationInput): Promise<StaffQualification> => {
    const response = await apiClient.post(`/staff/${staffId}/qualifications`, data);
    return response.data;
  },

  // PUT /staff/{staffId}/qualifications/{qualId}
  updateQualification: async (staffId: string, qualId: string, data: StaffQualificationUpdate): Promise<StaffQualification> => {
    const response = await apiClient.put(`/staff/${staffId}/qualifications/${qualId}`, data);
    return response.data;
  },

  // DELETE /staff/{staffId}/qualifications/{qualId}
  deleteQualification: async (staffId: string, qualId: string): Promise<void> => {
    await apiClient.delete(`/staff/${staffId}/qualifications/${qualId}`);
  },
};

// Staff Attendance Reports API
export const staffAttendanceReportsApi = {
  // GET /reports/attendance/staff
  getAttendanceReport: async (params?: {
    start_date?: string;
    end_date?: string;
    staff_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<any[]> => {
    const response = await apiClient.get('/reports/attendance/staff', { params });
    return response.data.items || response.data;
  },

  // GET /reports/attendance/staff/stats
  getAttendanceStats: async (params?: {
    start_date?: string;
    end_date?: string;
    staff_id?: string;
  }): Promise<any> => {
    const response = await apiClient.get('/reports/attendance/staff/stats', { params });
    return response.data;
  },

  // POST /reports/attendance/export → Blob
  exportReport: async (data: {
    start_date?: string;
    end_date?: string;
    format?: 'csv' | 'xlsx';
  }): Promise<Blob> => {
    const response = await apiClient.post('/reports/attendance/export', data, { responseType: 'blob' });
    return response.data;
  },
};