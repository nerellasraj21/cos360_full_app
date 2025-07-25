export interface StudentTrip {
    id: number;
    trip_id: number;
    student_id: number;
    stop_id: number;
    fee_term_id: number;
    fee_per_term: number;
    is_active?: boolean;
}

export interface StudentTripInput {
    trip_id: number;
    student_id: number;
    stop_id: number;
    fee_term_id: number;
    fee_per_term: number;
    is_active?: boolean;
}

export interface StudentTripUpdateInput {
    trip_id?: number;
    student_id?: number;
    stop_id?: number;
    fee_term_id?: number;
    fee_per_term?: number;
    is_active?: boolean;
}