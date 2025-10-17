import { createFileRoute } from '@tanstack/react-router'
import ExpenseTransactionsPage from '@/pages/expense/transactions'

export const Route = createFileRoute('/_app/expense/transactions')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ExpenseTransactionsPage />
}