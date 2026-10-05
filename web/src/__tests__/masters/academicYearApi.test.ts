import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.hoisted(() => vi.fn())

vi.mock('@/api/index', () => ({ default: { get, post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

import { fetchPaginatedAcademicYears } from '@/api/masters/academicyears'

const years = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, title: `Y${i}`, is_active: false }))

describe('fetchPaginatedAcademicYears', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('TC-MST-01-U08 estimates total as skip + items + limit for a full page without total', async () => {
    get.mockResolvedValue({ data: { items: years(5) } })
    const result = await fetchPaginatedAcademicYears(0, 5)
    expect(result.hasMore).toBe(true)
    expect(result.total).toBe(10)
    expect(result.data).toHaveLength(5)
  })

  it('TC-MST-01-U08 estimates total as skip + items for a partial page', async () => {
    get.mockResolvedValue({ data: { items: years(2) } })
    const result = await fetchPaginatedAcademicYears(5, 5)
    expect(result.hasMore).toBe(false)
    expect(result.total).toBe(7)
  })

  it('TC-MST-01-U08 uses total when the response carries it', async () => {
    get.mockResolvedValue({ data: { items: years(5), total: 7 } })
    const result = await fetchPaginatedAcademicYears(0, 5)
    expect(result.total).toBe(7)
    expect(result.hasMore).toBe(true)
  })

  it('TC-MST-01-U08 ignores total_count sent by the API and estimates instead [defect KG-10]', async () => {
    get.mockResolvedValue({ data: { items: years(5), total_count: 7, has_next: true } })
    const result = await fetchPaginatedAcademicYears(0, 5)
    expect(result.total).toBe(10)
  })

  it('TC-MST-01-U08 requests inactive years too and passes skip and limit', async () => {
    get.mockResolvedValue({ data: { items: [] } })
    await fetchPaginatedAcademicYears(10, 5)
    expect(get.mock.calls[0][1]).toEqual({ params: { skip: 10, limit: 5, active_only: false } })
  })

  it('TC-MST-01-U08 turns an API error body into an Error with the detail text', async () => {
    get.mockRejectedValue({ response: { data: { detail: 'Fetching academic years failed' } } })
    await expect(fetchPaginatedAcademicYears(0, 5)).rejects.toThrow('Fetching academic years failed')
  })
})
