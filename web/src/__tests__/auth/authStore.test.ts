import './helpers/storage'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/lib/authStore'
import { TEACHER_PERMISSION_MATRIX, getTeacherAllowedActions } from '@/lib/teacherPermissionMatrix'
import { STAFF_PERMISSION_MATRIX, getStaffAllowedActions } from '@/lib/staffPermissionMatrix'
import { isAdminRoleName } from '@/lib/roleUtils'
import { makeLogin, makeStudent } from './helpers/fixtures'

const resetStore = () => useAuthStore.getState().logout()

const loginAs = (roleName: string, permissions: Record<string, string[]>) =>
  useAuthStore.getState().login(makeLogin(roleName, { permissions }))

describe('auth store login', () => {
  beforeEach(resetStore)

  it('TC-AUTH-03-U10 login as Student uses entity_id as studentId and flattens permissions', () => {
    useAuthStore.getState().login(
      makeLogin('Student', {
        entity_id: 'student-entity-1',
        permissions: { students: ['list', 'read'], fee_receipts: ['read_own'] },
      })
    )
    const state = useAuthStore.getState()
    expect(state.studentId).toBe('student-entity-1')
    expect(state.isAuthenticated).toBe(true)
    expect(state.entityId).toBe('student-entity-1')
    expect(state.permissions).toHaveLength(3)
    expect(state.permissions.map(({ resource, action, is_granted }) => ({ resource, action, is_granted }))).toEqual([
      { resource: 'students', action: 'list', is_granted: true },
      { resource: 'students', action: 'read', is_granted: true },
      { resource: 'fee_receipts', action: 'read_own', is_granted: true },
    ])
  })

  it('TC-AUTH-03-U10 login as Student without entity_id falls back to the user id', () => {
    useAuthStore.getState().login(makeLogin('Student'))
    expect(useAuthStore.getState().studentId).toBe('user-1')
  })

  it('TC-AUTH-03-U11 login as Parent selects the first of two children', () => {
    const first = makeStudent('s1')
    const second = makeStudent('s2')
    const data = makeLogin('Parent')
    data.user = { ...data.user, parent_profile: { id: 'p1', name: 'Parent', students: [first, second] } }
    useAuthStore.getState().login(data)
    const state = useAuthStore.getState()
    expect(state.selectedStudent).toEqual(first)
    expect(state.studentId).toBe('s1')
    expect(state.availableStudents).toHaveLength(2)
  })
})

describe('auth store hasPermission', () => {
  beforeEach(resetStore)

  it('TC-AUTH-05-U04 Admin map grants only listed resource and action pairs', () => {
    loginAs('Admin', { students: ['list'] })
    const { hasPermission } = useAuthStore.getState()
    expect(hasPermission('students', 'list')).toBe(true)
    expect(hasPermission('students', 'create')).toBe(false)
    expect(hasPermission('unknown_resource', 'list')).toBe(false)
  })

  it('TC-AUTH-05-U05 Teacher is capped by the matrix even when the backend grants more', () => {
    loginAs('Teacher', { exam_marks: ['create', 'read', 'list', 'delete'] })
    const { hasPermission } = useAuthStore.getState()
    expect(hasPermission('exam_marks', 'delete')).toBe(false)
    expect(hasPermission('exam_marks', 'create')).toBe(true)
    expect(hasPermission('exam_marks', 'list')).toBe(true)
  })

  it('TC-AUTH-05-U06 Teacher resource outside the matrix falls through to the backend grant', () => {
    loginAs('Teacher', { fee_categories: ['create'] })
    const { hasPermission } = useAuthStore.getState()
    expect(hasPermission('fee_categories', 'create')).toBe(true)
    expect(hasPermission('fee_categories', 'delete')).toBe(false)
  })

  it('TC-AUTH-05-U07 Staff fee_refunds allows create but not approve', () => {
    loginAs('Staff', { fee_refunds: ['create', 'approve'] })
    const { hasPermission } = useAuthStore.getState()
    expect(hasPermission('fee_refunds', 'create')).toBe(true)
    expect(hasPermission('fee_refunds', 'approve')).toBe(false)
  })

  it('TC-AUTH-05-U08 role name matching for the caps is case-insensitive', () => {
    loginAs('TEACHER', { exam_marks: ['delete'] })
    expect(useAuthStore.getState().hasPermission('exam_marks', 'delete')).toBe(false)
    loginAs('sTaFf', { fee_refunds: ['approve'] })
    expect(useAuthStore.getState().hasPermission('fee_refunds', 'approve')).toBe(false)
  })

  it('TC-AUTH-05-U09 logout clears permissions, menu and tokens', () => {
    const data = makeLogin('Admin', { permissions: { students: ['list'] } })
    data.menu = [{ id: '1', name: 'Dashboard', path: '/dashboard', icon: '', order: 1, children: [] }]
    useAuthStore.getState().login(data)
    expect(useAuthStore.getState().menuItems).toHaveLength(1)
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.permissions).toEqual([])
    expect(state.permissionsMap).toEqual({})
    expect(state.menuItems).toEqual([])
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })
})

