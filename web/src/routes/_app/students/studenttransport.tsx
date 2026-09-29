import { createFileRoute } from '@tanstack/react-router'
import StudentTransportPage from '../../../pages/students/StudentTransportPage'

export const Route = createFileRoute('/_app/students/studenttransport')({
  component: StudentTransportPage,
})
