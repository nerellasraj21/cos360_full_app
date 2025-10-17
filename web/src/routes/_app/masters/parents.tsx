import { createFileRoute } from '@tanstack/react-router'
import ParentsPage from '@/pages/masters/parents'

export const Route = createFileRoute('/_app/masters/parents')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ParentsPage />
}