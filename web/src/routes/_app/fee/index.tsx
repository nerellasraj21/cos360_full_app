import { createFileRoute } from '@tanstack/react-router'
import FeeDashboard from '@/pages/fee/FeeDashboard'

export const Route = createFileRoute('/_app/fee/')({
    component: FeeDashboard,
})