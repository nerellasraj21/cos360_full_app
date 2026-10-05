import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchSubjects = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: (options: unknown) => options }
})

vi.mock('@/api/masters/subjects', () => ({
  fetchSubjects,
  fetchSubjectById: vi.fn(),
  createSubject: vi.fn(),
  updateSubject: vi.fn(),
  deleteSubject: vi.fn(),
  createBulkClassSubjectMappings: vi.fn(),
  fetchSubjectsDropdown: vi.fn(),
}))

vi.mock('@/lib/academicYearStore', () => ({ useAcademicYearStore: vi.fn() }))

import { useSubjectsPaginated } from '@/api/hooks/masters/subjects'

type Options = {
  queryKey: unknown[]
  queryFn: () => Promise<{ data: { id: number }[]; total: number; hasMore: boolean }>
  enabled: boolean
}

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }))

describe('useSubjectsPaginated query function', () => {
  beforeEach(() => {
    fetchSubjects.mockReset()
  })

  it('TC-MST-08-U10 slices a full list to items 6 to 10 on page index 1 with size 5', async () => {
    fetchSubjects.mockResolvedValue({ items: items(12), total: 12 })
    const options = useSubjectsPaginated(1, 5) as unknown as Options
    const result = await options.queryFn()
    expect(result.data.map((s) => s.id)).toEqual([6, 7, 8, 9, 10])
    expect(result.hasMore).toBe(true)
    expect(result.total).toBe(12)
  })

  it('TC-MST-08-U10 returns items 11 to 12 and no more on page index 2', async () => {
    fetchSubjects.mockResolvedValue({ items: items(12), total: 12 })
    const options = useSubjectsPaginated(2, 5) as unknown as Options
    const result = await options.queryFn()
    expect(result.data.map((s) => s.id)).toEqual([11, 12])
    expect(result.hasMore).toBe(false)
  })

  it('TC-MST-08-U10 does not slice a page the server already limited', async () => {
    fetchSubjects.mockResolvedValue({ items: items(5), total: 12 })
    const options = useSubjectsPaginated(1, 5) as unknown as Options
    const result = await options.queryFn()
    expect(result.data).toHaveLength(5)
    expect(result.hasMore).toBe(true)
    expect(fetchSubjects).toHaveBeenCalledWith({ skip: 5, limit: 5, active_only: false })
  })

  it('TC-MST-08-U10 keys the query by page and size and honours the enabled flag', () => {
    const options = useSubjectsPaginated(3, 20, false) as unknown as Options
    expect(options.queryKey).toEqual(['subjects', 'paginated', 3, 20])
    expect(options.enabled).toBe(false)
  })
})
