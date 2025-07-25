import { useAuthStore } from '@/lib/authStore'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (isAuthenticated) {
      throw redirect({ to: '/', replace: true })
    }
  },
  component: () => (

        <Outlet />
 
  ),
}) 