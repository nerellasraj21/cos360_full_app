import React from 'react';
import { ExpenseApprovals } from '@/components/expense';
import { PermissionGuard } from '@/components/PermissionGuard';

export function ExpenseApprovalsPage() {
    return (
        <PermissionGuard
            permissions={[["expense_transactions", "approve"]]}
            fallback={
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
                        <p className="text-gray-600">You don't have permission to approve expense transactions.</p>
                    </div>
                </div>
            }
        >
            <ExpenseApprovals />
        </PermissionGuard>
    );
}

export default ExpenseApprovalsPage;