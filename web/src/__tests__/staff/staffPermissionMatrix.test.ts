import { describe, expect, it } from 'vitest'
import { getStaffAllowedActions, STAFF_PERMISSION_MATRIX } from '@/lib/staffPermissionMatrix'
import { getTeacherAllowedActions, TEACHER_PERMISSION_MATRIX } from '@/lib/teacherPermissionMatrix'

describe('staff and teacher permission caps (web)', () => {
  it('Staff is capped to read and list on staff', () => {
    expect(getStaffAllowedActions('staff')).toEqual(['read', 'list'])
  })

  it('Staff is capped to read and list on designations', () => {
    expect(getStaffAllowedActions('designations')).toEqual(['read', 'list'])
  })

  it('Teacher is capped to read and list on designations and has no staff entry', () => {
    expect(getTeacherAllowedActions('designations')).toEqual(['read', 'list'])
    expect(TEACHER_PERMISSION_MATRIX.staff).toBeUndefined()
  })

  it('staff_attendance and communications are not capped for Staff so the backend grant decides', () => {
    expect(getStaffAllowedActions('staff_attendance')).toBeUndefined()
    expect(STAFF_PERMISSION_MATRIX.communications).toBeUndefined()
    expect(getTeacherAllowedActions('staff_attendance')).toBeUndefined()
    expect(TEACHER_PERMISSION_MATRIX.communications).toBeUndefined()
  })

  it('no capped staff resource grants create, update or delete on staff or designations', () => {
    for (const resource of ['staff', 'designations']) {
      const actions = STAFF_PERMISSION_MATRIX[resource]
      expect(actions).not.toContain('create')
      expect(actions).not.toContain('update')
      expect(actions).not.toContain('delete')
    }
  })
})
