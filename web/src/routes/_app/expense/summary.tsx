import { createFileRoute } from '@tanstack/react-router'
import ExpenseSummaryPage from '@/pages/expense/summary'

export const Route = createFileRoute('/_app/expense/summary')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ExpenseSummaryPage />
}
