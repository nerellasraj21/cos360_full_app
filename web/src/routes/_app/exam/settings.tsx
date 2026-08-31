import { createFileRoute, redirect } from '@tanstack/react-router'
import ExamSettings from '@/pages/exam/ExamSettings'
import { useAuthStore } from '@/lib/authStore'
import { isAdminRoleName } from '@/lib/roleUtils'

// Web parity (ExamDashboard "Settings" quick link): editing exam settings
// is admin-only (exams:update). Without this guard, a non-admin could reach
// the settings form directly by URL even though the tile that links here
// should be hidden for them.
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
