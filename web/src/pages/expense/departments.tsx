import React from 'react';
import { ExpenseDepartments } from '@/components/expense';
import { PermissionGuard } from '@/components/PermissionGuard';

export function ExpenseDepartmentsPage() {
    return (
        <PermissionGuard
            permissions={[["expense_departments", "list"]]}
            fallback={
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
                        <p className="text-muted-foreground">You don't have permission to view expense departments.</p>
                    </div>
                </div>
            }
        >
            <ExpenseDepartments />
        </PermissionGuard>
    );
}

export default ExpenseDepartmentsPage;
