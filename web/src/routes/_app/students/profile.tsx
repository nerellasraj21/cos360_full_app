import StudentProfile from '@/pages/students/StudentProfile'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/students/profile')({
  component: StudentProfile,
})