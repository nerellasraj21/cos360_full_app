import { createFileRoute } from '@tanstack/react-router'
import AdminProfile from '@/pages/admin/AdminProfile';

export const Route = createFileRoute('/_app/admin/profile')({
    component: RouteComponent,
})

function RouteComponent() {
    return <AdminProfile />
}