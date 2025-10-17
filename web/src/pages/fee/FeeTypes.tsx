import React from 'react';
import { FeeTypeManager } from '@/components/fee/types/FeeTypeManager';
import { PermissionGuard } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';

export function FeeTypes() {
    return (
        <PermissionGuard
            resource="fee_types"
            action="list"
            fallback={
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Card className="w-full max-w-md">
                            <CardContent className="pt-6">
                                <div className="text-center space-y-4">
                                    <ShieldX className="h-16 w-16 text-muted-foreground mx-auto" />
                                    <div>
                                        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                                        <p className="text-muted-foreground mt-2">
                                            You don't have permission to view fee types.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Fee Types Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage individual fee types and their properties
                    </p>
                </div>

                <FeeTypeManager />
            </div>
        </PermissionGuard>
    );
}