export interface FeeDashboardStats {
    total_categories: number;
    active_fee_types: number;
    total_classes_with_fees: number;
    total_fee_amount: number;
    academic_year_id: string;
}

export interface FeeValidationWarning {
    id: string;
    type: 'missing_mapping' | 'incomplete_terms' | 'missing_payment_dates' | 'invalid_amounts';
    title: string;
    description: string;
    entity_id: number;
    entity_type: 'class' | 'fee_type' | 'fee_term' | 'fee_mapping';
    severity: 'error' | 'warning' | 'info';
}

export interface FeeFilters {
    academic_year_id?: string;
    category_id?: number;
    is_active?: boolean;
    class_id?: number;
    amount_min?: number;
    amount_max?: number;
}

export interface FeeBulkOperation {
    operation: 'delete' | 'activate' | 'deactivate' | 'transfer_year';
    entity_type: 'category' | 'fee_type' | 'mapping';
    entity_ids: number[];
    target_academic_year_id?: string;
}