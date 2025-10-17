export interface FeeClassMapping {
  id: string;
  class_id: string;
  fee_type_id: string;
  total_fee: number;
  academic_year_id: string;
  all_by_default: boolean;
  class_name?: string;
  fee_type_name?: string;
  academic_year_name?: string;
  class_fee_mapping_terms?: FeeClassMappingTermAmount[];
  created_at: string;
  updated_at: string;
}

export interface FeeClassMappingTermAmount {
  id: string;
  fee_class_mapping_id: string;
  term_id: string;
  term_amount: number;
  created_at: string;
  updated_at: string;
}

export interface FeeClassMappingInput {
  class_id: string;
  fee_type_id: string;
  total_fee: number;
  academic_year_id: string;
  all_by_default?: boolean;
}

export interface FeeClassMappingCreateRequest extends FeeClassMappingInput {}

export interface FeeClassMappingUpdateRequest extends Partial<FeeClassMappingInput> {}

export interface FeeClassMappingBulkCreateRequest {
  class_ids: string[];
  fee_type_id: string;
  total_fee: number;
  academic_year_id: string;
  all_by_default?: boolean;
}

export interface FeeClassMappingBulkResponse {
  success_count: number;
  total_count: number;
  created_mappings: FeeClassMapping[];
  errors: Array<{
    class_id: string;
    error: string;
  }>;
  message: string;
}

export interface FeeClassMappingListResponse {
  items: FeeClassMapping[];
  total: number;
  skip: number;
  limit: number;
}

export interface FeeStudentMapping {
  id: string;
  student_id: string;
  academic_year_id: string;
  academic_year_name: string | null;
  class_id: string;
  fee_type_id: string;
  fee_type_name: string | null;
  section_id: string;
  student_admission_num: string;
  student_details: any | null; // API returns null
  student_fee_mapping_terms: FeeStudentMapTermAmount[];
  total_fee: string; // API returns as string
  created_at?: string;
  updated_at?: string;
}

export interface FeeStudentMapTermAmount {
  id: string;
  term_id: string;
  term_amount: number;
  term_name: string;
  created_at?: string;
  updated_at?: string;
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
  student_id?: string;
  student_admission_num?: string;
  class_id?: string;
  section_id?: string;
  fee_type_id?: string;
  total_fee?: number;
  academic_year_id?: string;
}

export interface FeeStudentMappingBulkCreateRequest {
  student_ids: string[];
  class_id: string;
  section_id: string;
  fee_type_id: string;
  total_fee: number;
  academic_year_id: string;
}

export interface FeeStudentMappingBulkResponse {
  success_count: number;
  total_count: number;
  message: string;
  created_mappings: FeeStudentMapping[];
  errors: Array<{
    student_id: string;
    student_name: string;
    student_admission_num: string;
    error: string;
    error_code: string;
  }>;
}

export interface FeeStudentMappingListResponse {
  items: FeeStudentMapping[];
  total: number;
  skip?: number;
  limit?: number;
}