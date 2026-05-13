import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/authStore'

export const Route = createFileRoute('/_app/fee')({
    beforeLoad: () => {
        const role = useAuthStore.getState().role
        if (role?.name?.toLowerCase() === 'teacher') {
            throw redirect({ to: '/', replace: true })
        }
    },
    component: () => <Outlet />,
})
