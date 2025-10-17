import type { FeeCategory } from './category';
import type { FeeTerm } from './term';

export interface FeeType {
    id: string;
    type_name: string;
    fee_category_id: string;
    fee_status: string;
    fee_term_id: string;
    academic_year_id: string;
    fee_category_name?: string;
    fee_term_name?: string;
    academic_year_name?: string;
    created_at: string;
    updated_at: string;
}

export interface FeeTypeCreateRequest {
    type_name: string;
    fee_category_id: string;
    fee_status: string;
    fee_term_id: string;
    academic_year_id: string;
}

export interface FeeTypeUpdateRequest {
    type_name?: string;
    fee_category_id?: string;
    fee_status?: string;
    fee_term_id?: string;
    academic_year_id?: string;
}

export interface FeeTypeDropdown {
    id: string;
    type_name: string;
}