import React from 'react';
import { ExpenseTypes } from '@/components/expense';
import { PermissionGuard } from '@/components/PermissionGuard';

export function ExpenseTypesPage() {
    return (
        <PermissionGuard
            permissions={[["expense_types", "list"]]}
            fallback={
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
                        <p className="text-gray-600">You don't have permission to view expense types.</p>
                    </div>
                </div>
            }
        >
            <ExpenseTypes />
        </PermissionGuard>
    );
}

export default ExpenseTypesPage;