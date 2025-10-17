import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CAxios from '@/api/index';

import type { Staff, StaffInput, Designation, DesignationInput, StaffPerformance, StaffPerformanceInput, StaffEnrollmentRequest, StaffEnrollmentResponse } from '@/types/staff';
import type { StaffAttendance, StaffAttendanceCreateRequest, StaffAttendanceUpdateRequest } from '@/types/staff/staff';
import {
  fetchStaff,
  fetchStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  fetchEnrollments,
  fetchEnrollmentByStaffId,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
  type Enrollment,
  type EnrollmentInput,
  // New functions
  fetchDesignations,
  fetchDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  fetchDesignationsDropdown,
  fetchStaffByDesignation,
  fetchDrivers,
  fetchStaffPerformance,
  createStaffPerformance,
  updateStaffPerformance
} from '@/api/staff';
import {
  getAllStaffAttendance,
  getStaffAttendanceById,
  createStaffAttendance,
  updateStaffAttendance,
  deleteStaffAttendance,
  getStaffAttendanceByDateRange
} from '@/api/staff/staff';

// Staff Hooks
export function useStaff() {
  return useQuery<Staff[]>({
    queryKey: ['staff'],
    queryFn: () => fetchStaff(),
  });
}

export function useStaffMember(id: number) {
  return useQuery<Staff>({
    queryKey: ['staff', id],
    queryFn: () => fetchStaffById(id),
    enabled: !!id,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation<Staff, Error, StaffInput>({
    mutationFn: createStaff,
    onSuccess: () => {
      toast.success('Staff member created successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error) => {
      toast.error(`Failed to create staff: ${error.message}`);
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation<Staff, Error, { id: number; input: Partial<StaffInput> }>({
    mutationFn: ({ id, input }) => updateStaff(id, input),
    onSuccess: (data) => {
      toast.success('Staff member updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff', data.id] });
    },
    onError: (error) => {
      toast.error(`Failed to update staff: ${error.message}`);
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteStaff,
    onSuccess: () => {
      toast.success('Staff member deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete staff: ${error.message}`);
    },
  });
}

// Staff Enrollment Hooks
export function useEnrollments() {
  return useQuery<Enrollment[]>({
    queryKey: ['staff-enrollments'],
    queryFn: () => fetchEnrollments(),
  });
}

export function useEnrollment(staffId: number) {
  return useQuery<Enrollment | null>({
    queryKey: ['staff-enrollment', staffId],
    queryFn: () => fetchEnrollmentByStaffId(staffId),
    enabled: !!staffId,
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation<Enrollment, Error, EnrollmentInput>({
    mutationFn: createEnrollment,
    onSuccess: (data) => {
      toast.success('Enrollment created successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['staff-enrollment', data.staff_id] });
    },
    onError: (error) => {
      toast.error(`Failed to create enrollment: ${error.message}`);
    },
  });
}

export function useUpdateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation<Enrollment, Error, { staffId: number; input: Partial<EnrollmentInput> }>({
    mutationFn: ({ staffId, input }) => updateEnrollment(staffId, input),
    onSuccess: (data) => {
      toast.success('Enrollment updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['staff-enrollment', data.staff_id] });
    },
    onError: (error) => {
      toast.error(`Failed to update enrollment: ${error.message}`);
    },
  });
}

export function useDeleteEnrollment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteEnrollment,
    onSuccess: (_, staffId) => {
      toast.success('Enrollment deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['staff-enrollment', staffId] });
    },
    onError: (error) => {
      toast.error(`Failed to delete enrollment: ${error.message}`);
    },
  });
}

// Designation Hooks
export function useDesignations(params?: { skip?: number; limit?: number; is_active?: boolean }) {
  return useQuery<Designation[]>({
    queryKey: ['designations', params],
    queryFn: () => fetchDesignations(params),
  });
}

export function useDesignation(id: string) {
  return useQuery<Designation>({
    queryKey: ['designation', id],
    queryFn: () => fetchDesignationById(id),
    enabled: !!id,
  });
}

export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation<Designation, Error, DesignationInput>({
    mutationFn: createDesignation,
    onSuccess: () => {
      toast.success('Designation created successfully!');
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
    onError: (error) => {
      toast.error(`Failed to create designation: ${error.message}`);
    },
  });
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient();
  return useMutation<Designation, Error, { id: string; input: Partial<DesignationInput> }>({
    mutationFn: ({ id, input }) => updateDesignation(id, input),
    onSuccess: () => {
      toast.success('Designation updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
    onError: (error) => {
      toast.error(`Failed to update designation: ${error.message}`);
    },
  });
}

export function useDeleteDesignation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteDesignation,
    onSuccess: () => {
      toast.success('Designation deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete designation: ${error.message}`);
    },
  });
}

export function useDesignationsDropdown() {
  return useQuery<Designation[]>({
    queryKey: ['designations-dropdown'],
    queryFn: fetchDesignationsDropdown,
  });
}

// Staff by Designation Hooks
export function useStaffByDesignation(designationId: string, params?: { skip?: number; limit?: number; is_active?: boolean }) {
  return useQuery<Staff[]>({
    queryKey: ['staff-by-designation', designationId, params],
    queryFn: () => fetchStaffByDesignation(designationId, params),
    enabled: !!designationId,
  });
}

// Drivers Hooks
export function useDrivers(params?: { skip?: number; limit?: number; is_active?: boolean }) {
  return useQuery<Staff[]>({
    queryKey: ['drivers', params],
    queryFn: () => fetchDrivers(params),
  });
}

// Staff Performance Hooks
export function useStaffPerformance(staffId: string, params?: { skip?: number; limit?: number; period_start?: string; period_end?: string }) {
  return useQuery<StaffPerformance[]>({
    queryKey: ['staff-performance', staffId, params],
    queryFn: () => fetchStaffPerformance(staffId, params),
    enabled: !!staffId,
  });
}

export function useCreateStaffPerformance() {
  const queryClient = useQueryClient();
  return useMutation<StaffPerformance, Error, StaffPerformanceInput>({
    mutationFn: createStaffPerformance,
    onSuccess: (data) => {
      toast.success('Performance review created successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff-performance', data.staff_id] });
    },
    onError: (error) => {
      toast.error(`Failed to create performance review: ${error.message}`);
    },
  });
}

export function useUpdateStaffPerformance() {
  const queryClient = useQueryClient();
  return useMutation<StaffPerformance, Error, { id: string; input: Partial<StaffPerformanceInput> }>({
    mutationFn: ({ id, input }) => updateStaffPerformance(id, input),
    onSuccess: (data) => {
      toast.success('Performance review updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff-performance', data.staff_id] });
    },
    onError: (error) => {
      toast.error(`Failed to update performance review: ${error.message}`);
    },
  });
}

// Staff Enrollment Mutation Hook
export function useStaffEnrollmentMutation() {
  const queryClient = useQueryClient();
  return useMutation<StaffEnrollmentResponse, Error, StaffEnrollmentRequest>({
    mutationFn: async (enrollmentData: StaffEnrollmentRequest): Promise<StaffEnrollmentResponse> => {
      const { data } = await CAxios.post<StaffEnrollmentResponse>('/staff/enrollment', enrollmentData);
      return data;
    },
    onSuccess: () => {
      toast.success('Staff enrolled successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
    },
    onError: (error: any) => {
      console.error('Staff enrollment error:', error);
      if (error.response?.status === 409) {
        toast.error('Email already exists');
      } else if (error.response?.status === 403) {
        toast.error('Permission denied: staff:create');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to enroll staff');
      }
    },
  });
}

// Staff Attendance Hooks
export function useStaffAttendance(params?: {
  start_date?: string;
  end_date?: string;
  name?: string;
  skip?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['staff-attendance', params],
    queryFn: () => getAllStaffAttendance(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useStaffAttendanceById(id: string) {
  return useQuery({
    queryKey: ['staff-attendance', id],
    queryFn: () => getStaffAttendanceById(id),
    enabled: !!id,
  });
}

export function useCreateStaffAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStaffAttendance,
    onSuccess: () => {
      toast.success('Staff attendance created successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create staff attendance');
    },
  });
}

export function useUpdateStaffAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StaffAttendanceUpdateRequest }) =>
      updateStaffAttendance(id, data),
    onSuccess: () => {
      toast.success('Staff attendance updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update staff attendance');
    },
  });
}

export function useDeleteStaffAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStaffAttendance,
    onSuccess: () => {
      toast.success('Staff attendance deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete staff attendance');
    },
  });
}

export function useStaffAttendanceByDateRange(staffId: string, params?: {
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ['staff-attendance', staffId, 'date-range', params],
    queryFn: () => getStaffAttendanceByDateRange(staffId, params),
    enabled: !!staffId,
  });
}