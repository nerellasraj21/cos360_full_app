import { createFileRoute } from '@tanstack/react-router'
import ExpenseReportsPage from '@/pages/expense/reports'

export const Route = createFileRoute('/_app/expense/reports')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ExpenseReportsPage />
}