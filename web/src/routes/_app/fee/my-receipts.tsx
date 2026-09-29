import { createFileRoute } from '@tanstack/react-router'
import MyReceiptsPage from '@/pages/fee/MyReceiptsPage'

export const Route = createFileRoute('/_app/fee/my-receipts')({
  component: MyReceiptsPage,
})
