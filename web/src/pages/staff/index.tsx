import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, UserCheck, Settings, Briefcase } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StaffTable } from '@/components/staff/StaffTable';
import { StaffEnrollmentForm } from '@/components/staff/StaffEnrollmentForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState('list');
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);

  const handleEnrollmentSuccess = () => {
    setShowEnrollmentForm(false);
    setActiveTab('list');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Staff Management"
        icon={<Briefcase className="h-5 w-5" />}
        subtitle="Manage staff enrollment, attendance, and designations"
        actions={<Button onClick={() => setShowEnrollmentForm(true)} className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Staff Member</Button>}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff List
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="designations" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Designations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>
                View and manage all staff members in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StaffTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Attendance</CardTitle>
              <CardDescription>
                Track and manage staff attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Attendance management feature coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Designations</CardTitle>
              <CardDescription>
                Manage staff designations and job titles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Designation management feature coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enrollment Form Dialog */}
      <Dialog open={showEnrollmentForm} onOpenChange={setShowEnrollmentForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <StaffEnrollmentForm
            onSuccess={handleEnrollmentSuccess}
            onCancel={() => setShowEnrollmentForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}