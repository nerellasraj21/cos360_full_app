// ============================================================================
// STAFF MANAGEMENT HOOKS
// Based on Staff Enrollment Guide - Complete implementation
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createStaff,
  updateStaff,
  getAllStaff,
  getStaffById,
  deleteStaff,
  getStaffList,
  getStaffByDesignation,
  getDriversList,
  createAttendance,
  updateAttendance,
  getAllAttendance,
  getAttendanceById,
  deleteAttendance,
  getAttendanceByStaff,
  createDesignation,
  getAllDesignations,
  getDesignationsDropdown,
  getDesignationById,
  updateDesignation,
  deleteDesignation
} from '@/api/staff';

// Temporarily use any for types until TypeScript issues are resolved
type AnyType = any;

// ============================================================================
// STAFF ENROLLMENT HOOKS
// ============================================================================

// Query keys
export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: (params?: AnyType) => [...staffKeys.lists(), params] as const,
  details: () => [...staffKeys.all, 'detail'] as const,
  detail: (id: string) => [...staffKeys.details(), id] as const,
};

// Get all staff enrollments
export function useStaffEnrollments(params?: AnyType) {
  return useQuery<AnyType>({
    queryKey: staffKeys.list(params),
    queryFn: () => getAllStaff(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get staff list (alternative)
export function useStaffList(params?: AnyType) {
  return useQuery<AnyType>({
    queryKey: ['staff-list', params],
    queryFn: () => getStaffList(params),
    staleTime: 5 * 60 * 1000,
  });
}

// Get staff by ID
export function useStaffById(staffId: string) {
  return useQuery<AnyType>({
    queryKey: staffKeys.detail(staffId),
    queryFn: () => getStaffById(staffId),
    enabled: !!staffId,
    staleTime: 5 * 60 * 1000,
  });
}

// Get staff by designation
export function useStaffByDesignation(designationId?: string) {
  return useQuery<AnyType>({
    queryKey: ['staff-by-designation', designationId],
    queryFn: () => getStaffByDesignation(designationId),
    staleTime: 5 * 60 * 1000,
  });
}

// Get drivers list
export function useDriversList() {
  return useQuery<AnyType>({
    queryKey: ['drivers-list'],
    queryFn: () => getDriversList(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Create staff enrollment
export function useCreateStaffEnrollment() {
  const queryClient = useQueryClient();

  return useMutation<AnyType, Error, AnyType>({
    mutationFn: createStaff,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.setQueryData(staffKeys.detail(data.id), data);
      toast.success('Staff enrollment created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create staff enrollment: ${error.message}`);
    },
  });
}

// Update staff enrollment
export function useUpdateStaffEnrollment() {
  const queryClient = useQueryClient();

  return useMutation<AnyType, Error, { staffId: string; data: AnyType }>({
    mutationFn: ({ staffId, data }) => updateStaff(staffId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(staffKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      toast.success('Staff enrollment updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update staff enrollment: ${error.message}`);
    },
  });
}

// Delete staff enrollment
export function useDeleteStaffEnrollment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteStaff,
    onSuccess: (_, staffId) => {
      queryClient.removeQueries({ queryKey: staffKeys.detail(staffId) });
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      toast.success('Staff enrollment deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete staff enrollment: ${error.message}`);
    },
  });
}

// ============================================================================
// STAFF ATTENDANCE HOOKS
// ============================================================================

// Query keys for attendance
export const staffAttendanceKeys = {
  all: ['staff-attendance'] as const,
  lists: () => [...staffAttendanceKeys.all, 'list'] as const,
  list: (params?: AnyType) => [...staffAttendanceKeys.lists(), params] as const,
  details: () => [...staffAttendanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...staffAttendanceKeys.details(), id] as const,
  byStaff: (staffId: string, params?: { start_date?: string; end_date?: string }) =>
    [...staffAttendanceKeys.all, 'by-staff', staffId, params] as const,
};

// Get all staff attendance
export function useStaffAttendance(params?: AnyType) {
  return useQuery<AnyType>({
    queryKey: staffAttendanceKeys.list(params),
    queryFn: () => getAllAttendance(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get attendance by ID
export function useStaffAttendanceById(attendanceId: string) {
  return useQuery<AnyType>({
    queryKey: staffAttendanceKeys.detail(attendanceId),
    queryFn: () => getAttendanceById(attendanceId),
    enabled: !!attendanceId,
    staleTime: 5 * 60 * 1000,
  });
}

// Get attendance by staff ID
export function useStaffAttendanceByStaff(staffId: string, params?: { start_date?: string; end_date?: string }) {
  return useQuery<AnyType>({
    queryKey: staffAttendanceKeys.byStaff(staffId, params),
    queryFn: () => getAttendanceByStaff(staffId, params),
    enabled: !!staffId,
    staleTime: 2 * 60 * 1000,
  });
}

// Create staff attendance
export function useCreateStaffAttendance() {
  const queryClient = useQueryClient();

  return useMutation<AnyType, Error, AnyType>({
    mutationFn: createAttendance,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: staffAttendanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffAttendanceKeys.byStaff(data.staff_id) });
      toast.success('Staff attendance recorded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to record attendance: ${error.message}`);
    },
  });
}

// Update staff attendance
export function useUpdateStaffAttendance() {
  const queryClient = useQueryClient();

  return useMutation<AnyType, Error, { attendanceId: string; data: AnyType }>({
    mutationFn: ({ attendanceId, data }) => updateAttendance(attendanceId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(staffAttendanceKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: staffAttendanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffAttendanceKeys.byStaff(data.staff_id) });
      toast.success('Staff attendance updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update attendance: ${error.message}`);
    },
  });
}

// Delete staff attendance
export function useDeleteStaffAttendance() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteAttendance,
    onSuccess: (_, attendanceId) => {
      queryClient.invalidateQueries({ queryKey: staffAttendanceKeys.lists() });
      toast.success('Staff attendance deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete attendance: ${error.message}`);
    },
  });
}

// ============================================================================
// DESIGNATION HOOKS
// ============================================================================

// Query keys for designations
export const designationKeys = {
  all: ['designations'] as const,
  lists: () => [...designationKeys.all, 'list'] as const,
  list: (params?: { skip?: number; limit?: number }) => [...designationKeys.lists(), params] as const,
  details: () => [...designationKeys.all, 'detail'] as const,
  detail: (id: string) => [...designationKeys.details(), id] as const,
  dropdown: () => [...designationKeys.all, 'dropdown'] as const,
};

// Get all designations
export function useDesignations(params?: { skip?: number; limit?: number }) {
  return useQuery<AnyType>({
    queryKey: designationKeys.list(params),
    queryFn: () => getAllDesignations(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get designations dropdown
export function useDesignationsDropdown() {
  return useQuery<AnyType>({
    queryKey: designationKeys.dropdown(),
    queryFn: () => getDesignationsDropdown(),
    staleTime: 10 * 60 * 1000,
  });
}

// Get designation by ID
export function useDesignationById(designationId: string) {
  return useQuery<AnyType>({
    queryKey: designationKeys.detail(designationId),
    queryFn: () => getDesignationById(designationId),
    enabled: !!designationId,
    staleTime: 10 * 60 * 1000,
  });
}

// Create designation
export function useCreateDesignation() {
  const queryClient = useQueryClient();

  return useMutation<AnyType, Error, AnyType>({
    mutationFn: createDesignation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: designationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: designationKeys.dropdown() });
      queryClient.setQueryData(designationKeys.detail(data.id), data);
      toast.success('Designation created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create designation: ${error.message}`);
    },
  });
}

// Update designation
export function useUpdateDesignation() {
  const queryClient = useQueryClient();

  return useMutation<AnyType, Error, { designationId: string; data: AnyType }>({
    mutationFn: ({ designationId, data }) => updateDesignation(designationId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(designationKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: designationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: designationKeys.dropdown() });
      toast.success('Designation updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update designation: ${error.message}`);
    },
  });
}

// Delete designation
export function useDeleteDesignation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteDesignation,
    onSuccess: (_, designationId) => {
      queryClient.removeQueries({ queryKey: designationKeys.detail(designationId) });
      queryClient.invalidateQueries({ queryKey: designationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: designationKeys.dropdown() });
      toast.success('Designation deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete designation: ${error.message}`);
    },
  });
}