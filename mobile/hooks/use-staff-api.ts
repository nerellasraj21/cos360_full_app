import { 
  usePermissionProtectedQuery, 
  usePermissionProtectedMutation,
  usePermissionProtectedListQuery,
  usePermissionProtectedReadQuery,
  usePermissionProtectedCreateMutation,
  usePermissionProtectedUpdateMutation,
  usePermissionProtectedDeleteMutation
} from './use-permission-protected-api';
import { 
  staffApi, 
  staffAttendanceApi, 
  designationsApi, 
  staffProfileApi 
} from '@/src/api/staff';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import type { 
  Staff, 
  StaffInput, 
  StaffAttendance, 
  StaffAttendanceInput, 
  Designation, 
  DesignationInput,
  StaffProfile 
} from '@/src/types/masters/staff';

// Staff Enrollment Hooks
export const useStaffEnrollments = (params?: {
  skip?: number;
  limit?: number;
  gender?: string;
  is_active?: boolean; // Added to support filtering active staff for attendance
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.STAFF,
    ['staff-enrollments', params],
    () => staffApi.getStaffEnrollments(params)
  );
};

export const useStaffEnrollmentById = (id: string, enabled = true) => {
  return usePermissionProtectedReadQuery(
    PERMISSION_RESOURCES.STAFF,
    ['staff-enrollment', id],
    () => staffApi.getStaffEnrollmentById(id),
    { enabled: enabled && !!id }
  );
};

export const useCreateStaffEnrollment = (options?: any) => {
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.STAFF,
    (data: StaffInput) => staffApi.createStaffEnrollment(data),
    options
  );
};

export const useUpdateStaffEnrollment = (options?: any) => {
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.STAFF,
    ({ id, data }: { id: string; data: Partial<StaffInput> }) => 
      staffApi.updateStaffEnrollment(id, data),
    options
  );
};

export const useDeleteStaffEnrollment = (options?: any) => {
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.STAFF,
    (id: string) => staffApi.deleteStaffEnrollment(id),
    options
  );
};

// Staff Attendance Hooks
export const useStaffAttendance = (params?: {
  start_date?: string;
  end_date?: string;
  name?: string;
  skip?: number;
  limit?: number;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.STAFF_ATTENDANCE,
    ['staff-attendance', params],
    () => staffAttendanceApi.getStaffAttendance(params)
  );
};

export const useStaffAttendanceByDateRange = (
  staffId: string, 
  params: { start_date: string; end_date: string },
  enabled = true
) => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.STAFF_ATTENDANCE,
    action: 'read',
    queryKey: ['staff-attendance-range', staffId, params],
    queryFn: () => staffAttendanceApi.getStaffAttendanceByDateRange(staffId, params),
    enabled: enabled && !!staffId
  });
};

export const useCreateStaffAttendance = (options?: any) => {
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.STAFF_ATTENDANCE,
    (data: StaffAttendanceInput) => staffAttendanceApi.createStaffAttendance(data),
    options
  );
};

export const useUpdateStaffAttendance = (options?: any) => {
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.STAFF_ATTENDANCE,
    ({ id, data }: { id: string; data: Partial<StaffAttendanceInput> }) => 
      staffAttendanceApi.updateStaffAttendance(id, data),
    options
  );
};

export const useDeleteStaffAttendance = (options?: any) => {
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.STAFF_ATTENDANCE,
    (id: string) => staffAttendanceApi.deleteStaffAttendance(id),
    options
  );
};

// Staff Designations Hooks
export const useDesignations = (params?: {
  skip?: number;
  limit?: number;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.STAFF_DESIGNATIONS,
    ['designations', params],
    () => designationsApi.getDesignations(params)
  );
};

export const useDesignationsDropdown = () => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.STAFF_DESIGNATIONS,
    action: 'list',
    queryKey: ['designations-dropdown'],
    queryFn: () => designationsApi.getDesignationsDropdown()
  });
};

