import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/lib/authStore'
import type { Student } from '@/types/auth'

const child = (id: string, name: string): Student =>
  ({ id, first_name: name, last_name: 'Rao', name: `${name} Rao` }) as unknown as Student

describe('parent child selection store', () => {
  beforeEach(() => {
    useAuthStore.setState({ selectedStudent: null, studentId: null, availableStudents: [] })
  })

  it('TC-STU-19-U02 selectStudent sets selectedStudent and studentId', () => {
    const child1 = child('c1', 'Asha')
    const child2 = child('c2', 'Ravi')
    useAuthStore.getState().setAvailableStudents([child1, child2])
    expect(useAuthStore.getState().selectedStudent).toEqual(child1)

    useAuthStore.getState().selectStudent(child2)

    expect(useAuthStore.getState().selectedStudent).toEqual(child2)
    expect(useAuthStore.getState().studentId).toBe('c2')
  })

  it('TC-STU-19-U02 setAvailableStudents keeps an existing selection', () => {
    const child1 = child('c1', 'Asha')
    const child2 = child('c2', 'Ravi')
    useAuthStore.getState().selectStudent(child2)
    useAuthStore.getState().setAvailableStudents([child1, child2])
    expect(useAuthStore.getState().selectedStudent).toEqual(child2)
  })
})
