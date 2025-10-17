import CAxios from '../index';
import type { StudentTrip, StudentTripInput, StudentTripUpdateInput } from '@/types/masters/studentTrips';

const STUDENT_TRIPS_API_BASE = '/students/student-transport/';

export const fetchStudentTrips = async (): Promise<StudentTrip[]> => {
    const { data } = await CAxios.get(STUDENT_TRIPS_API_BASE);
    return data;
};

export const fetchStudentTripById = async (id: string): Promise<StudentTrip> => {
    const { data } = await CAxios.get(`${STUDENT_TRIPS_API_BASE}${id}`);
    return data;
};

export const createStudentTrip = async (trip: StudentTripInput): Promise<StudentTrip> => {
    const { data } = await CAxios.post(STUDENT_TRIPS_API_BASE, trip);
    return data;
};

export const updateStudentTrip = async (id: string, trip: StudentTripInput): Promise<StudentTrip> => {
    const { data } = await CAxios.put(`${STUDENT_TRIPS_API_BASE}${id}`, trip);
    return data;
};

export const patchStudentTrip = async (id: string, trip: StudentTripUpdateInput): Promise<StudentTrip> => {
    const { data } = await CAxios.patch(`${STUDENT_TRIPS_API_BASE}${id}`, trip);
    return data;
};

export const deleteStudentTrip = async (id: string): Promise<{ message: string }> => {
    const { data } = await CAxios.delete(`${STUDENT_TRIPS_API_BASE}${id}`);
    return data;
};