export const useDesignationById = (id: string, enabled = true) => {
  return usePermissionProtectedReadQuery(
    PERMISSION_RESOURCES.STAFF_DESIGNATIONS,
    ['designation', id],
    () => designationsApi.getDesignationById(id),
    { enabled: enabled && !!id }
  );
};

export const useCreateDesignation = (options?: any) => {
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.STAFF_DESIGNATIONS,
    (data: DesignationInput) => designationsApi.createDesignation(data),
    options
  );
};

export const useUpdateDesignation = (options?: any) => {
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.STAFF_DESIGNATIONS,
    ({ id, data }: { id: string; data: Partial<DesignationInput> }) => 
      designationsApi.updateDesignation(id, data),
    options
  );
};

export const useDeleteDesignation = (options?: any) => {
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.STAFF_DESIGNATIONS,
    (id: string) => designationsApi.deleteDesignation(id),
    options
  );
};

// Staff Profile Hooks
export const useStaffProfile = () => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.STAFF,
    action: 'read_own',
    queryKey: ['staff-profile'],
    queryFn: () => staffProfileApi.getStaffProfile()
  });
};

export const useUpdateStaffProfile = (options?: any) => {
  return usePermissionProtectedMutation<StaffProfile, Error, { email?: string; phone?: string }>({
    resource: PERMISSION_RESOURCES.STAFF,
    action: 'update_own',
    mutationFn: (data: { email?: string; phone?: string }) => 
      staffProfileApi.updateStaffProfile(data),
    ...options
  });
};

// Bulk Operations Hooks
export const useBulkUpdateStaffAttendance = (options?: any) => {
  return usePermissionProtectedMutation<StaffAttendance[], Error, Record<string, StaffAttendanceInput>>({
    resource: PERMISSION_RESOURCES.STAFF_ATTENDANCE,
    action: 'update',
    mutationFn: async (updates: Record<string, StaffAttendanceInput>) => {
      const promises = Object.entries(updates).map(([id, data]) =>
        staffAttendanceApi.updateStaffAttendance(id, data)
      );
      return await Promise.all(promises);
    },
    ...options
  });
};

// Combined hooks for common use cases
export const useStaffManagement = () => {
  const staffQuery = useStaffEnrollments();
  const createMutation = useCreateStaffEnrollment();
  const updateMutation = useUpdateStaffEnrollment();
  const deleteMutation = useDeleteStaffEnrollment();

  return {
    staff: staffQuery.data?.items || [],
    isLoading: staffQuery.isLoading,
    error: staffQuery.error,
    hasPermission: staffQuery.hasPermission,
    refetch: staffQuery.refetch,
    createStaff: createMutation.mutate,
    updateStaff: updateMutation.mutate,
    deleteStaff: deleteMutation.mutate,
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
  };
};

export const useDesignationManagement = () => {
  const designationsQuery = useDesignations();
  const createMutation = useCreateDesignation();
  const updateMutation = useUpdateDesignation();
  const deleteMutation = useDeleteDesignation();

  return {
    designations: designationsQuery.data?.items || [],
    isLoading: designationsQuery.isLoading,
    error: designationsQuery.error,
    hasPermission: designationsQuery.hasPermission,
    refetch: designationsQuery.refetch,
    createDesignation: createMutation.mutate,
    updateDesignation: updateMutation.mutate,
    deleteDesignation: deleteMutation.mutate,
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
  };
};

export const useStaffAttendanceManagement = (params?: {
  start_date?: string;
  end_date?: string;
  name?: string;
}) => {
  const attendanceQuery = useStaffAttendance(params);
  const updateMutation = useUpdateStaffAttendance();
  const bulkUpdateMutation = useBulkUpdateStaffAttendance();

  return {
    attendance: attendanceQuery.data?.items || [],
    isLoading: attendanceQuery.isLoading,
    error: attendanceQuery.error,
    hasPermission: attendanceQuery.hasPermission,
    refetch: attendanceQuery.refetch,
    updateAttendance: updateMutation.mutate,
    bulkUpdateAttendance: bulkUpdateMutation.mutate,
    isUpdating: updateMutation.isLoading,
    isBulkUpdating: bulkUpdateMutation.isLoading,
  };
};