import { createFileRoute } from '@tanstack/react-router'
import MarkPermissions from '@/pages/exam/MarkPermissions'

export const Route = createFileRoute('/_app/exam/exams/$id/permissions')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MarkPermissions />
}
