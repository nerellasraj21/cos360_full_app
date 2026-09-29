import axios from 'axios';
import CAxios from '../index';
import type { StudentTransportOut, StudentTransportCreate, StudentTransportUpdate } from '@/types/masters/studentTransport';

const STUDENT_TRANSPORT_API_BASE = '/students/student-transport/';

export const fetchStudentTransports = async (): Promise<StudentTransportOut[]> => {
    const { data } = await CAxios.get(STUDENT_TRANSPORT_API_BASE);
    return data;
};

export const fetchStudentTransportsByStudent = async (studentId: string): Promise<StudentTransportOut[]> => {
    try {
        const { data } = await CAxios.get(`${STUDENT_TRANSPORT_API_BASE}student/${studentId}`);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        // Backend returns 404 when no transport is assigned — treat as empty list
        if (axios.isAxiosError(error) && error.response?.status === 404) return [];
        throw error;
    }
};

export const createStudentTransport = async (transport: StudentTransportCreate): Promise<StudentTransportOut> => {
    const { data } = await CAxios.post(STUDENT_TRANSPORT_API_BASE, transport);
    return data;
};

export const updateStudentTransport = async (id: string, transport: StudentTransportUpdate): Promise<StudentTransportOut> => {
    const { data } = await CAxios.patch(`${STUDENT_TRANSPORT_API_BASE}${id}`, transport);
    return data;
};

export const deleteStudentTransport = async (id: string): Promise<void> => {
    await CAxios.delete(`${STUDENT_TRANSPORT_API_BASE}${id}`);
};