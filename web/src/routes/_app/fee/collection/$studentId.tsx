import { createFileRoute } from '@tanstack/react-router';
import StudentFeeDetailPage from '@/pages/fee/FeeCollection/StudentFeeDetailPage';

function StudentFeeDetailPageRoute() {
  const { studentId } = Route.useParams();
  return <StudentFeeDetailPage studentId={studentId} />;
}

export const Route = createFileRoute('/_app/fee/collection/$studentId')({
  component: StudentFeeDetailPageRoute,
});
