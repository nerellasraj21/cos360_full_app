export interface StudentTransport {
    id: number;
    student_id: number;
    trip_id: number;
    stop_id: number;
    fee_term_id: number;
    fee_per_term: number;
    created_at: string;
    updated_at: string;
}

export interface StudentTransportInput {
    student_id: number;
    trip_id: number;
    stop_id: number;
    fee_term_id: number;
    fee_per_term: number;
}

export interface StudentTransportUpdateInput {
    trip_id?: number;
    stop_id?: number;
    fee_term_id?: number;
    fee_per_term?: number;
}