import { createFileRoute } from '@tanstack/react-router'
import StaffProfile from '@/pages/staff/StaffProfile';

export const Route = createFileRoute('/_app/staff/profile')({
    component: RouteComponent,
})

function RouteComponent() {
    return <StaffProfile />
}