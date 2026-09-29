import { createFileRoute } from '@tanstack/react-router'
import { FeeTerms } from '@/pages/fee'

export const Route = createFileRoute('/_app/fee/terms')({
  component: FeeTerms,
})