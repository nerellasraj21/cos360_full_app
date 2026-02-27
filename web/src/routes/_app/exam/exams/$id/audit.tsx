import { createFileRoute } from '@tanstack/react-router'
import AuditLog from '@/pages/exam/AuditLog'

export const Route = createFileRoute('/_app/exam/exams/$id/audit')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AuditLog />
}
