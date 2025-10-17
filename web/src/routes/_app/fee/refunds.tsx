import { createFileRoute } from '@tanstack/react-router'
import FeeRefunds from '@/pages/fee/FeeRefunds'

export const Route = createFileRoute('/_app/fee/refunds')({
    component: RouteComponent,
})

function RouteComponent() {
    return <FeeRefunds />
}
