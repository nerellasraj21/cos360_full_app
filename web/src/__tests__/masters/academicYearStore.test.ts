import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchAcademicYears = vi.hoisted(() => vi.fn())

vi.mock('@/api/masters/academicyears', () => ({ fetchAcademicYears }))

type Year = { id: string; title: string; is_active: boolean }

const year = (id: string, active = false): Year => ({ id, title: `T-${id}`, is_active: active })

function makeStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial))
  return {
    getItem: vi.fn((k: string) => (data.has(k) ? data.get(k)! : null)),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: vi.fn((k: string) => void data.delete(k)),
    clear: vi.fn(() => data.clear()),
    has: (k: string) => data.has(k),
  }
}

async function loadStore(initial: Record<string, string> = {}) {
  const storage = makeStorage(initial)
  vi.stubGlobal('localStorage', storage)
  vi.resetModules()
  const mod = await import('@/lib/academicYearStore')
  return { store: mod.useAcademicYearStore, storage }
}

const LONG_ID = 'abcdefgh-0000-1111-2222-333344445555'

describe('academicYearStore', () => {
  beforeEach(() => {
    fetchAcademicYears.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('TC-MST-02-U01 selects the active year when the selection is empty', async () => {
    const { store } = await loadStore()
    const years = [year('aaaaaaaaaa1'), year('bbbbbbbbbb2', true), year('cccccccccc3')]
    fetchAcademicYears.mockResolvedValue({ items: years })
    await store.getState().fetchAndSetAcademicYears()
    expect(store.getState().selectedAcademicYearId).toBe('bbbbbbbbbb2')
    expect(store.getState().academicYears).toHaveLength(3)
  })

  it('TC-MST-02-U02 selects the last year in the list when none is active', async () => {
    const { store } = await loadStore()
    fetchAcademicYears.mockResolvedValue({ items: [year('aaaaaaaaaa1'), year('bbbbbbbbbb2'), year('cccccccccc3')] })
    await store.getState().fetchAndSetAcademicYears()
    expect(store.getState().selectedAcademicYearId).toBe('cccccccccc3')
  })

  it('TC-MST-02-U01 keeps an existing selection even when another year is active', async () => {
    const { store } = await loadStore()
    store.getState().setSelectedAcademicYearId('chosen-year-id-1')
    fetchAcademicYears.mockResolvedValue({ items: [year('aaaaaaaaaa1', true)] })
    await store.getState().fetchAndSetAcademicYears()
    expect(store.getState().selectedAcademicYearId).toBe('chosen-year-id-1')
  })

  it('TC-MST-02-U02 leaves the selection empty when the list is empty', async () => {
    const { store } = await loadStore()
    fetchAcademicYears.mockResolvedValue({ items: [] })
    await store.getState().fetchAndSetAcademicYears()
    expect(store.getState().selectedAcademicYearId).toBe('')
  })

  it('TC-MST-02-U02 keeps state unchanged when the fetch fails', async () => {
    const { store } = await loadStore()
    fetchAcademicYears.mockRejectedValue(new Error('boom'))
    await store.getState().fetchAndSetAcademicYears()
    expect(store.getState().academicYears).toEqual([])
    expect(store.getState().selectedAcademicYearId).toBe('')
  })

  it('TC-MST-02-U03 drops a persisted id of 371', async () => {
    const { store, storage } = await loadStore({
      'academic-year-storage': JSON.stringify({ state: { selectedAcademicYearId: '371' } }),
    })
    expect(store.getState().selectedAcademicYearId).toBe('')
    expect(storage.removeItem).toHaveBeenCalledWith('academic-year-storage')
  })

  it('TC-MST-02-U03 drops a persisted id shorter than 10 characters', async () => {
    const { store, storage } = await loadStore({
      'academic-year-storage': JSON.stringify({ state: { selectedAcademicYearId: 'abcde' } }),
    })
    expect(store.getState().selectedAcademicYearId).toBe('')
    expect(storage.removeItem).toHaveBeenCalledWith('academic-year-storage')
  })

  it('TC-MST-02-U03 keeps a persisted id of 10 or more characters', async () => {
    const { store, storage } = await loadStore({
      'academic-year-storage': JSON.stringify({ state: { selectedAcademicYearId: LONG_ID } }),
    })
    expect(store.getState().selectedAcademicYearId).toBe(LONG_ID)
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it('TC-MST-02-U03 starts empty when nothing is persisted and clearInvalidData resets everything', async () => {
    const { store } = await loadStore()
    expect(store.getState().selectedAcademicYearId).toBe('')
    store.getState().setAcademicYears([year('aaaaaaaaaa1')] as never)
    store.getState().setSelectedAcademicYearId(LONG_ID)
    store.getState().clearInvalidData()
    expect(store.getState().selectedAcademicYearId).toBe('')
    expect(store.getState().academicYears).toEqual([])
  })
})
