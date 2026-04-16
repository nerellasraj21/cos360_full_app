import { DollarSign } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/authStore';
import { PageHeader } from '@/components/ui/PageHeader';
import type { StudentSearchResult } from '@/types/fee';
import StudentSearch from './StudentSearch';
import StudentFeeSummaryPage from './StudentFeeSummaryPage';
import ParentFeeSummaryPage from './ParentFeeSummaryPage';

function AdminFeeCollectionPage() {
  const navigate = useNavigate();

  function handleSelectStudent(student: StudentSearchResult) {
    navigate({ to: '/fee/collection/$studentId', params: { studentId: student.student_id } });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fee Collection"
        subtitle="Search students and manage fee payments"
        icon={<DollarSign className="h-5 w-5" />}
      />

      <StudentSearch onSelectStudent={handleSelectStudent} />
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
