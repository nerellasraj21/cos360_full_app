import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import NotFound from './NotFound'

export const Route = createRootRoute({
  notFoundComponent: NotFound,

  component: () => {
    return (
      <>
        <Outlet />
        <TanStackRouterDevtools />
      </>
    )
  },
})