import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/fee')({
    component: FeeLayout,
})

function FeeLayout() {
    return (
        <div className="fee-layout">
            <Outlet />
        </div>
    )
}