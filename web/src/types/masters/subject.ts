export interface Subject {
    id: number;
    name: string;
    category: string;
    short_code: string;
    is_active: boolean;
    academic_year_id: number;
    created_at: string;
    updated_at: string;
  }
  
  export interface SubjectInput {
    name: string;
    category: string;
    short_code: string;
    is_active: boolean;
    academic_year_id: number;
  }
  