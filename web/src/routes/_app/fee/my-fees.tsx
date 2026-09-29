import { createFileRoute } from '@tanstack/react-router'
import StudentFeeSummaryPage from '@/pages/fee/FeeCollection/StudentFeeSummaryPage'

export const Route = createFileRoute('/_app/fee/my-fees')({
  component: StudentFeeSummaryPage,
})
