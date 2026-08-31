import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  StudentAttendanceOut,
  BulkAttendanceUpdate
} from '@/types/attendance';
import {
  createAttendance,
  getStudentAttendance,
  getAttendanceByDate,
  bulkUpdateAttendanceByDate
} from '@/api/students/attendance';

// Create attendance hook
export function useCreateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAttendance,
    onSuccess: () => {
      toast.success('Attendance created successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create attendance: ${error.message}`);
    },
  });
}

// Get attendance by date hook
export function useAttendanceByDate(date: string) {
  return useQuery<StudentAttendanceOut[]>({
    queryKey: ['attendance', 'date', date],
    queryFn: () => getAttendanceByDate(date),
    enabled: !!date,
  });
}

// Get student attendance history
// NOTE: Backend requires both start_date and end_date (422 if missing)
export function useStudentAttendance(
  studentId: string,
  params?: {
    start_date?: string;
    end_date?: string;
  }
) {
  return useQuery<StudentAttendanceOut[]>({
    queryKey: ['attendance', 'student', studentId, params],
    queryFn: () => getStudentAttendance(studentId, params),
    enabled: !!studentId && !!params?.start_date && !!params?.end_date,
  });
}

// Bulk update attendance by date hook
export function useBulkUpdateAttendanceByDate() {
  const queryClient = useQueryClient();
  return useMutation<StudentAttendanceOut[], Error, {
    date: string;
    records: BulkAttendanceUpdate[];
  }>({
    mutationFn: ({ date, records }) => bulkUpdateAttendanceByDate(date, records),
    onSuccess: () => {
      toast.success('Bulk attendance updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => {
      toast.error(`Failed to update bulk attendance: ${error.message}`);
    },
  });
}

// Get class attendance for a date (using attendance by date and filtering)
export function useClassAttendance(
  classId: string,
  sectionId: string,
  date: string
) {
  return useQuery<StudentAttendanceOut[]>({
    queryKey: ['attendance', 'class', classId, 'section', sectionId, date],
    queryFn: () => getAttendanceByDate(date),
    enabled: !!classId && !!sectionId && !!date,
  });
}

// Get attendance summary for a student
export function useStudentAttendanceSummary(
  studentId: string,
  academicYearId?: string
) {
  return useQuery<{
    total_days: number;
    present_days: number;
    absent_days: number;
    late_days: number;
    half_days: number;
    attendance_percentage: number;
  }>({
    queryKey: ['attendance', 'summary', studentId, academicYearId],
    queryFn: async () => {
      const response = await getStudentAttendance(studentId, {
        start_date: academicYearId ? `${academicYearId}-04-01` : undefined,
        end_date: academicYearId ? `${academicYearId}-03-31` : undefined,
      });

      const total_days = response.length;
      const present_days = response.filter(a => a.status === 'present').length;
      const absent_days = response.filter(a => a.status === 'absent').length;
      const late_days = response.filter(a => a.status === 'late').length;
      const half_days = response.filter(a => a.status === 'half_day').length;

      return {
        total_days,
        present_days,
        absent_days,
        late_days,
        half_days,
        // half-day counts as 0.5 present, matching the backend stats formula
        attendance_percentage: total_days > 0 ? ((present_days + half_days * 0.5) / total_days) * 100 : 0,
      };
    },
    enabled: !!studentId,
  });
}