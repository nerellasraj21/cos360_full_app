import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffEnrollmentTable, StaffAttendanceTable, DesignationsTable } from '@/components/staff';
import { Users, Calendar, Briefcase } from 'lucide-react';

export function StaffPage() {
    const [activeTab, setActiveTab] = useState('enrollment');

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Staff Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Comprehensive staff enrollment, attendance tracking, and designation management
                    </p>
                </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Staff Portal Access</h2>
                        <p className="text-sm text-muted-foreground">
                            Staff members can access their profiles and attendance records through secure authentication
                        </p>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="enrollment" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Staff Enrollment
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Attendance
                    </TabsTrigger>
                    <TabsTrigger value="designations" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Designations
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="enrollment" className="space-y-4">
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-foreground">Staff Enrollment Management</h3>
                            <p className="text-sm text-muted-foreground">
                                Register new staff members, update profiles, and manage staff information
                            </p>
                        </div>
                        <StaffEnrollmentTable />
                    </div>
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-foreground">Staff Attendance Tracking</h3>
                            <p className="text-sm text-muted-foreground">
                                Record and manage daily attendance for all staff members
                            </p>
                        </div>
                        <StaffAttendanceTable />
                    </div>
                </TabsContent>

                <TabsContent value="designations" className="space-y-4">
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-foreground">Staff Designations</h3>
                            <p className="text-sm text-muted-foreground">
                                Manage job titles and designations for staff role assignments
                            </p>
                        </div>
                        <DesignationsTable />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default StaffPage;