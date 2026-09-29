export interface HolidayBase {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  academic_year_id: string;
  color?: string;
}

export interface HolidayCreate extends HolidayBase {}

export interface HolidayUpdate {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  color?: string;
}

export interface HolidayRead extends HolidayBase {
  id: string;
}

export interface HolidayDropdown {
  id: string;
  name: string;
}

export interface PaginatedHolidayResponse {
  items: HolidayRead[];
  total_count: number;
  has_next: boolean;
}