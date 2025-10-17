import { useState } from 'react';
import { ExpenseOverviewCards, ExpenseNavigation } from '@/components/expense';
import { Separator } from '@/components/ui/separator';

export default function ExpenseDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');

    // Mock data for now - will be replaced with API calls
    const stats = {
        total_categories: 5,
        active_expense_types: 12,
        total_transactions: 145,
        total_amount: 285000,
        pending_approvals: 8,
        budget_utilization: 75.5,
    };
    const statsLoading = false;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Expense Management Dashboard</h1>
                    <p className="text-muted-foreground">
                        Comprehensive overview and management of all expense-related components
                    </p>
                    <div className="mt-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-md inline-block">
                        <span className="text-xs text-primary font-medium">
                            📊 Sample data mode - API calls commented out for future backend implementation
                        </span>
                    </div>
                </div>
            </div>

            {/* Overview Cards */}
            <ExpenseOverviewCards stats={stats} isLoading={statsLoading} />

            <Separator />

            {/* Navigation to Expense Sections */}
            <ExpenseNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
}