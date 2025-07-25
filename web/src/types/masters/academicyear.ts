export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcademicYearInput {
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
} 