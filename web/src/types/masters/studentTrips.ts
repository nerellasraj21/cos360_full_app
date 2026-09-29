export interface StudentTripBase {
    trip_id: string;
    student_id: string;
    stop_id: string;
    fee_term_id: string;
    fee_per_term: number;
}

export interface StudentTrip extends StudentTripBase {
    id: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface StudentTripInput extends StudentTripBase {}

export interface StudentTripUpdateInput {
    trip_id?: string;
    student_id?: string;
    stop_id?: string;
    fee_term_id?: string;
    fee_per_term?: number;
    is_active?: boolean;
}