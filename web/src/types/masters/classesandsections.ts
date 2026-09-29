// Section types
export interface SectionBase {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface SectionCreate extends SectionBase {}

export interface SectionRead {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  class_id: string;
}

export interface SectionUpdate {
  id?: string;
  name?: string;
  description?: string;
  is_active?: boolean;
}

// Class types
export interface ClassBase {
  name: string;
  description?: string;
  is_active?: boolean;
  short_code: string;
  academic_year_id: string;
}

export interface ClassCreate extends ClassBase {
  sections?: SectionCreate[];
}

export interface ClassUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
  short_code?: string;
  academic_year_id?: string;
  sections?: SectionUpdate[];
}

export interface ClassRead extends ClassBase {
  id: string;
  sections: SectionRead[];
}

export interface ClassOut {
  id: string;
  name: string;
  description?: string;
  short_code?: string;
  is_active: boolean;
  academic_year_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClassDropdown {
  id: string;
  name: string;
}

export interface SectionDropdown {
  id: string;
  name: string;
}

export interface SectionOut {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  class_id: string;
  created_at: Date;
  updated_at: Date;
}