import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ExpenseDepartments } from '@/components/expense';
import { Building } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export function ExpenseDepartmentsPage() {
    return (
        <div className="p-6 space-y-6">
            <PageHeader title="Expense Departments" icon={<Building className="h-5 w-5" />} subtitle="Manage departments for expense categorization and organization" />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Department Management
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Create and manage departments for organizing expenses
                    </p>
                </CardHeader>
                <CardContent>
                    <ExpenseDepartments />
                </CardContent>
            </Card>
        </div>
    );
}

export default ExpenseDepartmentsPage;
