import { createFileRoute } from '@tanstack/react-router'
import ExpenseSettingsPage from '@/pages/expense/settings'

export const Route = createFileRoute('/_app/expense/settings')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ExpenseSettingsPage />
}