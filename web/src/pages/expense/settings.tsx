import React from 'react';
import { ExpenseSettings } from '@/components/expense';
import { PermissionGuard } from '@/components/PermissionGuard';

export function ExpenseSettingsPage() {
    return (
        <PermissionGuard
            permissions={[["expense_settings", "list"]]}
            fallback={
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
                        <p className="text-gray-600">You don't have permission to view expense settings.</p>
                    </div>
                </div>
            }
        >
            <ExpenseSettings />
        </PermissionGuard>
    );
}

export default ExpenseSettingsPage;