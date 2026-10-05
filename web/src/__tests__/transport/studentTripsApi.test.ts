import { beforeEach, describe, expect, it, vi } from 'vitest'

const put = vi.fn()
const patch = vi.fn()

vi.mock('@/api/index', () => ({
  default: {
    put: (...args: unknown[]) => put(...args),
    patch: (...args: unknown[]) => patch(...args),
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import { patchStudentTrip, updateStudentTrip } from '@/api/masters/studentTrips'

describe('student transport web API wrappers', () => {
  beforeEach(() => {
    put.mockReset()
    patch.mockReset()
  })

  it('TC-TRN-11-U01 updateStudentTrip targets PUT /students/student-transport/{id} (route is not served)', async () => {
    put.mockResolvedValue({ data: { id: 'abc' } })
    const body = { student_id: 's', trip_id: 't', stop_id: 'p', fee_per_term: 1500 } as never
    const out = await updateStudentTrip('abc', body)
    expect(put).toHaveBeenCalledWith('/students/student-transport/abc', body)
    expect(out).toEqual({ id: 'abc' })
  })

  it('TC-TRN-11-U01 patchStudentTrip targets PATCH on the same base path', async () => {
    patch.mockResolvedValue({ data: { id: 'abc' } })
    await patchStudentTrip('abc', { fee_per_term: 10 } as never)
    expect(patch).toHaveBeenCalledWith('/students/student-transport/abc', { fee_per_term: 10 })
  })
})
