import { createFileRoute } from '@tanstack/react-router'
import GradingDashboard from '@/pages/exam/GradingDashboard'

export const Route = createFileRoute('/_app/exam/grading/')({
  component: GradingDashboard,
})
