export interface ExpenseSettings {
    approval_workflow: {
        auto_approve_limit: number;
        require_dual_approval: boolean;
        dual_approval_limit: number;
        approval_hierarchy: ExpenseApprovalLevel[];
    };
    payment_settings: {
        allowed_payment_methods: string[];
        cash_limit: number;
        require_invoice: boolean;
        invoice_number_format: string;
    };
    tax_settings: {
        default_tax_rate: number;
        tax_categories: ExpenseTaxCategory[];
    };
    notification_settings: {
        notify_on_approval: boolean;
        notify_on_rejection: boolean;
        budget_alert_threshold: number;
        email_notifications: boolean;
    };
}

export interface ExpenseApprovalLevel {
    level: number;
    role: string;
    limit: number;
}

export interface ExpenseTaxCategory {
    name: string;
    rate: number;
    applicable_categories: string[];
}

export interface ExpenseSettingsUpdateRequest {
    approval_workflow?: {
        auto_approve_limit?: number;
        require_dual_approval?: boolean;
        dual_approval_limit?: number;
    };
    payment_settings?: {
        cash_limit?: number;
        require_invoice?: boolean;
    };
    notification_settings?: {
        budget_alert_threshold?: number;
    };
}