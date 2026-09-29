import { createFileRoute, redirect } from '@tanstack/react-router'
import MarkPermissions from '@/pages/exam/MarkPermissions'
import { useAuthStore } from '@/lib/authStore'
import { isAdminRoleName } from '@/lib/roleUtils'

// Web parity (ExamDetail's isAdmin-gated "Permissions" tab): guards the
// direct URL, not just the hidden tab.
export const Route = createFileRoute('/_app/exam/exams/$id/permissions')({
  beforeLoad: ({ params }) => {
    const role = useAuthStore.getState().role
    if (!isAdminRoleName(role?.name)) {
      throw redirect({ to: '/exam/exams/$id', params: { id: params.id }, replace: true })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <MarkPermissions />
}
