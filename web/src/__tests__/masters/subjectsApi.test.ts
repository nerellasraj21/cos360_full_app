import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))

vi.mock('@/api/index', () => ({ default: http }))

import { fetchClassSubjectMappings } from '@/api/masters/classsubjectmappings'
import { fetchSubjectCategories } from '@/api/masters/subjectCategories'
import { createSubject, fetchSubjects } from '@/api/masters/subjects'

describe('fetchSubjectCategories', () => {
  beforeEach(() => {
    http.get.mockReset()
  })

  it('TC-MST-07-U06 normalises a plain array', async () => {
    http.get.mockResolvedValue({ data: [{ id: '1', name: 'Core' }, { id: '2', name: 'Arts' }] })
    const result = await fetchSubjectCategories()
    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(2)
  })

  it('TC-MST-07-U06 normalises items and total_count', async () => {
    http.get.mockResolvedValue({ data: { items: [{ id: '1', name: 'Core' }], total_count: 120 } })
    expect(await fetchSubjectCategories()).toEqual({ items: [{ id: '1', name: 'Core' }], total: 120 })
  })

  it('TC-MST-07-U06 normalises data and count', async () => {
    http.get.mockResolvedValue({ data: { data: [{ id: '1', name: 'Core' }], count: 9 } })
    expect(await fetchSubjectCategories()).toEqual({ items: [{ id: '1', name: 'Core' }], total: 9 })
  })

  it('TC-MST-07-U06 falls back to an empty page for an empty body', async () => {
    http.get.mockResolvedValue({ data: null })
    expect(await fetchSubjectCategories()).toEqual({ items: [], total: 0 })
  })

  it('TC-MST-07-U06 builds the query string from skip, limit and active_only', async () => {
    http.get.mockResolvedValue({ data: [] })
    await fetchSubjectCategories(10, 5, { active_only: true })
    expect(http.get.mock.calls[0][0]).toBe('/masters/subject_categories/categories?skip=10&limit=5&active_only=true')
  })
})

describe('subjects api', () => {
  beforeEach(() => {
    http.get.mockReset()
    http.post.mockReset()
  })

  it('TC-MST-08-U08 maps short_code, category and category_id into the frontend shape', async () => {
    http.get.mockResolvedValue({
      data: {
        items: [{ id: 's1', name: 'Maths', short_code: 'MAT', category: { id: 'c1', name: 'Core' }, category_id: 'c1' }],
        total: 1,
      },
    })
    const { items, total } = await fetchSubjects()
    expect(total).toBe(1)
    expect(items[0].code).toBe('MAT')
    expect(items[0].subject_category).toEqual({ id: 'c1', name: 'Core' })
    expect(items[0].subject_category_id).toBe('c1')
  })

  it('TC-MST-08-U08 uses an empty code and null category when the backend omits them', async () => {
    http.get.mockResolvedValue({ data: [{ id: 's1', name: 'Maths' }] })
    const { items, total } = await fetchSubjects()
    expect(total).toBe(1)
    expect(items[0].code).toBe('')
    expect(items[0].subject_category).toBeNull()
  })

  it('TC-MST-08-U08 requests inactive subjects by default and adds the year filter only when set', async () => {
    http.get.mockResolvedValue({ data: { items: [] } })
    await fetchSubjects({ skip: 0, limit: 5, academic_year_id: 'y1' })
    expect(http.get.mock.calls[0][0]).toBe('/masters/subjects/?skip=0&limit=5&active_only=false&academic_year_id=y1')
    await fetchSubjects({ academic_year_id: '  ' })
    expect(http.get.mock.calls[1][0]).toBe('/masters/subjects/?active_only=false')
  })

  it('TC-MST-08-U09 sends category_id and drops subject_category_id from the create body', async () => {
    http.post.mockResolvedValue({ data: { id: 's1', name: 'Maths', short_code: 'MAT', category_id: 'c1' } })
    await createSubject({ name: 'Maths', code: 'MAT', subject_category_id: 'c1', academic_year_id: 'y1' } as never)
    const body = http.post.mock.calls[0][1]
    expect(body.category_id).toBe('c1')
    expect('subject_category_id' in body).toBe(false)
    expect(body.name).toBe('Maths')
  })
})

describe('fetchClassSubjectMappings', () => {
  beforeEach(() => {
    http.get.mockReset()
  })

  it('TC-MST-09-U06 reads total_count from a paged response', async () => {
    http.get.mockResolvedValue({ data: { items: [{ id: 'm1' }], total_count: 40 } })
    expect(await fetchClassSubjectMappings()).toEqual({ items: [{ id: 'm1' }], total: 40 })
  })

  it('TC-MST-09-U06 falls back to total when total_count is absent', async () => {
    http.get.mockResolvedValue({ data: { items: [{ id: 'm1' }], total: 3 } })
    expect((await fetchClassSubjectMappings()).total).toBe(3)
  })

  it('TC-MST-09-U06 uses the array length as total for a plain array', async () => {
    http.get.mockResolvedValue({ data: [{ id: 'm1' }, { id: 'm2' }] })
    expect(await fetchClassSubjectMappings()).toEqual({ items: [{ id: 'm1' }, { id: 'm2' }], total: 2 })
  })

  it('TC-MST-09-U06 puts only the given filters in the query string', async () => {
    http.get.mockResolvedValue({ data: [] })
    await fetchClassSubjectMappings({ skip: 0, limit: 10, academic_year_id: 'y1', active_only: false })
    expect(http.get.mock.calls[0][0]).toBe(
      '/masters/class-subject-mappings/?skip=0&limit=10&academic_year_id=y1&active_only=false'
    )
  })
})
