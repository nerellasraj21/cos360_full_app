import { createFileRoute } from '@tanstack/react-router'
import Trips from '@/pages/masters/Trips'

export const Route = createFileRoute('/_app/masters/trips')({
  component: Trips,
})