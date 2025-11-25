// Staff Types
export interface Staff {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  joining_date: string;
  qualification?: string;
  experience_years?: number;
  address?: string;
  designation_id?: string;
  department?: string;
  is_active: boolean;
  user_id: string;
  designation?: Designation;
  attendances?: StaffAttendance[];
  created_at: string;
  updated_at: string;
}

export interface StaffInput {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  joining_date: string;
  qualification?: string;
  experience_years?: number;
  address?: string;
  designation_id?: string;
  department?: string;
}

export interface Designation {
  id: string;
  title: string;
  staff_members?: Staff[];
  created_at: string;
  updated_at: string;
}

export interface DesignationInput {
  title: string;
}

export interface StaffAttendance {
  id: string;
  staff_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  staff?: Staff;
  created_at: string;
  updated_at: string;
}

export interface StaffAttendanceInput {
  staff_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
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

// Legacy types for backward compatibility
export interface StaffDesignation {
  id: number;
  name: string;
  description: string;
}

// Parent Types
export interface Parent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  relationship: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParentInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  relationship: string;
  is_active?: boolean;
}

// Staff Enrollment Types
export interface StaffEnrollment {
  id: string;
  staff_id: string;
  program_id: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffEnrollmentInput {
  program_id: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'completed';
  notes?: string;
}

// Staff Assignment Types
export interface StaffAssignment {
  id: string;
  staff_id: string;
  class_id?: string;
  subject_id?: string;
  assignment_type: 'teaching' | 'administrative' | 'other';
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffAssignmentInput {
  staff_id: string;
  class_id?: string;
  subject_id?: string;
  assignment_type: 'teaching' | 'administrative' | 'other';
  start_date: string;
  end_date?: string;
  is_active?: boolean;
}