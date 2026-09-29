import apiClient from './client';

export interface StudentProfileOut {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  admission_number?: string;
  roll_number?: string;
  class_name?: string;
  section_name?: string;
  academic_year?: string;
  profile_picture_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentProfileUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  profile_picture_url?: string;
}

export interface StaffProfile {
  staff_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  designation: string | null;
  employee_id: string | null;
  date_of_joining: string | null;
  is_active: boolean;
  profile_photo_url: string | null;
}

export interface StaffProfileUpdate {
  email?: string | null;
  phone?: string | null;
}

export interface ChildProfileOut {
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  is_active: boolean;
}

export interface ParentProfileOut {
  parent_id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  occupation?: string;
  relation_to_student?: string;
  profile_photo_url?: string;
  children: ChildProfileOut[];
}

export interface ParentProfileUpdate {
  email?: string;
  phone?: string;
  occupation?: string;
}

// Student Profile API
export const studentProfileApi = {
  // Get student's own profile
  getProfile: async (): Promise<StudentProfileOut> => {
    const response = await apiClient.get<StudentProfileOut>('/profile/student/me');
    return response.data;
  },

  // Update student's own profile
  updateProfile: async (data: StudentProfileUpdate): Promise<StudentProfileOut> => {
    const response = await apiClient.put<StudentProfileOut>('/profile/student/me', data);
    return response.data;
  },
};

// Staff Profile API
export const staffProfileApi = {
  // Get staff's own profile
  getProfile: async (): Promise<StaffProfile> => {
    const response = await apiClient.get<StaffProfile>('/profile/staff/me');
    return response.data;
  },

  // Update staff's own profile
  updateProfile: async (data: StaffProfileUpdate): Promise<StaffProfile> => {
    const response = await apiClient.put<StaffProfile>('/profile/staff/me', data);
    return response.data;
  },
};

// Parent Profile API
export const parentProfileApi = {
  // Get parent's own profile
  getProfile: async (): Promise<ParentProfileOut> => {
    const response = await apiClient.get<ParentProfileOut>('/profile/parent/me');
    return response.data;
  },

  // Update parent's own profile
  updateProfile: async (data: ParentProfileUpdate): Promise<ParentProfileOut> => {
    const response = await apiClient.put<ParentProfileOut>('/profile/parent/me', data);
    return response.data;
  },
};

// Blood group options for validation
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = typeof BLOOD_GROUPS[number];

// Validation helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string, role: 'student' | 'staff' | 'parent'): boolean => {
  if (role === 'staff') {
    // Staff: Required, must be exactly 10 digits
    const staffPhoneRegex = /^\d{10}$/;
    return staffPhoneRegex.test(phone);
  } else if (role === 'parent') {
    // Parent: Optional, supports international format
    const parentPhoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return parentPhoneRegex.test(phone);
  } else {
    // Student: Optional, free format
    return true;
  }
};

export const validateBloodGroup = (bloodGroup: string): boolean => {
  return BLOOD_GROUPS.includes(bloodGroup as BloodGroup);
};

export const validateDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/);
};