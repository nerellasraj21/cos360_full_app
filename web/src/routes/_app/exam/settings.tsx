import { createFileRoute, redirect } from '@tanstack/react-router'
import ExamSettings from '@/pages/exam/ExamSettings'
import { useAuthStore } from '@/lib/authStore'
import { isAdminRoleName } from '@/lib/roleUtils'

export const Route = createFileRoute('/_app/exam/settings')({
  beforeLoad: () => {
    const role = useAuthStore.getState().role
    if (!isAdminRoleName(role?.name)) {
      throw redirect({ to: '/exam', replace: true })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <ExamSettings />
}
