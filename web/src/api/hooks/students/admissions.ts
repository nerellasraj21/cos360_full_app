import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CAxios from '@/api';
import { usePermissionProtectedQuery } from '@/hooks/usePermissionProtectedQuery';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import type {
  StudentAdmissionCreate,
  StudentAdmissionResponse,
  StudentAdmissionUpdate,
  StudentDropdownItem,
  StudentDropdownSimpleItem,
  StudentOut,
  AdmissionTypeOption
} from '@/types/admission';
import {
  createStudentAdmission,
  getAdmissionByStudentId,
  updateStudentAdmission,
  getStudentByAdmissionId,
  searchStudents,
  listAdmissions,
  toggleStudentActiveStatus,
  fetchStudentsDropdown,
  fetchStudentsDropdownSimple,
  fetchAdmissionTypesDropdown
} from '@/api/students/admissions';

// Types
interface AdmissionListResponse {
  items: StudentAdmissionResponse[];
  total_count: number;
  has_next: boolean;
}

// Query hooks
export function useAdmissions(params?: {
  skip?: number;
  limit?: number;
}) {
  return usePermissionProtectedQuery<AdmissionListResponse>({
    queryKey: ['admissions', params],
    queryFn: () => listAdmissions(params?.skip, params?.limit),
    resource: 'student_admissions',
    action: 'list',
  });
}

export function useAdmissionByStudentId(studentId: string) {
  return useQuery<StudentAdmissionResponse>({
    queryKey: ['admission', 'student', studentId],
    queryFn: () => getAdmissionByStudentId(studentId),
    enabled: !!studentId,
  });
}

export function useStudentByAdmissionId(admissionId: string) {
  return useQuery<StudentOut>({
    queryKey: ['student', 'admission', admissionId],
    queryFn: () => getStudentByAdmissionId(admissionId),
    enabled: !!admissionId,
  });
}

export function useStudentById(studentId: string) {
  return useQuery<StudentOut>({
    queryKey: ['student', 'detail', studentId],
    queryFn: async () => {
      const admission = await getAdmissionByStudentId(studentId);
      return admission.student;
    },
    enabled: !!studentId,
  });
}

export function useStudentAdmissionDetail(studentId: string) {
  return useQuery<StudentAdmissionResponse>({
    queryKey: ['student', 'admission', 'detail', studentId],
    queryFn: () => getAdmissionByStudentId(studentId),
    enabled: !!studentId,
  });
}

export function useStudentsSearch(query: string) {
  return usePermissionProtectedQuery<StudentOut[]>({
    queryKey: ['students', 'search', query],
    queryFn: () => searchStudents(query),
    enabled: !!query,
    resource: 'student_admissions',
    action: 'list',
  });
}

export function useStudentsDropdown(activeOnly = true) {
  return useQuery<StudentDropdownItem[]>({
    queryKey: ['students', 'dropdown', activeOnly],
    queryFn: () => fetchStudentsDropdown(activeOnly),
  });
}

export function useStudentsDropdownSimple(activeOnly = true) {
  return useQuery<StudentDropdownSimpleItem[]>({
    queryKey: ['students', 'dropdown-simple', activeOnly],
    queryFn: () => fetchStudentsDropdownSimple(activeOnly),
  });
}

export function useAdmissionTypesDropdown() {
  return useQuery<AdmissionTypeOption[]>({
    queryKey: ['admission-types', 'dropdown'],
    queryFn: fetchAdmissionTypesDropdown,
    staleTime: 10 * 60 * 1000, // 10 minutes - admission types rarely change
  });
}

// Mutation hooks
export function useCreateAdmission() {
  const queryClient = useQueryClient();
  return usePermissionProtectedMutation<StudentAdmissionResponse, Error, StudentAdmissionCreate>({
    mutationFn: createStudentAdmission,
    onSuccess: async (data) => {
      console.log('✅ Admission created successfully:', data);
      toast.success('Student admission created successfully!');

      // Invalidate and refetch all admission-related queries
      console.log('🔄 Invalidating queries...');
      await queryClient.invalidateQueries({
        queryKey: ['admissions'],
        refetchType: 'all' // Refetch all queries (active and inactive)
      });
      await queryClient.invalidateQueries({
        queryKey: ['students'],
        refetchType: 'all'
      });

      // Also explicitly refetch the admissions list query
      await queryClient.refetchQueries({
        queryKey: ['admissions', { skip: 0, limit: 50 }],
        type: 'all'
      });

      console.log('✅ Queries invalidated and refetched');
    },
    onError: (error) => {
      toast.error(`Failed to create admission: ${error.message}`);
    },
    resource: 'student_admissions',
    action: 'create',
  });
}

export function useUpdateAdmission() {
  const queryClient = useQueryClient();
  return usePermissionProtectedMutation<StudentAdmissionResponse, Error, { studentId: string; data: StudentAdmissionUpdate }>({
    mutationFn: ({ studentId, data }) => updateStudentAdmission(studentId, data),
    onSuccess: (data) => {
      toast.success('Student admission updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission', 'student', data.student_id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => {
      toast.error(`Failed to update admission: ${error.message}`);
    },
    resource: 'student_admissions',
    action: 'update',
  });
}

export function useToggleStudentStatus() {
  const queryClient = useQueryClient();
  return usePermissionProtectedMutation<StudentAdmissionResponse, Error, { studentId: string; isActive: boolean }>({
    mutationFn: ({ studentId, isActive }) => toggleStudentActiveStatus(studentId, isActive),
    onSuccess: (data, variables) => {
      const action = variables.isActive ? 'enabled' : 'disabled';
      toast.success(`Student ${action} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission', 'student', data.student_id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => {
      toast.error(`Failed to update student status: ${error.message}`);
    },
    resource: 'student_admissions',
    action: 'update',
  });
}