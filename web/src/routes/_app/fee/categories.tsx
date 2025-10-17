import { createFileRoute } from '@tanstack/react-router'
import { FeeCategories } from '@/pages/fee'

export const Route = createFileRoute('/_app/fee/categories')({
  component: FeeCategories,
})