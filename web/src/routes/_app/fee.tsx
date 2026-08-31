import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/authStore'

// Admin-only sub-paths that students must not access directly
const STUDENT_FEE_PATHS = ['/fee/my-receipts', '/fee/my-transactions', '/fee'];

export const Route = createFileRoute('/_app/fee')({
    beforeLoad: ({ location }) => {
        const role = useAuthStore.getState().role
        const roleName = role?.name?.toLowerCase() ?? ''

        if (roleName === 'teacher') {
            throw redirect({ to: '/', replace: true })
        }

        if (roleName === 'student') {
            const path = location.pathname.replace(/\/$/, '') || '/fee'
            const isStudentAllowed = STUDENT_FEE_PATHS.some(p => path === p || path.startsWith(p + '/'))
            if (!isStudentAllowed) {
                throw redirect({ to: '/fee', replace: true })
            }
        }
    },
    component: () => <Outlet />,
})
