import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/exam/marks/$examId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
