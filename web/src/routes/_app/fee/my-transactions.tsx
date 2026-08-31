import { createFileRoute } from '@tanstack/react-router'
import MyTransactionsPage from '@/pages/fee/MyTransactionsPage'

export const Route = createFileRoute('/_app/fee/my-transactions')({
  component: MyTransactionsPage,
})
