export interface FeeTerm {
    id: string;
    term_name: string;
    term_status: string;
    number_of_terms: number;
    academic_year_id: string;
    fee_term_dates: FeeTermDate[];
    created_at: string;
    updated_at: string;
}

export interface FeeTermInput {
    term_name: string;
    term_status: string;
    number_of_terms: number;
    academic_year_id: string;
    fee_term_dates: FeeTermDateInput[];
}

export interface FeeTermCreateRequest {
    term_name: string;
    term_status: string;
    number_of_terms: number;
    academic_year_id: string;
    fee_term_dates: FeeTermDateInput[];
}

export interface FeeTermUpdateRequest {
    term_name?: string;
    term_status?: string;
    number_of_terms?: number;
    academic_year_id?: string;
    fee_term_dates?: FeeTermDateInput[];
}

export interface FeeTermDate {
    id: string;
    term_id: string;
    fee_term_date: string;
    created_at: string;
    updated_at: string;
}

export interface FeeTermDateInput {
    fee_term_date: string;
}

export interface FeeTermDropdown {
    id: string;
    term_name: string;
    number_of_terms: number;
    fee_type_id?: string; // Optional for backward compatibility
}