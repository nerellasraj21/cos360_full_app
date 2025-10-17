import { createFileRoute } from '@tanstack/react-router'
import { FeeMappings } from '@/pages/fee'

export const Route = createFileRoute('/_app/fee/mappings')({
  component: FeeMappings,
})