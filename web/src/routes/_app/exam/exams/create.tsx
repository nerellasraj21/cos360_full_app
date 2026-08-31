import { createFileRoute, redirect } from '@tanstack/react-router'
import CreateExam from '@/pages/exam/CreateExam'
import { useAuthStore } from '@/lib/authStore'
import { isAdminRoleName } from '@/lib/roleUtils'

// Web parity (ExamDashboard/ExamList "New Exam" button): creating an exam
// is admin-only. Without this guard, a non-admin could reach the create
// form directly by URL even though the button that links here is hidden.
export const Route = createFileRoute('/_app/exam/exams/create')({
  beforeLoad: () => {
    const role = useAuthStore.getState().role
    if (!isAdminRoleName(role?.name)) {
      throw redirect({ to: '/exam/exams', replace: true })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <CreateExam />
}
