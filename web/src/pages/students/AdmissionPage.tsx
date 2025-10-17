import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MultiStepAdmissionForm from '@/components/students/MultiStepAdmissionForm';
import AdmissionTable from '@/components/students/AdmissionTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStudentsSearch } from '@/api/hooks/students/admissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermission } from '@/hooks/usePermission';

const AdmissionPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { checkPermission } = usePermission();

  // Check permissions
  const hasListPermission = checkPermission('student_admissions', 'list');
  const hasReadPermission = checkPermission('student_admissions', 'read');
  const hasCreatePermission = checkPermission('student_admissions', 'create');

  // Only call API if user has permission to view admissions
  const { data: searchResults } = useStudentsSearch(hasListPermission ? searchQuery : '');

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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Student Admissions</h1>
          <PermissionGuard
            resource="student_admissions"
            action="create"
            fallback={null}
          >
            <Button onClick={() => setIsFormOpen(true)}>
              New Admission
            </Button>
          </PermissionGuard>
        </div>

        {hasListPermission && (
          <div className="flex gap-4">
            <Input
              placeholder="Search students by name or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}

        {!hasReadPermission ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-600">You don't have permission to view admission data.</p>
          </div>
        ) : (
          <Card className="p-6">
            <AdmissionTable
              searchQuery={searchQuery}
              searchResults={searchResults}
              hasUpdatePermission={checkPermission('student_admissions', 'update')}
              hasDeletePermission={checkPermission('student_admissions', 'delete')}
            />
          </Card>
        )}

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
