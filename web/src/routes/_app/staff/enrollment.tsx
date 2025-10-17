import { createFileRoute } from '@tanstack/react-router'
import StaffEnrollmentPage from '@/pages/staff/enrollment'

export const Route = createFileRoute('/_app/staff/enrollment')({
    component: RouteComponent,
})

function RouteComponent() {
    return <StaffEnrollmentPage />
}
