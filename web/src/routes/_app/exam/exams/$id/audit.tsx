import { createFileRoute, redirect } from '@tanstack/react-router'
import AuditLog from '@/pages/exam/AuditLog'
import { useAuthStore } from '@/lib/authStore'
import { isAdminRoleName } from '@/lib/roleUtils'

export const Route = createFileRoute('/_app/exam/exams/$id/audit')({
  beforeLoad: ({ params }) => {
    const role = useAuthStore.getState().role
    if (!isAdminRoleName(role?.name)) {
      throw redirect({ to: '/exam/exams/$id', params: { id: params.id }, replace: true })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <AuditLog />
}
