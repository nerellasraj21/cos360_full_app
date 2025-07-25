import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../attendance';
import type { Attendance } from '../../types/attendance';

export const useAttendanceQueries = () => {
  const queryClient = useQueryClient();

  const getAllAttendance = useQuery({
    queryKey: ['attendance'],
    queryFn: attendanceApi.getAllAttendance,
  });

  const getAttendanceByDate = (date: string, type: 'student' | 'teacher', classId?: number, sectionId?: number) => {
    return useQuery({
      queryKey: ['attendance', date, type, classId, sectionId],
      queryFn: () => attendanceApi.getAttendanceByDate(date, type, classId, sectionId),
      enabled: !!date && !!type && (type !== 'student' || (!!classId && !!sectionId)),
    });
  };

  const createAttendanceMutation = useMutation({
    mutationFn: (data: Omit<Attendance, 'id'>) => attendanceApi.createAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      attendanceApi.updateAttendance(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: (id: number) => attendanceApi.deleteAttendance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const bulkSaveAttendanceMutation = useMutation({
    mutationFn: (records: Array<Omit<Attendance, 'id'>>) => 
      attendanceApi.bulkSaveAttendance(records),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  return {
    getAllAttendance,
    getAttendanceByDate,
    createAttendanceMutation,
    updateAttendanceMutation,
    deleteAttendanceMutation,
    bulkSaveAttendanceMutation,
  };
};