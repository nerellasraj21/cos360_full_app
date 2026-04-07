import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap } from 'lucide-react';
import MultiStepAdmissionForm, { type MultiStepAdmissionFormHandle } from '@/components/students/MultiStepAdmissionForm';
import AdmissionTable from '@/components/students/AdmissionTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStudentsSearch } from '@/api/hooks/students/admissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';

const AdmissionPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const formRef = useRef<MultiStepAdmissionFormHandle>(null);

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

        {hasListPermission && (
          <FilterBar>
            <Input
              placeholder="Search students by name or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </FilterBar>
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
            />
          </Card>
        )}

        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setCurrentStep(0);
          }
        }} modal={false}>
          <DialogContent className="w-full max-w-4xl">
            <DialogHeader>
              <DialogTitle>New Student Admission</DialogTitle>
            </DialogHeader>
            <MultiStepAdmissionForm ref={formRef} onComplete={() => setIsFormOpen(false)} />
            <DialogFooter className="!justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  formRef.current?.prevStep();
                  setCurrentStep(prev => Math.max(prev - 1, 0));
                }}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                {currentStep < 5 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      formRef.current?.nextStep();
                      setCurrentStep(prev => prev + 1);
                    }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => formRef.current?.submit()}
                    disabled={formRef.current?.isLoading ?? false}
                  >
                    {formRef.current?.isLoading ? 'Creating...' : 'Create Admission'}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
};

export default AdmissionPage;
