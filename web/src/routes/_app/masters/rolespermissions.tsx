import { createFileRoute } from '@tanstack/react-router'
import RolesPermissionsPage from '@/pages/auth/RolesPermissionsPage'

export const Route = createFileRoute('/_app/masters/rolespermissions')({
  component: RouteComponent,
})

function RouteComponent() {
  return <RolesPermissionsPage/>
}
