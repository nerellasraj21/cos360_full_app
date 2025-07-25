import StaffPage from '@/pages/staff/StaffPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/staff/enrollment')({
  component: RouteComponent,
})

function RouteComponent() {
  return <StaffPage/>
}
