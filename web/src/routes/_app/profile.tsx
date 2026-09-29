import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/authStore'
import ParentProfile from '@/pages/ParentProfile'
import StudentProfile from '@/pages/students/StudentProfile'
import StaffProfile from '@/pages/staff/StaffProfile'

function ProfileRouter() {
  const { role } = useAuthStore()

  if (!role) {
    return <div>Please log in to view your profile</div>
  }

  const roleName = role.name.toLowerCase()

  if (roleName === 'student') {
    return <StudentProfile />
  } else if (roleName === 'parent') {
    return <ParentProfile />
  } else {
    // For staff, teachers, admin, etc.
    return <StaffProfile />
  }
}

export const Route = createFileRoute('/_app/profile')({
  component: ProfileRouter,
})