import type { Staff, StaffInput } from '@/types/staff';
// Entire file will be removed
let staffList: Staff[] = [];
let nextId = 1;

export const fetchStaff = async (): Promise<Staff[]> => {
  return [...staffList];
};

export const fetchStaffById = async (id: number): Promise<Staff> => {
  const staff = staffList.find((s) => s.id === id);
  if (!staff) throw new Error('Staff not found');
  return { ...staff };
};

export const createStaff = async (input: StaffInput): Promise<Staff> => {
  const newStaff: Staff = {
    ...input,
    id: nextId++,
    is_active: input.is_active ?? true,
  };
  staffList.push(newStaff);
  return { ...newStaff };
};

export const updateStaff = async (id: number, input: Partial<StaffInput>): Promise<Staff> => {
  const idx = staffList.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Staff not found');
  staffList[idx] = { ...staffList[idx], ...input };
  return { ...staffList[idx] };
};

export const deleteStaff = async (id: number): Promise<void> => {
  staffList = staffList.filter((s) => s.id !== id);
};

// Staff Enrollment API endpoints
export interface Enrollment {
  id: number;
  staff_id: number;
  program_id: number;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'completed';
  notes?: string;
}

export interface EnrollmentInput {
  program_id: number;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'completed';
  notes?: string;
}

// In-memory enrollment data store
let enrollmentList: Enrollment[] = [];
let nextEnrollmentId = 1;

// Staff Enrollment operations
export const fetchEnrollments = async (): Promise<Enrollment[]> => {
  return [...enrollmentList];
};

export const fetchEnrollmentByStaffId = async (staff_id: number): Promise<Enrollment | null> => {
  const enrollment = enrollmentList.find((e) => e.staff_id === staff_id);
  return enrollment ? { ...enrollment } : null;
};

export const createEnrollment = async (staff_id: number, input: EnrollmentInput): Promise<Enrollment> => {
  // Check if staff exists
  const staff = staffList.find((s) => s.id === staff_id);
  if (!staff) throw new Error('Staff not found');

  const newEnrollment: Enrollment = {
    ...input,
    id: nextEnrollmentId++,
    staff_id,
  };
  enrollmentList.push(newEnrollment);
  return { ...newEnrollment };
};

export const updateEnrollment = async (staff_id: number, input: Partial<EnrollmentInput>): Promise<Enrollment> => {
  const idx = enrollmentList.findIndex((e) => e.staff_id === staff_id);
  if (idx === -1) throw new Error('Enrollment not found');
  enrollmentList[idx] = { ...enrollmentList[idx], ...input };
  return { ...enrollmentList[idx] };
};

export const deleteEnrollment = async (staff_id: number): Promise<void> => {
  enrollmentList = enrollmentList.filter((e) => e.staff_id !== staff_id);
};