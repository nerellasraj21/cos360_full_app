export type ReportType = 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type GroupByType = 'category' | 'department' | 'vendor' | 'expense_type';

export interface ExpenseReportQueryParams {
    report_type: ReportType;
    group_by: GroupByType;
    date_from: string;
    date_to: string;
    category_id?: string;
    department?: string;
    include_pending?: boolean;
}

export interface ExpenseReportSummary {
    report_info: {
        report_type: ReportType;
        period: {
            from: string;
            to: string;
        };
        generated_at: string;
        generated_by: string;
    };
    summary: {
        total_transactions: number;
        total_amount: number;
        total_tax: number;
        grand_total: number;
        approved_amount: number;
        pending_amount: number;
        rejected_amount: number;
    };
    category_breakdown: ExpenseCategoryBreakdown[];
    department_breakdown: ExpenseDepartmentBreakdown[];
    vendor_breakdown: ExpenseVendorBreakdown[];
    monthly_trend: ExpenseMonthlyTrend[];
}

export interface ExpenseCategoryBreakdown {
    category_id: string;
    category_name: string;
    transaction_count: number;
    total_amount: number;
    percentage: number;
    budget_limit?: number;
    budget_utilization?: number;
}

export interface ExpenseDepartmentBreakdown {
    department: string;
    transaction_count: number;
    total_amount: number;
    percentage: number;
}

export interface ExpenseVendorBreakdown {
    vendor_name: string;
    transaction_count: number;
    total_amount: number;
    percentage: number;
}

export interface ExpenseMonthlyTrend {
    month: string;
    total_amount: number;
    transaction_count: number;
}

export type BudgetPeriod = 'current_month' | 'current_quarter' | 'current_year';

export interface BudgetAnalysisQueryParams {
    period: BudgetPeriod;
    category_id?: string;
}

export interface BudgetAnalysis {
    analysis_period: {
        type: BudgetPeriod;
        from: string;
        to: string;
    };
    overall_budget: {
        total_budget: number;
        total_spent: number;
        remaining_budget: number;
        utilization_percentage: number;
        projected_spend: number;
        variance: number;
    };
    category_analysis: ExpenseCategoryBudgetAnalysis[];
    alerts: ExpenseBudgetAlert[];
}

export interface ExpenseCategoryBudgetAnalysis {
    category_id: string;
    category_name: string;
    budget_allocated: number;
    amount_spent: number;
    remaining_budget: number;
    utilization_percentage: number;
    status: 'on_track' | 'warning' | 'exceeded';
    variance: number;
    projected_spend: number;
}

export interface ExpenseBudgetAlert {
    type: 'budget_exceeded' | 'budget_warning';
    category: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
}