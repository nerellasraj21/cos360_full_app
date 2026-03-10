import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DesignationsTable } from '@/components/staff';
import { PermissionGuard } from '@/components/common';
import { Briefcase, ShieldX, BadgeCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export function StaffDesignationsPage() {
    return (
        <PermissionGuard
            resource="designations"
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
                                            You don't have permission to view staff designations.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            }
        >
            <div className="p-6 space-y-6">
                <PageHeader title="Staff Designations" icon={<BadgeCheck className="h-5 w-5" />} subtitle="Manage job titles and designations for staff role assignments" />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            Staff Designations Management
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Create and manage job titles and designations for staff role assignments
                        </p>
                    </CardHeader>
                    <CardContent>
                        <DesignationsTable />
                    </CardContent>
                </Card>
            </div>
        </PermissionGuard>
    );
}

export default StaffDesignationsPage;