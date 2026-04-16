import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';
import MultiStepAdmissionForm from '@/components/students/MultiStepAdmissionForm';
import AdmissionTable from '@/components/students/AdmissionTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/ui/PageHeader';

const AdmissionPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { checkPermission } = usePermission();

  // Check permissions
  const hasReadPermission = checkPermission('student_admissions', 'read');

  return (
    <PermissionGuard
      resource="student_admissions"
      action="list"
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view Student Admissions.</p>
          </div>
        </div>
      }
    >
      <div className="container mx-auto p-4 space-y-6">
        <PageHeader
          title="Student Admissions"
          icon={<GraduationCap className="h-5 w-5" />}
          actions={
            <PermissionGuard
              resource="student_admissions"
              action="create"
              fallback={null}
            >
              <Button onClick={() => setIsFormOpen(true)}>
                New Admission
              </Button>
            </PermissionGuard>
          }
        />

        {!hasReadPermission ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-600">You don't have permission to view admission data.</p>
          </div>
        ) : (
          <Card className="p-6">
            <AdmissionTable
              hasUpdatePermission={checkPermission('student_admissions', 'update')}
            />
          </Card>
        )}

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen} modal={false}>
          <DialogContent className="w-full max-w-4xl" customLayout>
            <DialogHeader>
              <DialogTitle>New Student Admission</DialogTitle>
            </DialogHeader>
            <MultiStepAdmissionForm onComplete={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
};

export default AdmissionPage;
