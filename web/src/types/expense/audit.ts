export interface ExpenseAuditQueryParams {
    transaction_id?: string;
    user_id?: string;
    action_type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
}

export interface ExpenseAuditEntry {
    id: string;
    transaction_id: string;
    transaction_number: string;
    action_type: string;
    action_description: string;
    user: {
        id: string;
        name: string;
        employee_id?: string;
    };
    timestamp: string;
    ip_address?: string;
    user_agent?: string;
    changes?: {
        field: string;
        old_value?: any;
        new_value?: any;
    };
    additional_data?: any;
}