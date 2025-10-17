import { createFileRoute } from '@tanstack/react-router'
import ExpenseDepartmentsPage from '@/pages/expense/departments'

export const Route = createFileRoute('/_app/expense/departments')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ExpenseDepartmentsPage />
}