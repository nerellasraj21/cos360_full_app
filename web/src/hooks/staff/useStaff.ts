import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { staffApi } from '@/api/staff/staff';
import type {
  Staff,
  StaffEnrollmentCreateRequest,
  StaffUpdateRequest,
  StaffListResponse,
  StaffAttendance,
  StaffAttendanceCreateRequest,
  StaffAttendanceUpdateRequest,
  StaffAttendanceListResponse,
  Designation,
  DesignationCreateRequest,
  DesignationUpdateRequest,
  DesignationListResponse,
  DesignationDropdown,
  StaffDriver
} from '@/types/staff/staff';

// Query keys for staff
export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: (params?: any) => [...staffKeys.lists(), params] as const,
  details: () => [...staffKeys.all, 'detail'] as const,
  detail: (id: string) => [...staffKeys.details(), id] as const,
  attendance: () => [...staffKeys.all, 'attendance'] as const,
  attendanceList: (params?: any) => [...staffKeys.attendance(), 'list', params] as const,
  attendanceDetail: (id: string) => [...staffKeys.attendance(), 'detail', id] as const,
  staffAttendance: (staffId: string) => [...staffKeys.detail(staffId), 'attendance'] as const,
  drivers: () => [...staffKeys.all, 'drivers'] as const,
  designations: () => [...staffKeys.all, 'designations'] as const,
  designationList: (params?: any) => [...staffKeys.designations(), 'list', params] as const,
  designationDetail: (id: string) => [...staffKeys.designations(), 'detail', id] as const,
  designationDropdown: () => [...staffKeys.designations(), 'dropdown'] as const,
};

// Staff Enrollment Hooks
export function useStaffEnrollments(params?: {
  skip?: number;
  limit?: number;
  gender?: string;
}) {
  return useQuery<Staff[] | StaffListResponse>({
    queryKey: staffKeys.list(params),
    queryFn: () => staffApi.getAllStaffEnrollments(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStaffEnrollment(id: string) {
  return useQuery<Staff>({
    queryKey: staffKeys.detail(id),
    queryFn: () => staffApi.getStaffEnrollmentById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStaffEnrollment() {
  const queryClient = useQueryClient();

  return useMutation<Staff, Error, StaffEnrollmentCreateRequest>({
    mutationFn: staffApi.createStaffEnrollment,
    onSuccess: (data) => {
      // Invalidate and refetch staff lists
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });

      // Add the new staff to the cache
      queryClient.setQueryData(staffKeys.detail(data.id), data);

      toast.success('Staff enrollment created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create staff enrollment: ${error.message}`);
    },
  });
}

export function useUpdateStaffEnrollment() {
  const queryClient = useQueryClient();

  return useMutation<Staff, Error, { id: string; data: StaffUpdateRequest }>({
    mutationFn: ({ id, data }) => staffApi.updateStaffEnrollment(id, data),
    onSuccess: (data) => {
      // Update the specific staff in cache
      queryClient.setQueryData(staffKeys.detail(data.id), data);

      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });

      toast.success('Staff enrollment updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update staff enrollment: ${error.message}`);
    },
  });
}

export function useDeleteStaffEnrollment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: staffApi.deleteStaffEnrollment,
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: staffKeys.detail(id) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });

      toast.success('Staff enrollment deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete staff enrollment: ${error.message}`);
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
  return useQuery<StaffAttendanceListResponse>({
    queryKey: staffKeys.attendanceList(params),
    queryFn: () => staffApi.getAllStaffAttendance(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStaffAttendanceById(id: string) {
  return useQuery<StaffAttendance>({
    queryKey: staffKeys.attendanceDetail(id),
    queryFn: () => staffApi.getStaffAttendanceById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStaffAttendanceByDateRange(staffId: string, params?: {
  start_date?: string;
  end_date?: string;
}) {
  return useQuery<StaffAttendance[]>({
    queryKey: staffKeys.staffAttendance(staffId),
    queryFn: () => staffApi.getStaffAttendanceByDateRange(staffId, params),
    enabled: !!staffId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStaffAttendance() {
  const queryClient = useQueryClient();

  return useMutation<StaffAttendance, Error, StaffAttendanceCreateRequest>({
    mutationFn: staffApi.createStaffAttendance,
    onSuccess: () => {
      // Invalidate attendance lists
      queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });

      toast.success('Staff attendance recorded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to record staff attendance: ${error.message}`);
    },
  });
}

export function useUpdateStaffAttendance() {
  const queryClient = useQueryClient();

  return useMutation<StaffAttendance, Error, { id: string; data: StaffAttendanceUpdateRequest }>({
    mutationFn: ({ id, data }) => staffApi.updateStaffAttendance(id, data),
    onSuccess: () => {
      // Invalidate attendance lists
      queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });

      toast.success('Staff attendance updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update staff attendance: ${error.message}`);
    },
  });
}

export function useDeleteStaffAttendance() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: staffApi.deleteStaffAttendance,
    onSuccess: () => {
      // Invalidate attendance lists
      queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });

      toast.success('Staff attendance deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete staff attendance: ${error.message}`);
    },
  });
}

// Staff Query Hooks
export function useStaffByGender(gender: string) {
  return useQuery<Staff[]>({
    queryKey: [...staffKeys.list(), 'gender', gender],
    queryFn: () => staffApi.getStaffByGender(gender),
    enabled: !!gender,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStaffByDesignation(designationId: string) {
  return useQuery<Staff[]>({
    queryKey: [...staffKeys.list(), 'designation', designationId],
    queryFn: () => staffApi.getStaffByDesignation(designationId),
    enabled: !!designationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDrivers() {
  return useQuery<StaffDriver[]>({
    queryKey: staffKeys.drivers(),
    queryFn: () => staffApi.getAllDrivers(),
    staleTime: 5 * 60 * 1000,
  });
}

// Designation Hooks
export function useDesignations(params?: {
  skip?: number;
  limit?: number;
}) {
  return useQuery<DesignationListResponse>({
    queryKey: staffKeys.designationList(params),
    queryFn: () => staffApi.getAllDesignations(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDesignation(id: string) {
  return useQuery<Designation>({
    queryKey: staffKeys.designationDetail(id),
    queryFn: () => staffApi.getDesignationById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDesignationsDropdown() {
  return useQuery<DesignationDropdown[]>({
    queryKey: staffKeys.designationDropdown(),
    queryFn: () => staffApi.getDesignationsDropdown(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDesignation() {
  const queryClient = useQueryClient();

  return useMutation<Designation, Error, DesignationCreateRequest>({
    mutationFn: staffApi.createDesignation,
    onSuccess: (data) => {
      // Invalidate designation lists
      queryClient.invalidateQueries({ queryKey: staffKeys.designations() });

      // Add the new designation to the cache
      queryClient.setQueryData(staffKeys.designationDetail(data.id), data);

      toast.success('Designation created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create designation: ${error.message}`);
    },
  });
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient();

  return useMutation<Designation, Error, { id: string; data: DesignationUpdateRequest }>({
    mutationFn: ({ id, data }) => staffApi.updateDesignation(id, data),
    onSuccess: (data) => {
      // Update the specific designation in cache
      queryClient.setQueryData(staffKeys.designationDetail(data.id), data);

      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: staffKeys.designations() });

      toast.success('Designation updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update designation: ${error.message}`);
    },
  });
}

export function useDeleteDesignation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: staffApi.deleteDesignation,
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: staffKeys.designationDetail(id) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: staffKeys.designations() });

      toast.success('Designation deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete designation: ${error.message}`);
    },
  });
}