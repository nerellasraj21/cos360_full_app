import { memoryStorage } from './helpers/storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadStore = async () => {
  vi.resetModules()
  const module = await import('@/lib/academicYearStore')
  return module.useAcademicYearStore
}

const persist = (selectedAcademicYearId: string) =>
  memoryStorage.setItem('academic-year-storage', JSON.stringify({ state: { selectedAcademicYearId }, version: 0 }))

describe('academic year store initial value', () => {
  beforeEach(() => {
    memoryStorage.clear()
  })

  it('TC-AUTH-02-U05 a stored legacy id 371 is removed and the selection starts empty', async () => {
    persist('371')
    const store = await loadStore()
    expect(store.getState().selectedAcademicYearId).toBe('')
    expect(memoryStorage.getItem('academic-year-storage')).toBeNull()
  })

  it('TC-AUTH-02-U05 a stored short id abc is removed and the selection starts empty', async () => {
    persist('abc')
    const store = await loadStore()
    expect(store.getState().selectedAcademicYearId).toBe('')
    expect(memoryStorage.getItem('academic-year-storage')).toBeNull()
  })

  it('TC-AUTH-02-U05 a stored uuid is kept', async () => {
    const id = '8c1f2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f'
    persist(id)
    const store = await loadStore()
    expect(store.getState().selectedAcademicYearId).toBe(id)
  })

  it('TC-AUTH-02-U05 nothing stored gives an empty selection', async () => {
    const store = await loadStore()
    expect(store.getState().selectedAcademicYearId).toBe('')
  })
})
