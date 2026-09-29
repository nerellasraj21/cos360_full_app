// Enhanced auth store with student selection capabilities
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState, LoginResponse, Student, User, Permission, PermissionMap } from '@/types/auth'
import { getTeacherAllowedActions } from '@/lib/teacherPermissionMatrix'
import { getStaffAllowedActions } from '@/lib/staffPermissionMatrix'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      selectedStudent: null,
      availableStudents: [],
      studentId: null,
      entityId: null,
      academicYearId: null,
      academicYearTitle: null,
      permissions: [],
      permissionsMap: {},
      menuItems: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (data: LoginResponse) => {
        // Convert permission map to array format
        const permissions: Permission[] = [];
        let id = 1;
        const permissionsMap = data.permissions || {};
        Object.entries(permissionsMap).forEach(([resource, actions]) => {
          if (Array.isArray(actions)) {
            actions.forEach(action => {
              permissions.push({
                id: id.toString(),
                resource,
                action,
                is_granted: true,
              });
              id++;
            });
          }
        });

        // Set studentId based on role
        let studentId: string | null = null;
        const availableStudents = data.user.parent_profile?.students || [];

        // For students, use entity_id (student profile UUID) as the student ID
        // For parents, studentId will be set when they select a student
        if (data.role.name.toLowerCase() === 'student') {
          // Student role - entity_id is the student profile UUID
          studentId = data.entity_id || data.user.id;
        } else if (data.role.name.toLowerCase() === 'parent' && availableStudents.length > 0) {
          // Parent role - set to first available student initially
          studentId = availableStudents[0].id;
        }
        

        set({
          user: data.user,
          role: data.role,
          permissions,
          permissionsMap: data.permissions || {},
          menuItems: data.menu,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          isAuthenticated: true,
          entityId: data.entity_id || null,
          academicYearId: data.academic_year_id || null,
          academicYearTitle: data.academic_year_title || null,
          // Reset student selection on new login
          selectedStudent: availableStudents.length > 0 ? availableStudents[0] : null,
          availableStudents,
          studentId,
        })
      },

      logout: () => {
        set({
          user: null,
          role: null,
          selectedStudent: null,
          availableStudents: [],
          studentId: null,
          entityId: null,
          academicYearId: null,
          academicYearTitle: null,
          permissions: [],
          permissionsMap: {},
          menuItems: [],
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      selectStudent: (student: Student) => {
        set({
          selectedStudent: student,
          studentId: student.id // Set studentId when parent selects a student
        })
      },

      setAvailableStudents: (students: Student[]) => {
        set({ 
          availableStudents: students,
          // Auto-select first student if none selected and students available
          selectedStudent: get().selectedStudent || (students.length > 0 ? students[0] : null)
        })
      },

      refreshTokens: (accessToken: string, refreshToken: string) => {
        set({
          accessToken,
          refreshToken,
        })
      },

      setUser: (user: User | null) => {
        set({
          user,
          availableStudents: user?.parent_profile?.students || []
        })
      },

      setStudentId: (studentId: string | null) => {
        set({ studentId })
      },

      hasPermission: (resource: string, action: string) => {
        const { permissionsMap, role } = get()

        // Teacher role is capped by a frontend-only allowlist, independent
        // of whatever the backend grants. Resources not in that allowlist
        // fall through to the normal backend-driven check below.
        // See src/lib/teacherPermissionMatrix.ts for the full table.
        if ((role?.name ?? '').toLowerCase() === 'teacher') {
          const teacherAllowedActions = getTeacherAllowedActions(resource)
          if (teacherAllowedActions) {
            return teacherAllowedActions.includes(action)
          }
        }

        // Staff role is capped by a frontend-only allowlist, independent
        // of whatever the backend grants. Resources not in that allowlist
        // fall through to the normal backend-driven check below.
        // See src/lib/staffPermissionMatrix.ts for the full table.
        if ((role?.name ?? '').toLowerCase() === 'staff') {
          const staffAllowedActions = getStaffAllowedActions(resource)
          if (staffAllowedActions) {
            return staffAllowedActions.includes(action)
          }
        }

        const hasPerm = permissionsMap[resource]?.includes(action) || false;
        console.log(`authStore.hasPermission: Checking ${resource}:${action}`, {
          permissionsMap,
          resourceExists: !!permissionsMap[resource],
          actionsForResource: permissionsMap[resource],
          hasPerm
        });
        return hasPerm;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        selectedStudent: state.selectedStudent,
        availableStudents: state.availableStudents,
        studentId: state.studentId,
        entityId: state.entityId,
        academicYearId: state.academicYearId,
        academicYearTitle: state.academicYearTitle,
        permissions: state.permissions,
        permissionsMap: state.permissionsMap,
        menuItems: state.menuItems,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)