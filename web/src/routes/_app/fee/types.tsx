import { createFileRoute } from '@tanstack/react-router'
import { FeeTypes } from '@/pages/fee'

export const Route = createFileRoute('/_app/fee/types')({
  component: FeeTypes,
})