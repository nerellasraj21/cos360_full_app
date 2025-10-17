export interface AttendanceRequest {
  student_id: string;
  class_id: string;
  section_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

export interface AttendanceResponse {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string;
  remarks: string | null;
  marked_by: string;
  created_at: string;
  updated_at: string;
}

// Keep the old interface for backward compatibility if needed
export interface Attendance {
  id?: number;
  student_id: number;
  date: string;
  status: 'present' | 'absent';
  remarks: string;
}

export interface Student {
  id: number;
  name: string;
  roll_number: number;
  class_id?: number;
  section_id?: number;
}

export interface Teacher {
  id: number;
  name: string;
  employee_id: string;
}

export interface Class {
  id: number;
  name: string;
}

export interface Section {
  id: number;
  name: string;
  class_id: number;
}

export interface AttendanceRecord {
  status: 'present' | 'absent';
  remarks: string;
  id?: number;
}

export type AttendanceData = Record<number, AttendanceRecord>;

export interface StudentAttendanceCreate {
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

export interface StudentAttendanceOut {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    admission_number?: string;
  };
}

export interface StudentAttendanceUpdate {
  status?: 'present' | 'absent' | 'late';
  remarks?: string;
}

export interface BulkAttendanceUpdate {
  student_id: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

export interface StaffAttendanceBase {
  staff_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

export interface StaffAttendanceCreate extends StaffAttendanceBase { }

export interface StaffAttendanceUpdate {
  status?: 'present' | 'absent' | 'late';
  remarks?: string;
}

export interface StaffAttendanceOut extends StaffAttendanceBase {
  id: string;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    designation?: string;
    department?: string;
  };
}

export interface StaffAttendanceFilter {
  staff_id?: string;
  department?: string;
  designation_id?: string;
  date_from?: string;
  date_to?: string;
  attendance_status?: string;
  month?: number;
  year?: number;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}

export interface StaffAttendanceSummary {
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  present_percentage: number;
  absent_percentage: number;
  late_percentage: number;
  date_range: {
    from_date: string;
    to_date: string;
  };
}

export interface ReportResponse {
  data: any[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ExportRequest {
  report_type: string;
  format: 'csv' | 'xlsx' | 'pdf';
  filters: Record<string, any>;
  filename?: string;
}