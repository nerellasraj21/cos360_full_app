// Fee Mapping Types (Class and Student Mappings)
export interface FeeClassMappingTermAmount {
  fee_term_date_id: string;
  amount: number;
}

export interface FeeClassMapping {
  id: string;
  class_id: string;
  fee_type_id: string;
  academic_year_id: string;
  total_amount: number;
  term_amounts: FeeClassMappingTermAmount[];
  created_at: string;
  updated_at: string;
}

export interface FeeClassMappingInput {
  class_id: string;
  fee_type_id: string;
  academic_year_id: string;
  total_amount: number;
  term_amounts: FeeClassMappingTermAmount[];
}

export interface FeeClassMappingCreateRequest {
  class_id: string;
  fee_type_id: string;
  academic_year_id: string;
  total_amount: number;
  term_amounts: FeeClassMappingTermAmount[];
}

export interface FeeClassMappingUpdateRequest {
  total_amount?: number;
  term_amounts?: FeeClassMappingTermAmount[];
}

export interface FeeTermAmount {
  id: string;
  fee_term_date_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface FeeTermAmountCreateRequest {
  fee_term_date_id: string;
  amount: number;
}

export interface FeeTermAmountUpdateRequest {
  amount?: number;
}

export interface StudentDetails {
  id: string;
  admission_num: string;
  name: string;
  class_name: string;
  section_name: string;
}

export interface StudentFeeMappingTerm {
  fee_term_date_id: string;
  amount: number;
}

export interface FeeStudentMapping {
  id: string;
  student_id: string;
  student_admission_num: string;
  student_name: string;
  class_id: string;
  section_id: string;
  fee_type_id: string;
  fee_type_name: string;
  academic_year_id: string;
  academic_year_name: string;
  total_fee: number;
  student_fee_mapping_terms: StudentFeeMappingTerm[];
  created_at: string;
  updated_at: string;
}

export interface FeeStudentMappingCreateRequest {
  student_id: string;
  student_admission_num: string;
  class_id: string;
  section_id: string;
  fee_type_id: string;
  total_fee: number;
  academic_year_id: string;
}

export interface FeeStudentMappingUpdateRequest {
  total_fee?: number;
  student_fee_mapping_terms?: StudentFeeMappingTerm[];
}

export interface FeeStudentMappingBulkRequest {
  student_ids: string[];
  class_id: string;
  section_id: string;
  fee_type_id: string;
  total_fee: number;
  academic_year_id: string;
}

export interface FeeStudentMappingResponse {
  id: string;
  student_details: StudentDetails;
  fee_type_name: string;
  academic_year_name: string;
  student_fee_mapping_terms: StudentFeeMappingTerm[];
  total_fee?: string;
}

export interface FeeStudentMappingBulkResponse {
  success_count: number;
  total_count: number;
  created_mappings: FeeStudentMappingResponse[];
  errors: any[];
  message: string;
}
