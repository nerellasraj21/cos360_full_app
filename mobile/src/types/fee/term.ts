// Fee Term Types
export interface FeeTermDate {
  id: string;
  term_id: string;
  due_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeTermDateInput {
  due_date: string;
  is_active?: boolean;
}

export interface FeeTerm {
  id: string;
  name: string;
  description?: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  term_dates?: FeeTermDate[];
  created_at: string;
  updated_at: string;
}

export interface FeeTermInput {
  name: string;
  description?: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  term_dates?: FeeTermDateInput[];
}

export interface FeeTermCreateRequest {
  name: string;
  description?: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  term_dates?: FeeTermDateInput[];
}

export interface FeeTermUpdateRequest {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  term_dates?: FeeTermDateInput[];
}

export interface FeeTermDropdown {
  id: string;
  name: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
}
