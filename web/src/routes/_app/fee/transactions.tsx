import { createFileRoute } from '@tanstack/react-router'
import { FeeTransactions } from '@/pages/fee'

export const Route = createFileRoute('/_app/fee/transactions')({
    component: FeeTransactions,
})
