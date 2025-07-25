import CAxios from './index';
import type { Attendance } from '../types/attendance';

export const attendanceApi = {

  getAllAttendance: async () => {
    const response = await CAxios.get('/api/v1/attendance/');
    return response.data;
  },


  createAttendance: async (data: Omit<Attendance, 'id'>) => {
    const response = await CAxios.post('/api/v1/attendance/', data);
    return response.data;
  },


  getAttendance: async (id: number) => {
    const response = await CAxios.get(`/api/v1/attendance/${id}`);
    return response.data;
  },


  updateAttendance: async (id: number, status: string) => {
    const response = await CAxios.patch(`/api/v1/attendance/${id}`, { status });
    return response.data;
  },


  deleteAttendance: async (id: number) => {
    const response = await CAxios.delete(`/api/v1/attendance/${id}`);
    return response.data;
  },


  getAttendanceByDate: async (date: string, type: 'student' | 'teacher', classId?: number, sectionId?: number) => {
    let url = `/api/v1/attendance/?date=${date}&type=${type}`;
    if (type === 'student' && classId && sectionId) {
      url += `&class_id=${classId}&section_id=${sectionId}`;
    }
    const response = await CAxios.get(url);
    return response.data;
  },

  bulkSaveAttendance: async (records: Array<Omit<Attendance, 'id'>>) => {
    const response = await CAxios.post('/api/v1/attendance/bulk', records);
    return response.data;
  }
};