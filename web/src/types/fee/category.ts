import type { FeeType } from './type';

export interface FeeCategory {
    id: string;
    category_name: string;
    category_status: string;
    academic_year_id: string;
    academic_year_title?: string;
    fee_types?: FeeType[];
    created_at: string;
    updated_at: string;
}

export interface FeeCategoryInput {
    category_name: string;
    category_status: string;
    academic_year_id: string;
}

export interface FeeCategoryCreateRequest extends FeeCategoryInput {}

export interface FeeCategoryUpdateRequest extends Partial<FeeCategoryInput> {}