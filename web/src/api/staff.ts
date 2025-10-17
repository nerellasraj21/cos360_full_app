import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CAxios from './index';
import type { Staff, StaffInput, StaffEnrollmentRequest, StaffEnrollmentResponse, Designation, DesignationInput, StaffPerformance, StaffPerformanceInput } from '@/types/staff';
import { STAFF_DESIGNATIONS, STAFF_DESIGNATIONS_DROPDOWN, STAFF_BY_DESIGNATION, STAFF_DRIVERS } from '@/constants/api/staff';

// Staff types
export interface Enrollment {
  id: string;
  staff_id: string;
  enrollment_date: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EnrollmentInput {
  staff_id: string;
  enrollment_date: string;
  status?: string;
  notes?: string;
}

// Staff CRUD operations
export async function fetchStaff(params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
}): Promise<Staff[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

  const { data } = await CAxios.get<Staff[]>(`/staff/?${queryParams.toString()}`);
  return data;
}

export async function fetchStaffById(id: number): Promise<Staff> {
  const { data } = await CAxios.get<Staff>(`/staff/${id}`);
  return data;
}

export async function createStaff(staffData: StaffInput): Promise<Staff> {
  const { data } = await CAxios.post<Staff>('/staff/', staffData);
  return data;
}

export async function updateStaff(id: number, staffData: Partial<StaffInput>): Promise<Staff> {
  const { data } = await CAxios.put<Staff>(`/staff/${id}`, staffData);
  return data;
}

export async function deleteStaff(id: number): Promise<void> {
  await CAxios.delete(`/staff/${id}`);
}

// Staff dropdown
export async function fetchStaffDropdown(): Promise<Staff[]> {
  const { data } = await CAxios.get<Staff[]>('/staff/dropdown');
  return data;
}

// Staff attendance
export async function createStaffAttendance(attendanceData: any): Promise<any> {
  const { data } = await CAxios.post('/staff/attendance/', attendanceData);
  return data;
}

export async function fetchStaffAttendance(params?: {
  staff_id?: number;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
}): Promise<any[]> {
  const queryParams = new URLSearchParams();
  if (params?.staff_id !== undefined) queryParams.append('staff_id', params.staff_id.toString());
  if (params?.date_from) queryParams.append('date_from', params.date_from);
  if (params?.date_to) queryParams.append('date_to', params.date_to);
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

  const { data } = await CAxios.get<any[]>(`/staff/attendance/?${queryParams.toString()}`);
  return data;
}

// Staff Enrollment operations
export async function fetchEnrollments(params?: {
  skip?: number;
  limit?: number;
  staff_id?: number;
}): Promise<Enrollment[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.staff_id !== undefined) queryParams.append('staff_id', params.staff_id.toString());

  const { data } = await CAxios.get<Enrollment[]>(`/staff/enrollments/?${queryParams.toString()}`);
  return data;
}

export async function fetchEnrollmentByStaffId(staffId: number): Promise<Enrollment | null> {
  const { data } = await CAxios.get<Enrollment>(`/staff/enrollments/staff/${staffId}`);
  return data;
}

export async function createEnrollment(enrollmentData: EnrollmentInput): Promise<Enrollment> {
  const { data } = await CAxios.post<Enrollment>('/staff/enrollments/', enrollmentData);
  return data;
}

export async function updateEnrollment(staffId: number, enrollmentData: Partial<EnrollmentInput>): Promise<Enrollment> {
  const { data } = await CAxios.put<Enrollment>(`/staff/enrollments/staff/${staffId}`, enrollmentData);
  return data;
}

export async function deleteEnrollment(staffId: number): Promise<void> {
  await CAxios.delete(`/staff/enrollments/staff/${staffId}`);
}

// React Query hooks
export function useStaff(params?: { skip?: number; limit?: number; is_active?: boolean }) {
  return useQuery({
    queryKey: ['staff', params],
    queryFn: () => fetchStaff(params),
  });
}

export function useStaffMember(id: number) {
  return useQuery({
    queryKey: ['staff', id],
    queryFn: () => fetchStaffById(id),
    enabled: !!id,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<StaffInput> }) => updateStaff(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useStaffDropdown() {
  return useQuery({
    queryKey: ['staff-dropdown'],
    queryFn: fetchStaffDropdown,
  });
}

export function useEnrollments(params?: { skip?: number; limit?: number; staff_id?: number }) {
  return useQuery({
    queryKey: ['staff-enrollments', params],
    queryFn: () => fetchEnrollments(params),
  });
}

export function useEnrollment(staffId: number) {
  return useQuery({
    queryKey: ['staff-enrollment', staffId],
    queryFn: () => fetchEnrollmentByStaffId(staffId),
    enabled: !!staffId,
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
    },
  });
}

export function useUpdateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, input }: { staffId: number; input: Partial<EnrollmentInput> }) => updateEnrollment(staffId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['staff-enrollment', data.staff_id] });
    },
  });
}

export function useDeleteEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEnrollment,
    onSuccess: (_, staffId) => {
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['staff-enrollment', staffId] });
    },
  });
}

