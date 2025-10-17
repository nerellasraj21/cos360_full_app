import CAxios from '../index';
import type { StudentTransport, StudentTransportInput, StudentTransportUpdateInput } from '@/types/masters/studentTransport';

const STUDENT_TRANSPORT_API_BASE = '/students/student-transport/';

export const fetchStudentTransports = async (): Promise<StudentTransport[]> => {
    const { data } = await CAxios.get(STUDENT_TRANSPORT_API_BASE);
    return data;
};

export const fetchStudentTransportsByStudent = async (studentId: string): Promise<StudentTransport[]> => {
    const { data } = await CAxios.get(`${STUDENT_TRANSPORT_API_BASE}student/${studentId}`);
    return data;
};

export const createStudentTransport = async (transport: StudentTransportInput): Promise<StudentTransport> => {
    const { data } = await CAxios.post(STUDENT_TRANSPORT_API_BASE, transport);
    return data;
};

export const updateStudentTransport = async (id: string, transport: StudentTransportUpdateInput): Promise<StudentTransport> => {
    const { data } = await CAxios.patch(`${STUDENT_TRANSPORT_API_BASE}${id}`, transport);
    return data;
};

export const deleteStudentTransport = async (id: string): Promise<void> => {
    await CAxios.delete(`${STUDENT_TRANSPORT_API_BASE}${id}`);
};