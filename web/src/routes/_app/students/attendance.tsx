import { createFileRoute } from '@tanstack/react-router'
import StudentAttendancePage from '../../../pages/students/AttendancePage'

export const Route = createFileRoute('/_app/students/attendance')({
  component: StudentAttendancePage,
})