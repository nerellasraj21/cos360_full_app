import { createFileRoute } from '@tanstack/react-router'
import Receipts from '@/pages/fee/Receipts'

export const Route = createFileRoute('/_app/fee/receipts')({
  component: Receipts,
})
