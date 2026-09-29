import { createFileRoute } from '@tanstack/react-router'
import AuditLogExamList from '@/pages/exam/AuditLogExamList'

export const Route = createFileRoute('/_app/exam/audit')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AuditLogExamList />
}
