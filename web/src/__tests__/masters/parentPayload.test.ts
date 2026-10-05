import { describe, expect, it } from 'vitest'

import { buildParentPayload } from '@/components/masters/parents/ParentsTable'

describe('buildParentPayload', () => {
  it('TC-MST-11-U10 drops empty optional fields and sends no user_id', () => {
    const payload = buildParentPayload({
      name: ' Asha ',
      email: '',
      phone: '9999999999',
      occupation: '  ',
      aadhar_number: '',
      gender: undefined,
      relation_to_student: 'Mother',
    })
    expect(payload).toEqual({ name: 'Asha', phone: '9999999999', relation_to_student: 'Mother' })
    expect('user_id' in payload).toBe(false)
    expect('email' in payload).toBe(false)
  })

  it('TC-MST-11-U10 keeps filled optional fields', () => {
    const payload = buildParentPayload({
      name: 'Ravi',
      email: 'ravi@example.com',
      phone: '',
      occupation: 'Engineer',
      aadhar_number: '123456789012',
      gender: 'Male',
      relation_to_student: 'Father',
    })
    expect(payload).toEqual({
      name: 'Ravi',
      email: 'ravi@example.com',
      occupation: 'Engineer',
      aadhar_number: '123456789012',
      gender: 'Male',
      relation_to_student: 'Father',
    })
  })
})
