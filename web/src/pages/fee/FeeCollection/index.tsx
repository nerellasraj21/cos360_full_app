import { useState, useEffect } from 'react';
import { DollarSign, User, Phone, X } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { StudentSearchResult } from '@/types/fee';
import StudentSearch from './StudentSearch';
import FeeSummaryTab from './FeeSummaryTab';
import FeePaymentTab from './FeePaymentTab';
import ConcessionTab from './ConcessionTab';
import OldFeeTab from './OldFeeTab';
import StudentFeeSummaryPage from './StudentFeeSummaryPage';
import ParentFeeSummaryPage from './ParentFeeSummaryPage';

type Tab = 'summary' | 'payment' | 'concessions' | 'old-fees';

const TABS: { value: Tab; label: string }[] = [
  { value: 'summary', label: 'Fee Summary' },
  { value: 'payment', label: 'Fee Payment' },
  { value: 'concessions', label: 'Concessions' },
  { value: 'old-fees', label: 'Old Fees' },
];

function AdminFeeCollectionPage() {
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore();

  useEffect(() => {
    if (academicYears.length === 0) fetchAndSetAcademicYears();
  }, [academicYears.length, fetchAndSetAcademicYears]);

  function handlePaymentSuccess() {
    setActiveTab('summary');
  }

  function handleNavigateToOldFees() {
    setActiveTab('old-fees');
  }

  function handleClearStudent() {
    setSelectedStudent(null);
    setActiveTab('summary');
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fee Collection"
        subtitle="Search students and manage fee payments"
        icon={<DollarSign className="h-5 w-5" />}
      />

      <StudentSearch onSelectStudent={setSelectedStudent} />

      {selectedStudent && (
        <>
          {/* Student Info Card */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {selectedStudent.photo_url ? (
                    <img
                      src={selectedStudent.photo_url}
                      alt={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
                      className="h-12 w-12 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`h-12 w-12 rounded-full bg-muted flex items-center justify-center ${selectedStudent.photo_url ? 'hidden' : ''}`}>
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="outline">{selectedStudent.admission_number}</Badge>
                      <span>{selectedStudent.class_name} - {selectedStudent.section_name}</span>
                      {selectedStudent.parent_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {selectedStudent.parent_name}
                        </span>
                      )}
                      {selectedStudent.mobile_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {selectedStudent.mobile_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearStudent} title="Clear selection">
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
                studentId={selectedStudent.student_id}
                onNavigateToOldFees={handleNavigateToOldFees}
              />
            )}
            {activeTab === 'payment' && (
              <FeePaymentTab
                studentId={selectedStudent.student_id}
                studentName={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
                onPaymentSuccess={handlePaymentSuccess}
              />
            )}
            {activeTab === 'concessions' && (
              <ConcessionTab studentId={selectedStudent.student_id} />
            )}
            {activeTab === 'old-fees' && (
              <OldFeeTab studentId={selectedStudent.student_id} />
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
        </>
      )}
    </div>
  );
}

const FeeCollectionPage: React.FC = () => {
  const role = useAuthStore((s) => s.role);
  const entityId = useAuthStore((s) => s.entityId);
  const roleName = role?.name.toLowerCase() ?? '';

  if (roleName === 'student') {
    return <StudentFeeSummaryPage />;
  }

  if (roleName === 'parent') {
    return <ParentFeeSummaryPage parentEntityId={entityId} />;
  }

  return <AdminFeeCollectionPage />;
};

export default FeeCollectionPage;
