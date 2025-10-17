import { createFileRoute } from '@tanstack/react-router'
import StaffAttendancePage from '@/pages/staff/attendance'

export const Route = createFileRoute('/_app/staff/attendance')({
    component: StaffAttendancePage,
})