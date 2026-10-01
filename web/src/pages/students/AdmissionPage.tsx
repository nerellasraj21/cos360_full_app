import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';
import MultiStepAdmissionForm from '@/components/students/MultiStepAdmissionForm';
import AdmissionTable from '@/components/students/AdmissionTable';
import { ParentAdmissionView } from '@/pages/students/ParentAdmissionView';
import BulkAdmissionUploadDialog from '@/components/students/BulkAdmissionUploadDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuthStore } from '@/lib/authStore';

const AdmissionPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const { checkPermission } = usePermission();
  const role = useAuthStore((s) => s.role);
  const isParent = role?.name.toLowerCase() === 'parent';

  // Check permissions
  const hasReadPermission = checkPermission('student_admissions', 'read') || checkPermission('student_admissions', 'read_own') || checkPermission('student_admissions', 'read_related');

  return (
    <PermissionGuard
      permissions={[['student_admissions', 'list'], ['student_admissions', 'list_own'], ['student_admissions', 'list_related']]}
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view Student Admissions.</p>
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
                  Bulk Upload
                </Button>
                <Button onClick={() => setIsFormOpen(true)}>
                  New Admission
                </Button>
              </div>
            </PermissionGuard>
          }
        />

        {!hasReadPermission ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">You don't have permission to view admission data.</p>
          </div>
        ) : isParent ? (
          <ParentAdmissionView />
        ) : (
          <Card className="p-6">
            <AdmissionTable
              hasUpdatePermission={checkPermission('student_admissions', 'update')}
            />
          </Card>
        )}

        {isFormOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
        )}

        <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setIsFormOpen(false); }} modal={false}>
          <DialogContent
            className="left-16 lg:left-64 right-2 w-auto max-w-none translate-x-0"
            customLayout
            onEscapeKeyDown={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>New Student Admission</DialogTitle>
            </DialogHeader>
            <MultiStepAdmissionForm onComplete={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>

        <BulkAdmissionUploadDialog
          open={isBulkUploadOpen}
          onOpenChange={setIsBulkUploadOpen}
        />
      </div>
    </PermissionGuard>
  );
};

export default AdmissionPage;
