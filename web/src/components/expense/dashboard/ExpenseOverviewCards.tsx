import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExpenseOverviewCardsProps {
    stats: {
        total_categories: number;
        active_expense_types: number;
        total_transactions: number;
        total_amount: number;
        pending_approvals: number;
        budget_utilization: number;
    } | undefined;
    isLoading: boolean;
}

export function ExpenseOverviewCards({ stats, isLoading }: ExpenseOverviewCardsProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-4 bg-muted rounded w-3/4"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-full"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground">No data available</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Expense Categories
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total_categories}</div>
                    <p className="text-xs text-muted-foreground">
                        Total categories configured
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Active Expense Types
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.active_expense_types}</div>
                    <p className="text-xs text-muted-foreground">
                        Currently active expense types
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Transactions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total_transactions}</div>
                    <p className="text-xs text-muted-foreground">
                        Total expense transactions
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Expense Amount
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.total_amount)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total expenses recorded
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}