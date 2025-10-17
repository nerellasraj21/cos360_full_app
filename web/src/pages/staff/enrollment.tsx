import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StaffEnrollmentTable } from '@/components/staff';
import { PermissionGuard } from '@/components/common';
import { Users, ShieldX } from 'lucide-react';

export function StaffEnrollmentPage() {
    return (
        <PermissionGuard
            resource="staff"
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
                                            You don't have permission to view staff enrollment information.
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Staff Enrollment</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage staff profiles, enrollments, and basic information
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Staff Enrollment Management
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Register new staff members, update profiles, and manage staff information
                        </p>
                    </CardHeader>
                    <CardContent>
                        <StaffEnrollmentTable />
                    </CardContent>
                </Card>
            </div>
        </PermissionGuard>
    );
}

export default StaffEnrollmentPage;