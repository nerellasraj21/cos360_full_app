import CAxios from './index';
import type { Attendance, AttendanceRequest, AttendanceResponse } from '../types/attendance';

export const attendanceApi = {

  getAllAttendance: async () => {
    const response = await CAxios.get('/student/attendance/');
    return response.data;
  },

  createAttendance: async (data: Omit<Attendance, 'id'>) => {
    const response = await CAxios.post('/student/attendance/', data);
    return response.data;
  },

  getAttendance: async (id: number) => {
    const response = await CAxios.get(`/student/attendance/${id}`);
    return response.data;
  },

  updateAttendance: async (id: number, status: string) => {
    const response = await CAxios.patch(`/student/attendance/${id}`, { status });
    return response.data;
  },

  deleteAttendance: async (id: number) => {
    const response = await CAxios.delete(`/student/attendance/${id}`);
    return response.data;
  },

  getAttendanceByDate: async (date: string, type: 'student' | 'teacher', classId?: number, sectionId?: number) => {
    let url = `/student/attendance/?date=${date}&type=${type}`;
    if (type === 'student' && classId && sectionId) {
      url += `&class_id=${classId}&section_id=${sectionId}`;
    }
    const response = await CAxios.get(url);
    return response.data;
  },

  bulkSaveAttendance: async (records: Array<Omit<Attendance, 'id'>>) => {
    const response = await CAxios.post('/student/attendance/bulk', records);
    return response.data;
  },

  createStudentAttendance: async (data: AttendanceRequest): Promise<AttendanceResponse> => {
    const response = await CAxios.post('/student/attendance/', data);
    return response.data;
  }
};