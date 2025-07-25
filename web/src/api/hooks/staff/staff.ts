import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { Staff, StaffInput } from '@/types/staff';
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
  type EnrollmentInput
} from '@/api/staff';

// Staff Hooks
export function useStaff() {
  return useQuery<Staff[]>({
    queryKey: ['staff'],
    queryFn: fetchStaff,
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
    queryFn: fetchEnrollments,
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
  return useMutation<Enrollment, Error, { staffId: number; input: EnrollmentInput }>({
    mutationFn: ({ staffId, input }) => createEnrollment(staffId, input),
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