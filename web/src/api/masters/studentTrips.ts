import type { StudentTrip, StudentTripInput, StudentTripUpdateInput } from '@/types/masters/studentTrips';
// import CAxios from '../index';

// const STUDENT_TRIPS_API_BASE = '/api/v1/student-trips/';

// export const fetchStudentTrips = async (): Promise<StudentTrip[]> => {
//     const { data } = await CAxios.get(STUDENT_TRIPS_API_BASE);
//     return data;
// };

// export const fetchStudentTripById = async (id: number): Promise<StudentTrip> => {
//     const { data } = await CAxios.get(`${STUDENT_TRIPS_API_BASE}${id}`);
//     return data;
// };

// export const createStudentTrip = async (trip: StudentTripInput): Promise<StudentTrip> => {
//     const { data } = await CAxios.post(STUDENT_TRIPS_API_BASE, trip);
//     return data;
// };

// export const updateStudentTrip = async (id: number, trip: StudentTripInput): Promise<StudentTrip> => {
//     const { data } = await CAxios.put(`${STUDENT_TRIPS_API_BASE}${id}`, trip);
//     return data;
// };

// export const patchStudentTrip = async (id: number, trip: StudentTripUpdateInput): Promise<StudentTrip> => {
//     const { data } = await CAxios.patch(`${STUDENT_TRIPS_API_BASE}${id}`, trip);
//     return data;
// };

// export const deleteStudentTrip = async (id: number): Promise<string> => {
//     const { data } = await CAxios.delete(`${STUDENT_TRIPS_API_BASE}${id}`);
//     return data;
// };

// Dummy data for development
export const dummyStudentTrips: StudentTrip[] = [
    {
        id: 1,
        trip_id: 101,
        student_id: 201,
        stop_id: 5,
        fee_term_id: 1,
        fee_per_term: 750,
        is_active: true,
    },
    {
        id: 2,
        trip_id: 102,
        student_id: 202,
        stop_id: 3,
        fee_term_id: 1,
        fee_per_term: 650,
        is_active: true,
    },
    {
        id: 3,
        trip_id: 103,
        student_id: 203,
        stop_id: 7,
        fee_term_id: 2,
        fee_per_term: 800,
        is_active: false,
    },
    {
        id: 4,
        trip_id: 101,
        student_id: 204,
        stop_id: 2,
        fee_term_id: 1,
        fee_per_term: 700,
        is_active: true,
    },
];

let studentTripsData: StudentTrip[] = [...dummyStudentTrips];

export const fetchStudentTrips = async (): Promise<StudentTrip[]> => {
    return [...studentTripsData];
};

export const fetchStudentTripById = async (id: number): Promise<StudentTrip> => {
    const trip = studentTripsData.find(t => t.id === id);
    if (!trip) throw new Error('Student trip not found');
    return { ...trip };
};

export const createStudentTrip = async (trip: StudentTripInput): Promise<StudentTrip> => {
    const newId = studentTripsData.length ? Math.max(...studentTripsData.map(t => t.id)) + 1 : 1;
    const newTrip: StudentTrip = {
        id: newId,
        ...trip,
        is_active: trip.is_active ?? true
    };
    studentTripsData.push(newTrip);
    return { ...newTrip };
};

export const updateStudentTrip = async (id: number, trip: StudentTripInput): Promise<StudentTrip> => {
    const idx = studentTripsData.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Student trip not found');

    const updatedTrip = {
        id,
        ...trip,
        is_active: trip.is_active ?? true
    };
    studentTripsData[idx] = updatedTrip;
    return { ...updatedTrip };
};

export const patchStudentTrip = async (id: number, trip: StudentTripUpdateInput): Promise<StudentTrip> => {
    const idx = studentTripsData.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Student trip not found');

    const updatedTrip = {
        ...studentTripsData[idx],
        ...trip
    };
    studentTripsData[idx] = updatedTrip;
    return { ...updatedTrip };
};

export const deleteStudentTrip = async (id: number): Promise<string> => {
    const idx = studentTripsData.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Student trip not found');

    // Soft delete - mark as inactive
    studentTripsData[idx] = { ...studentTripsData[idx], is_active: false };
    return "Student trip soft deleted successfully";
};