import { createFileRoute } from '@tanstack/react-router'
import TeacherAttendancePage from '../../../pages/staff/AttendancePage'

export const Route = createFileRoute('/_app/staff/attendance')({
  component: TeacherAttendancePage,
})