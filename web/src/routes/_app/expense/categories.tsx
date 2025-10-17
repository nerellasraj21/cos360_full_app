import { createFileRoute } from '@tanstack/react-router'
import ExpenseCategoriesPage from '@/pages/expense/categories'

export const Route = createFileRoute('/_app/expense/categories')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ExpenseCategoriesPage />
}