import type { FeeType } from './type';

// ===== ENUMS =====

/**
 * Category status enum matching backend validation
 */
export type CategoryStatus = 'active' | 'inactive';

// ===== BASE INTERFACES =====

export interface FeeCategory {
    id: string;
    category_name: string;
    category_status: CategoryStatus;
    academic_year_id: string;
    academic_year_title?: string;
    fee_types?: FeeType[];
    created_at: string;
    updated_at: string;
}

export interface FeeCategoryInput {
    category_name: string;
    category_status: CategoryStatus;
    academic_year_id: string;
}

export interface FeeCategoryCreateRequest extends FeeCategoryInput {}

export interface FeeCategoryUpdateRequest extends Partial<FeeCategoryInput> {}

// ===== PAGINATION =====

/**
 * Pagination parameters for fee category list
 * Backend validation: limit 1-500, offset >= 0
 */
export interface FeeCategorySearchParams {
    academic_year_id?: string;
    category_status?: CategoryStatus;
    skip?: number;  // Offset for pagination
    limit?: number; // Limit (1-500, default 50)
}

/**
 * Paginated response from backend
 */
export interface FeeCategoryListResponse {
    items: FeeCategory[];
    total: number;
    skip: number;
    limit: number;
}

/**
 * Dropdown option for category selection
 */
export interface FeeCategoryDropdownOption {
    id: string;
    category_name: string;
}

// ===== HEALTH CHECK =====

export interface FeeCategoryHealthCheck {
    status: 'healthy';
    module: 'fee_categories';
    timestamp: string;
}
