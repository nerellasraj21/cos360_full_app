// Admission Type dropdown option
export interface AdmissionTypeOption {
  value: string;
  label: string;
}

export interface Parent {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  occupation?: string;
  aadhar_number?: string;
  gender?: string;
  relation_to_student?: string;
  salary_range?: string;
  students?: any[];
}

export interface StudentCreate {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  is_primary?: string; // Optional
  nationality?: string; // Optional
  mother_tongue?: string; // Optional
  aadhar_number?: string; // Optional
  apaad_number?: string; // Optional (backend expects this)
  apaar_number?: string; // Optional
  caste?: string; // Optional
  sub_caste?: string; // Optional
  community?: string; // Optional
  identification_marks?: string; // Optional
  primary_phone?: string | null; // Optional — exactly 10 digits if provided
  father: ParentCreate;
  mother: ParentCreate;
}

export interface ParentCreate {
  name: string;
  email: string;
  phone?: string; // Optional
  occupation?: string; // Optional
  aadhar_number?: string; // Optional
  gender?: string; // Optional
  relation_to_student: string; // Required
}

export interface StudentOut {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  is_primary?: string;
  aadhar_number?: string;
  apaar_number?: string;
  primary_phone?: string | null;
  caste?: string;
  sub_caste?: string;
  community?: string;
  nationality?: string;
  mother_tongue?: string;
  identification_marks?: string;
  is_active: boolean;
  photo_url?: string | null;
  user_id?: string;
  parent_links?: Array<{
    parent: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  }>;
  father?: Parent;
  mother?: Parent;
  guardian?: Parent;
}

export interface StudentAdmissionBase {
  admission_date: string;
  admission_type?: string;
  academic_year_id?: string;
  admitted_academic_year_id?: string;
  admitted_class_id?: string;
  admitted_section_id?: string;
  current_class_id?: string;
  current_section_id?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  is_previous_school?: boolean;
  previous_school_name?: string;
  previous_class?: string;
  previous_school_remark?: string;
}

export interface StudentAdmissionCreate extends StudentAdmissionBase {
  student?: StudentCreate; // Optional for backward compatibility

  // Admission number (required, must be unique)
  admission_number?: string;

  // Admission type
  admission_type?: string;

  // Address flat fields (supplements StudentAdmissionBase.state)
  state_id?: string;
  district_id?: string;
  mandal_id?: string;
  pincode?: string;

  // Flat fields for form handling
  primary_phone?: string | null;
  student_first_name?: string;
  student_last_name?: string;
  student_date_of_birth?: string;
  student_gender?: string;
  student_is_primary?: string;
  student_nationality?: string;
  student_mother_tongue?: string;
  student_aadhar_number?: string;
  student_apaar_number?: string;
  student_caste?: string;
  student_sub_caste?: string;
  student_community?: string;
  student_identification_marks?: string;
  caste_id?: string;
  sub_caste_id?: string;

  father_name?: string;
  father_email?: string;
  father_phone?: string;
  father_occupation?: string;
  father_salary_range?: string;
  father_aadhar_number?: string;
  father_gender?: string;
  father_relation_to_student?: string;

  mother_name?: string;
  mother_email?: string;
  mother_phone?: string;
  mother_occupation?: string;
  mother_salary_range?: string;
  mother_aadhar_number?: string;
  mother_gender?: string;
  mother_relation_to_student?: string;

  // Guardian details (optional)
  guardian_name?: string;
  guardian_email?: string;
  guardian_phone?: string;
  guardian_occupation?: string;
  guardian_salary_range?: string;
  guardian_aadhar_number?: string;
  guardian_gender?: string;
  guardian_relation_to_student?: string;
}

export interface StudentAdmissionResponse extends StudentAdmissionBase {
  id: string;
  student_id?: string;
  admission_number?: string;
  admitted_academic_year_id?: string;
  state_id?: string;
  district_id?: string;
  mandal_id?: string;
  student: StudentOut;
}

export interface StudentAdmissionUpdate {
  // Admission fields
  admission_number?: string;
  admission_date?: string;
  admission_type?: string;
  academic_year_id?: string;
  admitted_academic_year_id?: string;
  admitted_class_id?: string;
  admitted_section_id?: string;
  current_class_id?: string;
  current_section_id?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  state_id?: string;
  district_id?: string;
  mandal_id?: string;
  is_previous_school?: boolean;
  previous_school_name?: string;
  previous_class?: string;
  previous_school_remark?: string;
  // Student personal fields
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  is_primary?: string;
  aadhar_number?: string;
  apaar_number?: string;
  primary_phone?: string | null; // flat field on edit (PATCH)
  nationality?: string;
  mother_tongue?: string;
  caste?: string;
  caste_id?: string;
  sub_caste?: string;
  sub_caste_id?: string;
  community?: string;
  identification_marks?: string;
  // Parent fields
  father_name?: string;
  father_email?: string;
  father_phone?: string;
  father_occupation?: string;
  father_aadhar_number?: string;
  father_gender?: string;
  father_salary_range?: string;
  mother_name?: string;
  mother_email?: string;
  mother_phone?: string;
  mother_occupation?: string;
  mother_aadhar_number?: string;
  mother_gender?: string;
  mother_salary_range?: string;
  guardian_name?: string;
  guardian_email?: string;
  guardian_phone?: string;
  guardian_occupation?: string;
  guardian_aadhar_number?: string;
  guardian_gender?: string;
  guardian_salary_range?: string;
}

export interface StudentDropdownItem {
  id: string;
  name: string;
  admission_number?: string;
  display_name?: string;
  current_class_id?: string;
  current_section_id?: string;
}

export interface StudentDropdownSimpleItem {
  id: string;
  name: string;
}

// Legacy interface for backward compatibility
export interface StudentDropdownItemLegacy {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  admission_number: string;
}

// Legacy interfaces for backward compatibility
export interface StudentAdmissionRequest extends StudentAdmissionCreate {}

export interface StudentAdmission extends StudentAdmissionCreate {}

// Bulk admission upload
export interface BulkAdmissionCreatedRow {
  row: number;
  student_id: string;
  admission_number: string;
  name: string;
}

export interface BulkAdmissionUploadResponse {
  created: BulkAdmissionCreatedRow[];
  errors: string[];
  total_rows: number;
}
