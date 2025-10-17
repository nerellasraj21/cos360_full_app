import { createFileRoute } from '@tanstack/react-router'
import { FeeReports } from '@/pages/fee/FeeReports'

export const Route = createFileRoute('/_app/fee/reports')({
  component: FeeReports,
})