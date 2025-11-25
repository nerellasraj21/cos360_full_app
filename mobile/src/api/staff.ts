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
    StaffProfile
} from '@/src/types/masters/staff';

// Staff Enrollment API functions
export const staffApi = {
  // List Staff Enrollments
  getStaffEnrollments: async (params?: {
    skip?: number;
    limit?: number;
    gender?: string;
  }): Promise<{ items: Staff[]; total: number }> => {
    const queryParams = params ? new URLSearchParams(params as any).toString() : '';
    const response = await apiClient.get(`/staff/enrollments${queryParams ? '?' + queryParams : ''}`);
    // Handle both direct array response and wrapped response
    const data = response.data;
    if (Array.isArray(data)) {
      return { items: data, total: data.length };
    }
    return data;
  },

  // Get Staff Enrollment by ID
  getStaffEnrollmentById: async (id: string): Promise<Staff> => {
    const response = await apiClient.get(`/staff/enrollment/${id}`);
    return response.data;
  },

  // Create Staff Enrollment
  createStaffEnrollment: async (data: StaffInput): Promise<Staff> => {
    const response = await apiClient.post('/staff/enrollment', data);
    return response.data;
  },

  // Update Staff Enrollment
  updateStaffEnrollment: async (id: string, data: Partial<StaffInput>): Promise<Staff> => {
    const response = await apiClient.patch(`/staff/enrollment/${id}`, data);
    return response.data;
  },

  // Delete Staff Enrollment
  deleteStaffEnrollment: async (id: string): Promise<void> => {
    await apiClient.delete(`/staff/enrollment/${id}`);
  }
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

  // Get Staff Attendance by Date Range
  getStaffAttendanceByDateRange: async (staffId: string, params: {
    start_date: string;
    end_date: string;
  }): Promise<StaffAttendance[]> => {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await apiClient.get(`/staff/${staffId}/attendance/filter?${queryParams}`);
    return response.data;
  }
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
  // Get all staff designations
  getStaffDesignations: async (): Promise<StaffDesignation[]> => {
    const response = await apiClient.get('/masters/staff-designations/');
    return response.data.items || response.data;
  },

  // Get designation by ID
  getDesignationById: async (id: number): Promise<StaffDesignation | null> => {
    try {
      const response = await apiClient.get(`/masters/staff-designations/${id}`);
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

  // Get enrollment by staff ID
  getEnrollmentByStaffId: async (staffId: string): Promise<StaffEnrollment | null> => {
    try {
      const response = await apiClient.get(`/staff/enrollments/staff/${staffId}`);
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