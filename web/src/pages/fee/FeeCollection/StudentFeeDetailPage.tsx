import { useState, useEffect } from 'react';
import { DollarSign, User, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStudentAdmissionDetail } from '@/api/hooks/students/admissions';
import FeeSummaryTab from './FeeSummaryTab';
import FeePaymentTab from './FeePaymentTab';
import ConcessionTab from './ConcessionTab';
import OldFeeTab from './OldFeeTab';
import FeeHistoryTab from './FeeHistoryTab';

type Tab = 'summary' | 'payment' | 'concessions' | 'old-fees' | 'history';

const TABS: { value: Tab; label: string }[] = [
  { value: 'summary', label: 'Fee Summary' },
  { value: 'payment', label: 'Fee Payment' },
  { value: 'concessions', label: 'Concessions' },
  { value: 'old-fees', label: 'Old Fees' },
  { value: 'history', label: 'Fee History' },
];

interface StudentFeeDetailPageProps {
  studentId: string;
}

export default function StudentFeeDetailPage({ studentId }: StudentFeeDetailPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore();
  const { data: admission, isLoading, isError, error } = useStudentAdmissionDetail(studentId);

  useEffect(() => {
    if (academicYears.length === 0) fetchAndSetAcademicYears();
  }, [academicYears.length, fetchAndSetAcademicYears]);

  function handlePaymentSuccess() {
    setActiveTab('summary');
  }

  function handleNavigateToOldFees() {
    setActiveTab('old-fees');
  }

  function handleGoBack() {
    navigate({ to: '/fee/collection' });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (isError || !admission || !admission.student) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Fee Collection"
          subtitle="Student details"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive mb-4">
              {isError ? `Error: ${(error as Error)?.message || 'Failed to load student'}` : 'Student not found'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">Student ID: {studentId}</p>
            <Button onClick={handleGoBack}>Back to Search</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const student = admission.student;
  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fee Collection"
        subtitle={`Manage fee for ${studentName}`}
        icon={<DollarSign className="h-5 w-5" />}
      />

      {/* Student Info Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{studentName}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <Badge variant="outline">{admission.admission_number || student.id}</Badge>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleGoBack} title="Go back">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Tab Bar */}
      <div className="hidden md:flex border-b">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${activeTab === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
              }`}
            aria-selected={activeTab === value}
            role="tab"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pb-20 md:pb-0">
        {activeTab === 'summary' && (
          <FeeSummaryTab
            studentId={student.id}
            classId={admission.current_class_id ?? ''}
            onNavigateToOldFees={handleNavigateToOldFees}
          />
        )}
        {activeTab === 'payment' && (
          <FeePaymentTab
            studentId={student.id}
            studentName={studentName}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}
        {activeTab === 'concessions' && (
          <ConcessionTab studentId={student.id} />
        )}
        {activeTab === 'old-fees' && (
          <OldFeeTab studentId={student.id} />
        )}
        {activeTab === 'history' && (
          <FeeHistoryTab studentId={student.id} isActive={activeTab === 'history'} />
        )}
      </div>

      {/* Mobile Bottom Tab Nav */}
      <nav
        aria-label="Fee collection navigation"
        className="fixed bottom-0 left-0 right-0 border-t bg-background md:hidden flex"
      >
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={`flex-1 py-3 text-xs font-medium transition-colors
              ${activeTab === value ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            aria-selected={activeTab === value}
            role="tab"
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
