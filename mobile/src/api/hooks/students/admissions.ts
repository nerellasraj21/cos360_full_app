import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../../components/FeedbackToast';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import {
  studentAdmissionsApi,
  StudentAdmission,
  StudentAdmissionCreate,
  StudentAdmissionUpdate,
  StudentOut,
  StudentDropdownItem,
  StudentDropdownSimpleItem
} from '../../students';

interface PaginatedResponse<T> {
  items: T[];
  total_count: number;
  has_next: boolean;
}

// List admissions with pagination - permission protected
export function useAdmissions(params?: {
  skip?: number;
  limit?: number;
}) {
  return usePermissionProtectedQuery<PaginatedResponse<StudentAdmission>>({
    resource: PERMISSION_RESOURCES.STUDENT_ADMISSIONS,
    action: 'list',
    queryKey: ['admissions', params],
    queryFn: () => studentAdmissionsApi.listAdmissions(params),
  });
}

// Get admission by student ID - permission protected
export function useAdmissionByStudentId(studentId: string) {
  return usePermissionProtectedQuery<StudentAdmission>({
    resource: PERMISSION_RESOURCES.STUDENT_ADMISSIONS,
    action: 'read',
    queryKey: ['admission', 'student', studentId],
    queryFn: () => studentAdmissionsApi.getAdmissionByStudentId(studentId),
    enabled: !!studentId,
  });
}

// Get student by admission ID
export function useStudentByAdmissionId(admissionId: string) {
  return useQuery<StudentOut>({
    queryKey: ['student', 'admission', admissionId],
    queryFn: () => studentAdmissionsApi.getStudentByAdmissionId(admissionId),
    enabled: !!admissionId,
  });
}

// Create admission - permission protected
export function useCreateAdmission() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<StudentAdmission, Error, StudentAdmissionCreate>({
    resource: PERMISSION_RESOURCES.STUDENT_ADMISSIONS,
    action: 'create',
    mutationFn: studentAdmissionsApi.createStudentAdmission,
    onSuccess: () => {
      showSuccess('Success', 'Student admission created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: any) => {
      showError('Error', `Failed to create admission: ${error.message}`);
    },
  });
}

// Update admission - permission protected
export function useUpdateAdmission() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<StudentAdmission, Error, { studentId: string; data: StudentAdmissionUpdate }>({
    resource: PERMISSION_RESOURCES.STUDENT_ADMISSIONS,
    action: 'update',
    mutationFn: ({ studentId, data }) => studentAdmissionsApi.updateStudentAdmission(studentId, data),
    onSuccess: (data) => {
      showSuccess('Success', 'Student admission updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: any) => {
      showError('Error', `Failed to update admission: ${error.message}`);
    },
  });
}

// Delete admission - permission protected
export function useDeleteAdmission() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<{ message: string }, Error, string>({
    resource: PERMISSION_RESOURCES.STUDENT_ADMISSIONS,
    action: 'delete',
    mutationFn: studentAdmissionsApi.deleteStudentAdmission,
    onSuccess: () => {
      showSuccess('Success', 'Student admission deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: any) => {
      showError('Error', `Failed to delete admission: ${error.message}`);
    },
  });
}

// My admission
export function useMyAdmission() {
  return useQuery<StudentAdmission>({
    queryKey: ['my-admission'],
    queryFn: () => studentAdmissionsApi.myAdmission(),
  });
}

// My children admissions
export function useMyChildrenAdmissions() {
  return useQuery<StudentAdmission[]>({
    queryKey: ['my-children-admissions'],
    queryFn: () => studentAdmissionsApi.myChildrenAdmissions(),
  });
}

// Search students
export function useStudentsSearch(query: string) {
  return useQuery<StudentOut[]>({
    queryKey: ['students', 'search', query],
    queryFn: () => studentAdmissionsApi.searchStudents(query),
    enabled: !!query,
  });
}

// Students dropdowns
export function useStudentsDropdown(activeOnly = true) {
  return useQuery<StudentDropdownItem[]>({
    queryKey: ['students', 'dropdown', activeOnly],
    queryFn: () => studentAdmissionsApi.studentsDropdown({ active_only: activeOnly }),
  });
}

export function useStudentsDropdownSimple(activeOnly = true) {
  return useQuery<StudentDropdownSimpleItem[]>({
    queryKey: ['students', 'dropdown-simple', activeOnly],
    queryFn: () => studentAdmissionsApi.studentsDropdownSimple({ active_only: activeOnly }),
  });
}