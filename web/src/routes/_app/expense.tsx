import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/expense')({
    component: ExpenseLayout,
})

function ExpenseLayout() {
    return (
        <div className="expense-layout">
            <Outlet />
        </div>
    )
}