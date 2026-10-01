import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/auth')({
  component: () => (
    <div className="min-h-screen bg-muted flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Outlet />
      </div>
    </div>
  ),
}) 