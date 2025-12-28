export interface Subject {
    id: string;
    name: string;
    short_code: string;
    description?: string;
    subject_category: {
        id: string;
        name: string;
    } | null;
    academic_year_id: string;
    is_practical: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
   }

  export interface SubjectInput {
    name: string;
    short_code: string;
    description?: string;
    subject_category_id: string;
    academic_year_id: string;
    is_practical?: boolean;
    is_active?: boolean;
  }

  export interface SubjectCategory {
    id: string;
    name: string;
    description?: string;
    display_order?: number;
    subject_count?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  }

  export interface SubjectCategoryInput {
    name: string;
    description?: string;
    display_order?: number;
    is_active?: boolean;
  }

  export interface ClassSubjectMapping {
    id: string;
    class_id: string;
    section_id?: string;
    subject_id: string;
    academic_year_id: string;
    exclude_marks: boolean;
    order?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    class_name?: string;
    section_name?: string;
    subject_name?: string;
    academic_year_name?: string;
  }

  export interface ClassSubjectMappingInput {
    class_id: string;
    subject_id: string;
    academic_year_id: string;
    exclude_marks?: boolean;
    order?: number;
    is_active?: boolean;
  }

  export interface ClassSubjectMappingUpdate {
    class_id?: string;
    subject_id?: string;
    academic_year_id?: string;
    exclude_marks?: boolean;
    order?: number;
    is_active?: boolean;
  }

  export interface ClassSubjectMappingDropdown {
    id: string;
    class_name: string;
    subject_name: string;
    exclude_marks: boolean;
    order?: number;
  }

  export interface SubjectMappingItem {
    subject_id: string;
    exclude_marks?: boolean;
    order?: number;
    is_active?: boolean;
  }

  export interface ClassSubjectMappingBulkCreate {
    class_id: string;
    section_id?: string;
    academic_year_id: string;
    subjects: SubjectMappingItem[];
  }

  export interface ClassSubjectMappingBulkResponse {
    success: boolean;
    message: string;
    created_count: number;
    updated_count: number;
    deactivated_count: number;
    sections_processed: number;
    mappings: ClassSubjectMapping[];
  }
  