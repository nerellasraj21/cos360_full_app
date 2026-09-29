import { createFileRoute } from '@tanstack/react-router'
import ExpensePage from '@/pages/expense/index'

export const Route = createFileRoute('/_app/expense/')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ExpensePage />
}