export interface Attendance {
  id?: number;
  student_id: number;
  date: string;
  status: 'Present' | 'Absent';
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
  status: 'Present' | 'Absent';
  remarks: string;
  id?: number;
}

export type AttendanceData = Record<number, AttendanceRecord>;