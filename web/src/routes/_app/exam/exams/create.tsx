import { createFileRoute, redirect } from '@tanstack/react-router'
import CreateExam from '@/pages/exam/CreateExam'
import { useAuthStore } from '@/lib/authStore'
import { isAdminRoleName } from '@/lib/roleUtils'

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
