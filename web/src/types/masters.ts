// Caste Types
export interface Caste {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SubCaste {
  id: string;
  caste_id: string;
  name: string;
  code?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CasteDropdownOption {
  id: string;
  name: string;
  code: string;
}

export interface SubCasteDropdownOption {
  id: string;
  caste_id: string;
  name: string;
  code: string;
}

// Location Types
export interface State {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface District {
  id: string;
  state_id: string;
  name: string;
  code?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Mandal {
  id: string;
  district_id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StateDropdownOption {
  id: string;
  name: string;
  code: string;
}

export interface DistrictDropdownOption {
  id: string;
  state_id: string;
  name: string;
  code: string;
}

export interface MandalDropdownOption {
  id: string;
  district_id: string;
  name: string;
}

// API Request/Response Types
export interface CasteCreateRequest {
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface CasteUpdateRequest {
  name?: string;
  code?: string;
  is_active?: boolean;
}

export interface SubCasteCreateRequest {
  caste_id: string;
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface SubCasteUpdateRequest {
  name?: string;
  code?: string;
  is_active?: boolean;
}

export interface StateCreateRequest {
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface StateUpdateRequest {
  name?: string;
  code?: string;
  is_active?: boolean;
}

export interface DistrictCreateRequest {
  state_id: string;
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface DistrictUpdateRequest {
  name?: string;
  code?: string;
  is_active?: boolean;
}

export interface MandalCreateRequest {
  district_id: string;
  name: string;
  is_active?: boolean;
}

export interface MandalUpdateRequest {
  name?: string;
  is_active?: boolean;
}

// Salary Range Types
export interface SalaryRange {
  value: string;
  label: string;
  display: string;
}
