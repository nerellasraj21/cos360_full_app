// Work experience entry (dynamic array)
export interface WorkExperienceEntry {
  employer_name: string;
  role: string;
  from_date: string;
  to_date?: string;
  description?: string;
}

// Qualification entry (dynamic array) — mirrors the backend's StaffQualification
// contract (level/name/passed_out_year/percentage/university). Numeric-ish fields
// are kept as strings while editing to match the plain TextInput form fields;
// they're parsed to numbers only when sent to the API.
export interface QualificationEntry {
  id?: string;
  level: QualificationLevel | '';
  name: string;
  passed_out_year: string;
  percentage: string;
  university: string;
}

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
  // designation_obj is returned by GET /staff/ (StaffOut schema)
  designation_obj?: { id: string; title: string };
  designation?: Designation;
  attendances?: StaffAttendance[];
  // Extended fields
  employee_id?: string;
  current_salary?: string;        // Decimal as string from backend
  last_drawn_salary?: string;     // Decimal as string from backend
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  bank_ifsc_code?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  account_type?: string;
  pf_account_number?: string;
  uan_number?: string;
  esi_number?: string;
  previous_employer?: string;
  previous_designation?: string;
  // Flat work experience fields (StaffOut from GET /staff/)
  work_org?: string;
  work_from_date?: string;
  work_to_date?: string;
  subjects_dealt?: string;
  work_remarks?: string;
  // Dynamic arrays (from StaffEnrollmentOut)
  work_experience?: WorkExperienceEntry[];
  qualifications?: any[];
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
  // Extended fields
  employee_id?: string;
  current_salary?: number;
  last_drawn_salary?: number;
  bank_name?: string;
  account_number?: string;
  bank_ifsc_code?: string;
  pf_account_number?: string;
  uan_number?: string;
  esi_number?: string;
  previous_employer?: string;
  previous_designation?: string;
  // Dynamic arrays
  work_experience?: WorkExperienceEntry[];
  qualifications?: QualificationEntry[];
}

export interface Designation {
  id: string;
  title: string;
  staff_count?: number; // matches backend field, used for the staff-members count
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
  status: 'present' | 'absent' | 'late' | 'half_day';
  remarks?: string;
  staff?: Staff;
  created_at: string;
  updated_at: string;
}

export interface StaffAttendanceInput {
  staff_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
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

// Staff Qualification Types
export type QualificationLevel = 'Below Graduation' | 'Graduation' | 'Post Graduation' | 'PhD';

export interface StaffQualification {
  id: string;
  staff_id: string;
  level: QualificationLevel;
  name: string;
  passed_out_year?: number;
  percentage?: string;
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