import { createFileRoute } from '@tanstack/react-router'
import ExpenseTypesPage from '@/pages/expense/types'

export const Route = createFileRoute('/_app/expense/types')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ExpenseTypesPage />
}