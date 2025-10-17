export interface ParentBase {
  name: string;
  email?: string;
  phone?: string;
  occupation?: string;
  aadhar_number?: string;
  gender?: string;
  relation_to_student: 'Father' | 'Mother' | 'Guardian';
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

export interface ParentProfileCreate extends ParentBase {
  user_id: string;
}