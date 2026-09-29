import { usePermissionProtectedQuery } from '@/hooks/usePermissionProtectedQuery';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import {
  fetchStudentTransports,
  fetchStudentTransportsByStudent,
  createStudentTransport,
  updateStudentTransport,
  deleteStudentTransport
} from '@/api/masters/studentTransport';
import {
  fetchStudentTransportById
} from '@/api/transport/index';
import type {
  StudentTransportOut,
  StudentTransportCreate,
  StudentTransportUpdate
} from '@/types/masters/studentTransport';
import { toast } from 'sonner';

/**
 * Hook to fetch all student transport assignments with optional filtering
 */
export function useStudentTransportAssignments(params?: {
  skip?: number;
  limit?: number;
  student_id?: string;
  route_id?: string;
  is_active?: boolean;
}) {
  return usePermissionProtectedQuery<StudentTransportOut[]>({
    resource: 'student-transport',
    action: 'list',
    queryKey: ['student-transport-assignments', params],
    queryFn: () => fetchStudentTransports(),
    onPermissionDenied: () => {
      toast.error('You do not have permission to view student transport assignments');
    },
  });
}

/**
 * Hook to fetch a single student transport assignment by ID
 */
export function useStudentTransportAssignment(id: string) {
  return usePermissionProtectedQuery<StudentTransportOut>({
    resource: 'student-transport',
    action: 'read',
    queryKey: ['student-transport-assignment', id],
    queryFn: () => fetchStudentTransportById(id),
    enabled: !!id,
    onPermissionDenied: () => {
      toast.error('You do not have permission to view this student transport assignment');
    },
  });
}

/**
 * Hook to fetch student transport assignments for a specific student
 */
export function useStudentTransportAssignmentsByStudent(studentId: string) {
  return usePermissionProtectedQuery<StudentTransportOut[]>({
    resource: 'student-transport',
    action: 'list',
    queryKey: ['student-transport-assignments-by-student', studentId],
    queryFn: () => fetchStudentTransportsByStudent(studentId),
    enabled: !!studentId,
    onPermissionDenied: () => {
      toast.error('You do not have permission to view student transport assignments');
    },
  });
}

/**
 * Hook to create a new student transport assignment
 */
export function useCreateStudentTransportAssignment() {
  return usePermissionProtectedMutation<StudentTransportOut, Error, StudentTransportCreate>({
    resource: 'student_transport',
    action: 'create',
    mutationFn: createStudentTransport,
    onSuccess: () => {
      toast.success('Student transport assignment created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create student transport assignment: ${error.message}`);
    },
    onPermissionDenied: () => {
      toast.error('You do not have permission to create student transport assignments');
    },
  });
}

/**
 * Hook to update an existing student transport assignment
 */
export function useUpdateStudentTransportAssignment() {
  return usePermissionProtectedMutation<StudentTransportOut, Error, { id: string; data: StudentTransportUpdate }>({
    resource: 'student-transport',
    action: 'update',
    mutationFn: ({ id, data }: { id: string; data: StudentTransportUpdate }) => updateStudentTransport(id, data),
    onSuccess: () => {
      toast.success('Student transport assignment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update student transport assignment: ${error.message}`);
    },
    onPermissionDenied: () => {
      toast.error('You do not have permission to update student transport assignments');
    },
  });
}

/**
 * Hook to delete a student transport assignment
 */
export function useDeleteStudentTransportAssignment() {
  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'student-transport',
    action: 'delete',
    mutationFn: deleteStudentTransport,
    onSuccess: () => {
      toast.success('Student transport assignment deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete student transport assignment: ${error.message}`);
    },
    onPermissionDenied: () => {
      toast.error('You do not have permission to delete student transport assignments');
    },
  });
}