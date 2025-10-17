import { createFileRoute } from '@tanstack/react-router'
import StaffDesignationsPage from '@/pages/staff/designations'

export const Route = createFileRoute('/_app/staff/designations')({
    component: RouteComponent,
})

function RouteComponent() {
    return <StaffDesignationsPage />
}