// Staff Enrollment API endpoint (legacy)
export function useStaffEnrollmentMutation() {
  return useMutation({
    mutationFn: async (enrollmentData: StaffEnrollmentRequest): Promise<StaffEnrollmentResponse> => {
      const { data } = await CAxios.post<StaffEnrollmentResponse>('/staff/enrollment', enrollmentData);
      return data;
    },
    onError: (error: any) => {
      console.error('Staff enrollment error:', error);
      if (error.response?.status === 409) {
        throw new Error('Email already exists');
      }
      if (error.response?.status === 403) {
        throw new Error('Permission denied: staff:create');
      }
      throw new Error(error.response?.data?.detail || 'Failed to enroll staff');
    },
  });
}

// Designation Management
export async function fetchDesignations(params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
}): Promise<Designation[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

  const { data } = await CAxios.get<Designation[]>(`${STAFF_DESIGNATIONS}?${queryParams.toString()}`);
  return data;
}

export async function fetchDesignationById(id: string): Promise<Designation> {
  const { data } = await CAxios.get<Designation>(`${STAFF_DESIGNATIONS}${id}`);
  return data;
}

export async function createDesignation(designationData: DesignationInput): Promise<Designation> {
  const { data } = await CAxios.post<Designation>(STAFF_DESIGNATIONS, designationData);
  return data;
}

export async function updateDesignation(id: string, designationData: Partial<DesignationInput>): Promise<Designation> {
  const { data } = await CAxios.put<Designation>(`${STAFF_DESIGNATIONS}${id}`, designationData);
  return data;
}

export async function deleteDesignation(id: string): Promise<void> {
  await CAxios.delete(`${STAFF_DESIGNATIONS}${id}`);
}

export async function fetchDesignationsDropdown(): Promise<Designation[]> {
  const { data } = await CAxios.get<Designation[]>(STAFF_DESIGNATIONS_DROPDOWN);
  return data;
}

// Staff by Designation
export async function fetchStaffByDesignation(designationId: string, params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
}): Promise<Staff[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('designation_id', designationId);
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

  const { data } = await CAxios.get<Staff[]>(`${STAFF_BY_DESIGNATION}?${queryParams.toString()}`);
  return data;
}

// Drivers (subset of staff)
export async function fetchDrivers(params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
}): Promise<Staff[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

  const { data } = await CAxios.get<Staff[]>(`${STAFF_DRIVERS}?${queryParams.toString()}`);
  return data;
}

// Staff Performance Tracking
export async function fetchStaffPerformance(staffId: string, params?: {
  skip?: number;
  limit?: number;
  period_start?: string;
  period_end?: string;
}): Promise<StaffPerformance[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.period_start) queryParams.append('period_start', params.period_start);
  if (params?.period_end) queryParams.append('period_end', params.period_end);

  const { data } = await CAxios.get<StaffPerformance[]>(`/staff/${staffId}/performance?${queryParams.toString()}`);
  return data;
}

export async function createStaffPerformance(performanceData: StaffPerformanceInput): Promise<StaffPerformance> {
  const { data } = await CAxios.post<StaffPerformance>('/staff/performance', performanceData);
  return data;
}

export async function updateStaffPerformance(id: string, performanceData: Partial<StaffPerformanceInput>): Promise<StaffPerformance> {
  const { data } = await CAxios.put<StaffPerformance>(`/staff/performance/${id}`, performanceData);
  return data;
}

// React Query hooks for Designations
export function useDesignations(params?: { skip?: number; limit?: number; is_active?: boolean }) {
  return useQuery({
    queryKey: ['designations', params],
    queryFn: () => fetchDesignations(params),
  });
}

export function useDesignation(id: string) {
  return useQuery({
    queryKey: ['designation', id],
    queryFn: () => fetchDesignationById(id),
    enabled: !!id,
  });
}

export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDesignation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
  });
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DesignationInput> }) => updateDesignation(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
  });
}

export function useDeleteDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDesignation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
    },
  });
}

export function useDesignationsDropdown() {
  return useQuery({
    queryKey: ['designations-dropdown'],
    queryFn: fetchDesignationsDropdown,
  });
}

// React Query hooks for Staff by Designation
export function useStaffByDesignation(designationId: string, params?: { skip?: number; limit?: number; is_active?: boolean }) {
  return useQuery({
    queryKey: ['staff-by-designation', designationId, params],
    queryFn: () => fetchStaffByDesignation(designationId, params),
    enabled: !!designationId,
  });
}

// React Query hooks for Drivers
export function useDrivers(params?: { skip?: number; limit?: number; is_active?: boolean }) {
  return useQuery({
    queryKey: ['drivers', params],
    queryFn: () => fetchDrivers(params),
  });
}

// React Query hooks for Staff Performance
export function useStaffPerformance(staffId: string, params?: { skip?: number; limit?: number; period_start?: string; period_end?: string }) {
  return useQuery({
    queryKey: ['staff-performance', staffId, params],
    queryFn: () => fetchStaffPerformance(staffId, params),
    enabled: !!staffId,
  });
}

export function useCreateStaffPerformance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStaffPerformance,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-performance', data.staff_id] });
    },
  });
}

export function useUpdateStaffPerformance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<StaffPerformanceInput> }) => updateStaffPerformance(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-performance', data.staff_id] });
    },
  });
}