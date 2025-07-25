export interface Staff {
  id: number;
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