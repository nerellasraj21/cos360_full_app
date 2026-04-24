export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  joining_date: string;
  qualification: string;
  experience_years: number;
  address: string;
  designation: string;
  department: string;
  is_active: boolean;
  role_id: number;
}

export interface StaffInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  joining_date: string;
  qualification: string;
  experience_years: number;
  address: string;
  designation: string;
  department: string;
  is_active?: boolean;
  role_id: number;
}

// Staff Enrollment types
export interface StaffEnrollmentRequest {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  gender: string;
  joining_date: string;
  qualification?: string;
  department?: string;
  designation_id: string;
}

export interface StaffEnrollmentResponse {
  id: string;
  staff: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    phone: string | null;
    gender: string;
    joining_date: string;
    qualification: string | null;
    department: string | null;
    designation_id: string;
    is_active: boolean;
    user_id: string;
  };
  user: {
    id: string;
    username: string;
    email: string;
    is_active: boolean;
  };
  created_at: string;
}

// Designation types
export interface Designation {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesignationInput {
  name: string;
  description?: string;
  is_active?: boolean;
}

// Staff Performance types
export interface StaffPerformance {
  id: string;
  staff_id: string;
  period_start: string;
  period_end: string;
  rating: number;
  review_notes: string | null;
  goals_achieved: number;
  total_goals: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StaffPerformanceInput {
  staff_id: string;
  period_start: string;
  period_end: string;
  rating: number;
  review_notes?: string;
  goals_achieved: number;
  total_goals: number;
}