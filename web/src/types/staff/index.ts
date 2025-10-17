// ============================================================================
// STAFF MANAGEMENT MODULE TYPES
// Based on Staff Enrollment Guide - Complete implementation
// ============================================================================

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface Staff {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  joining_date: string;
  qualification?: string;
  experience_years?: number;
  address?: string;
  designation_id?: string;
  department?: string;
  is_active: boolean;
  user_id: string;

  // Relationships (populated by API)
  designation?: Designation;
  user?: User;
  attendances?: StaffAttendance[];
}

export interface User {
  id: string;
  username: string;
  email?: string;
  is_active: boolean;
  role_id: string;
  role?: Role;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface StaffAttendance {
  id: string;
  staff_id: string;
  attendance_date: string;
  status: string;
  staff?: Staff;
}

export interface Designation {
  id: string;
  title: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// Staff Enrollment
export interface StaffEnrollmentCreateRequest {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  joining_date: string;
  qualification?: string;
  experience_years?: number;
  address?: string;
  designation_id?: string;
  department?: string;
  is_active?: boolean;
  role_id?: string;
}

export interface StaffEnrollmentUpdateRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  joining_date?: string;
  qualification?: string;
  experience_years?: number;
  address?: string;
  designation_id?: string;
  department?: string;
  is_active?: boolean;
}

// Staff Attendance
export interface StaffAttendanceCreateRequest {
  staff_id: string;
  attendance_date: string;
  status: string;
}

export interface StaffAttendanceUpdateRequest {
  status?: string;
}

// Designations
export interface DesignationCreateRequest {
  title: string;
}

export interface DesignationUpdateRequest {
  title?: string;
}

// ============================================================================
// LIST RESPONSE TYPES
// ============================================================================

export interface StaffListResponse {
  items: Staff[];
  total_count: number;
  has_next: boolean;
}

export interface StaffAttendanceListResponse {
  items: StaffAttendance[];
  total_count: number;
  has_next: boolean;
}

export interface DesignationListResponse {
  items: Designation[];
  total_count: number;
  has_next: boolean;
}

// ============================================================================
// DROPDOWN TYPES
// ============================================================================

export interface StaffDropdownItem {
  id: string;
  name: string;
  designation?: string;
}

export interface DesignationDropdownItem {
  id: string;
  title: string;
}

export interface RoleDropdownItem {
  id: string;
  name: string;
  description?: string;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface StaffFilters {
  gender?: 'male' | 'female' | 'other';
  designation_id?: string;
  department?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export interface StaffAttendanceFilters {
  staff_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface StaffQueryParams {
  gender?: string;
  designation_id?: string;
  skip?: number;
  limit?: number;
}

export interface StaffAttendanceQueryParams {
  start_date?: string;
  end_date?: string;
  name?: string;
  skip?: number;
  limit?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type StaffGender = 'male' | 'female' | 'other';
export type StaffAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day';

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface ApiError {
  detail: string;
  error_code?: string;
  field_errors?: Record<string, string[]>;
}

// ============================================================================
// EXPORT CONFIGURATION
// ============================================================================

export interface StaffExportConfig {
  format: 'pdf' | 'excel' | 'csv';
  include_attendance: boolean;
  date_range?: {
    from: string;
    to: string;
  };
  filters?: StaffFilters;
  columns?: string[];
}