describe('role permission matrices', () => {
  it('TC-AUTH-05-U05 teacher matrix holds the agreed actions', () => {
    expect(TEACHER_PERMISSION_MATRIX.exam_marks).toEqual(['create', 'read', 'list'])
    expect(TEACHER_PERMISSION_MATRIX.students).toEqual(['list'])
    expect(TEACHER_PERMISSION_MATRIX.student_attendance).toEqual(['create', 'read', 'update', 'list'])
    expect(getTeacherAllowedActions('fee_categories')).toBeUndefined()
    expect(getTeacherAllowedActions('academic_years')).toEqual(['read', 'list'])
  })

  it('TC-AUTH-05-U07 staff matrix holds the agreed actions', () => {
    expect(STAFF_PERMISSION_MATRIX.fee_refunds).toEqual(['create', 'read', 'list'])
    expect(STAFF_PERMISSION_MATRIX.expense_transactions).toEqual(['create', 'read', 'list'])
    expect(STAFF_PERMISSION_MATRIX.student_admissions).not.toContain('delete')
    expect(getStaffAllowedActions('unknown_resource')).toBeUndefined()
  })

  it('TC-AUTH-05-U08 admin role names are recognised case-insensitively', () => {
    expect(isAdminRoleName('Admin')).toBe(true)
    expect(isAdminRoleName('PRINCIPAL')).toBe(true)
    expect(isAdminRoleName('Teacher')).toBe(false)
    expect(isAdminRoleName(null)).toBe(false)
  })
})

describe('auth store students', () => {
  beforeEach(resetStore)

  it('TC-AUTH-09-U01 setAvailableStudents selects the first student when none is selected', () => {
    const first = makeStudent('s1')
    const second = makeStudent('s2')
    useAuthStore.getState().setAvailableStudents([first, second])
    expect(useAuthStore.getState().selectedStudent).toEqual(first)
    expect(useAuthStore.getState().availableStudents).toHaveLength(2)
  })

  it('TC-AUTH-09-U01 setAvailableStudents keeps an existing selection', () => {
    const first = makeStudent('s1')
    const second = makeStudent('s2')
    useAuthStore.getState().selectStudent(second)
    useAuthStore.getState().setAvailableStudents([first, second])
    expect(useAuthStore.getState().selectedStudent).toEqual(second)
  })

  it('TC-AUTH-09-U02 selectStudent updates selectedStudent and studentId', () => {
    const first = makeStudent('s1')
    const second = makeStudent('s2')
    useAuthStore.getState().setAvailableStudents([first, second])
    useAuthStore.getState().selectStudent(second)
    expect(useAuthStore.getState().selectedStudent).toEqual(second)
    expect(useAuthStore.getState().studentId).toBe('s2')
  })
})

describe('auth store persistence', () => {
  it('TC-AUTH-07-U11 partialize persists exactly the 14 data keys and no functions', () => {
    const options = useAuthStore.persist.getOptions()
    const persisted = options.partialize?.(useAuthStore.getState()) as Record<string, unknown>
    expect(Object.keys(persisted).sort()).toEqual(
      [
        'user',
        'role',
        'selectedStudent',
        'availableStudents',
        'studentId',
        'entityId',
        'academicYearId',
        'academicYearTitle',
        'permissions',
        'permissionsMap',
        'menuItems',
        'accessToken',
        'refreshToken',
        'isAuthenticated',
      ].sort()
    )
    expect(Object.values(persisted).some((value) => typeof value === 'function')).toBe(false)
    expect(options.name).toBe('auth-storage')
  })
})
