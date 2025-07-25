export interface Holiday {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  academic_year_id: number;
  created_at: string;
  updated_at: string;
  color?: string;
}

export interface HolidayInput {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  academic_year_id: number;
  color?: string;
} 