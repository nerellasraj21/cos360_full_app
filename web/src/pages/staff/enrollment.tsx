import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StaffEnrollmentTable } from '@/components/staff';
import { PermissionGuard } from '@/components/common';
import { ShieldX } from 'lucide-react';

export function StaffEnrollmentPage() {
    return (
        <PermissionGuard
            resource="staff"
            action="list"
            fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                    <Card className="w-full max-w-md">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-4">
                                <ShieldX className="h-16 w-16 text-muted-foreground mx-auto" />
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                                    <p className="text-muted-foreground mt-2">
                                        You don't have permission to view staff enrollment information.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            }
        >
            <StaffEnrollmentTable />
        </PermissionGuard>
    );
}

export default StaffEnrollmentPage;