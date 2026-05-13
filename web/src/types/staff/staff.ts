export type QualificationLevel = 'Below Graduation' | 'Graduation' | 'Post Graduation' | 'PhD';

export interface StaffQualification {
  id: string;
  staff_id: string;
  level: QualificationLevel;
  name: string;
  passed_out_year?: number;
  percentage?: string; // Decimal serialized as string by backend — use Number(percentage) for arithmetic
  university?: string;
}

export interface StaffQualificationInput {
  level: QualificationLevel;
  name: string;
  passed_out_year?: number;
  percentage?: number;
  university?: string;
}

export interface StaffQualificationUpdate {
  level?: QualificationLevel;
  name?: string;
  passed_out_year?: number;
  percentage?: number;
  university?: string;
}

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
  role_id?: string;
  user_id: string;
  designation?: Designation;
  attendances?: StaffAttendance[];
  qualifications?: StaffQualification[];
  // Work experience
  work_org?: string;
  work_from_date?: string;
  work_to_date?: string;
  subjects_dealt?: string;
  work_remarks?: string;
  // Bank details
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  account_type?: 'Savings' | 'Current';
  // Salary & PF
  last_drawn_salary?: string; // Decimal serialized as string by backend
  current_salary?: string;    // Decimal serialized as string by backend
  pf_account_number?: string;
  uan_number?: string;
  // Photo
  photo_url?: string | null;
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
  is_active?: boolean;
  role_id?: string;
}

export interface StaffUpdateRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  joining_date?: string;
  qualification?: string;
  experience_years?: number;
  address?: string;
  designation_id?: string;
  department?: string;
  is_active?: boolean;
  role_id?: string;
  // Work experience
  work_org?: string;
  work_from_date?: string;
  work_to_date?: string;
  subjects_dealt?: string;
  work_remarks?: string;
  // Bank details
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  account_type?: 'Savings' | 'Current';
  // Salary & PF
  last_drawn_salary?: number;
  current_salary?: number;
  pf_account_number?: string;
  uan_number?: string;
}

export interface StaffAttendance {
  id: string;
  staff_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave' | 'half-day';
  remarks?: string;
  staff?: Staff;
  created_at: string;
  updated_at: string;
}

export interface StaffAttendanceInput {
  staff_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave' | 'half-day';
  remarks?: string;
}

export interface StaffAttendanceUpdateRequest {
  status?: 'present' | 'absent' | 'late' | 'leave' | 'half-day';
  remarks?: string;
}

export interface Designation {
  id: string;
  title: string;
  staff_count?: number;  // Changed from staff_members to match backend
  created_at: string;
  updated_at: string;
}

export interface DesignationInput {
  title: string;
}

export interface DesignationUpdateRequest {
  title?: string;
}

// API Response types
export interface StaffListResponse {
  items: Staff[];
  total: number;
  skip: number;
  limit: number;
}

export interface StaffAttendanceListResponse {
  items: StaffAttendance[];
  total: number;
  skip: number;
  limit: number;
}

export interface DesignationListResponse {
  items: Designation[];
  total_count: number;  // Changed from 'total' to match backend
  has_next: boolean;    // Added to match backend response
}

export interface DesignationDropdown {
  id: string;
  title: string;
}

export interface StaffDriver {
  id: string;
  first_name: string;
  last_name?: string;
  user_id: string;
}

// Create request types
export interface StaffEnrollmentCreateRequest extends StaffInput {}

export interface StaffAttendanceCreateRequest extends StaffAttendanceInput {}

export interface DesignationCreateRequest extends DesignationInput {}
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