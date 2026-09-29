import AcademicYearsPage from '@/pages/masters/academicyears'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/masters/academicyears')({
  component: AcademicYearsPage,
})
