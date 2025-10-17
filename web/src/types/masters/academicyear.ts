export interface AcademicYear {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcademicYearInput {
  title: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface AcademicYearDropdown {
  id: string;
  title: string;
  is_current: boolean;
}

export interface AcademicYearListResponse {
  items: AcademicYear[];
  total: number;
  skip: number;
  limit: number;
}

export interface ApiError {
  detail: string;
  error_code?: string;
  field_errors?: Record<string, string[]>;
}