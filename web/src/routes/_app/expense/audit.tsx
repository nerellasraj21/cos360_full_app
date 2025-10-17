import { createFileRoute } from '@tanstack/react-router'
import ExpenseAuditPage from '@/pages/expense/audit'

export const Route = createFileRoute('/_app/expense/audit')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ExpenseAuditPage />
}