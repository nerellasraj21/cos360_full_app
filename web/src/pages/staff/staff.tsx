import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/components/common';
import { Users, Calendar, Briefcase, ArrowRight } from 'lucide-react';

export function StaffPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Comprehensive staff enrollment, attendance tracking, and designation management
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PermissionGuard resource="staff" action="list">
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Staff Enrollment
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Register new staff members, update profiles, and manage staff information
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Link to="/staff/enrollment">
                                <Button className="w-full flex items-center gap-2">
                                    Manage Staff Profiles
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </PermissionGuard>

                <PermissionGuard resource="staff_attendance" action="list">
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Staff Attendance
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Track and manage daily attendance for all staff members
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Link to="/staff/attendance">
                                <Button className="w-full flex items-center gap-2">
                                    Manage Attendance
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </PermissionGuard>

                <PermissionGuard resource="designations" action="list">
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5" />
                                Staff Designations
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Manage job titles and designations for staff role assignments
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Link to="/staff/designations">
                                <Button className="w-full flex items-center gap-2">
                                    Manage Designations
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </PermissionGuard>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Staff Portal Access
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Staff members can access their profiles and attendance records through secure authentication
                    </p>
                </CardHeader>
            </Card>
        </div>
    );
}

export default StaffPage;