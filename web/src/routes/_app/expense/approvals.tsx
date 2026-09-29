import { createFileRoute } from '@tanstack/react-router'
import ExpenseApprovalsPage from '@/pages/expense/approvals'

export const Route = createFileRoute('/_app/expense/approvals')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ExpenseApprovalsPage />
}