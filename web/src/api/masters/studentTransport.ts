import type { StudentTransport, StudentTransportInput, StudentTransportUpdateInput } from '@/types/masters/studentTransport';
// import CAxios from '../index';

// const STUDENT_TRANSPORT_API_BASE = '/api/v1/student-transport/';

// export const fetchStudentTransports = async (): Promise<StudentTransport[]> => {
//     const { data } = await CAxios.get(STUDENT_TRANSPORT_API_BASE);
//     return data;
// };

// export const fetchStudentTransportsByStudent = async (studentId: number): Promise<StudentTransport[]> => {
//     const { data } = await CAxios.get(`${STUDENT_TRANSPORT_API_BASE}student/${studentId}`);
//     return data;
// };

// export const createStudentTransport = async (transport: StudentTransportInput): Promise<StudentTransport> => {
//     const { data } = await CAxios.post(STUDENT_TRANSPORT_API_BASE, transport);
//     return data;
// };

// export const updateStudentTransport = async (id: number, transport: StudentTransportUpdateInput): Promise<StudentTransport> => {
//     const { data } = await CAxios.patch(`${STUDENT_TRANSPORT_API_BASE}${id}`, transport);
//     return data;
// };

// export const deleteStudentTransport = async (id: number): Promise<void> => {
//     await CAxios.delete(`${STUDENT_TRANSPORT_API_BASE}${id}`);
// };

// Dummy data for development
export const dummyStudentTransports: StudentTransport[] = [
    {
        id: 1,
        student_id: 101,
        trip_id: 1,
        stop_id: 5,
        fee_term_id: 1,
        fee_per_term: 500,
        created_at: "2025-01-15T08:00:00.000Z",
        updated_at: "2025-01-15T08:00:00.000Z",
    },
    {
        id: 2,
        student_id: 102,
        trip_id: 2,
        stop_id: 3,
        fee_term_id: 1,
        fee_per_term: 450,
        created_at: "2025-01-16T09:00:00.000Z",
        updated_at: "2025-01-16T09:00:00.000Z",
    },
    {
        id: 3,
        student_id: 103,
        trip_id: 1,
        stop_id: 7,
        fee_term_id: 2,
        fee_per_term: 600,
        created_at: "2025-01-17T10:00:00.000Z",
        updated_at: "2025-01-17T10:00:00.000Z",
    },
];

let studentTransportsData: StudentTransport[] = [...dummyStudentTransports];

export const fetchStudentTransports = async (): Promise<StudentTransport[]> => {
    return [...studentTransportsData];
};

export const fetchStudentTransportsByStudent = async (studentId: number): Promise<StudentTransport[]> => {
    return studentTransportsData.filter(transport => transport.student_id === studentId);
};

export const createStudentTransport = async (transport: StudentTransportInput): Promise<StudentTransport> => {
    const newId = studentTransportsData.length ? Math.max(...studentTransportsData.map(t => t.id)) + 1 : 1;
    const now = new Date().toISOString();
    const newTransport: StudentTransport = { 
        id: newId, 
        ...transport,
        created_at: now,
        updated_at: now
    };
    studentTransportsData.push(newTransport);
    return { ...newTransport };
};

export const updateStudentTransport = async (id: number, transport: StudentTransportUpdateInput): Promise<StudentTransport> => {
    const idx = studentTransportsData.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Student transport not found');
    
    const updatedTransport = { 
        ...studentTransportsData[idx], 
        ...transport,
        updated_at: new Date().toISOString()
    };
    studentTransportsData[idx] = updatedTransport;
    return { ...updatedTransport };
};

export const deleteStudentTransport = async (id: number): Promise<void> => {
    const idx = studentTransportsData.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Student transport not found');
    studentTransportsData.splice(idx, 1);
};