import { describe, expect, it } from 'vitest'
import { generateIdempotencyKey, validateCategoryForm, validateTypeForm } from '@/lib/expenseValidation'

describe('expense validators (web)', () => {
  it('TC-EXP-02-U09 category name required', () => {
    expect(validateCategoryForm({ name: '' }).name).toBe('Category name is required')
    expect(validateCategoryForm({ name: '   ' }).name).toBe('Category name is required')
  })

  it('TC-EXP-02-U09 category name minimum and maximum length', () => {
    expect(validateCategoryForm({ name: 'A' }).name).toBe('Category name must be at least 2 characters')
    expect(validateCategoryForm({ name: 'x'.repeat(101) }).name).toBe('Category name cannot exceed 100 characters')
    expect(validateCategoryForm({ name: 'x'.repeat(100) })).toEqual({})
  })

  it('TC-EXP-02-U09 category description limit is 500 on the web (backend allows 300)', () => {
    expect(validateCategoryForm({ name: 'Ok', description: 'd'.repeat(501) }).description).toBe(
      'Description cannot exceed 500 characters'
    )
    expect(validateCategoryForm({ name: 'Ok', description: 'd'.repeat(500) })).toEqual({})
  })

  it('TC-EXP-03-U08 type form reports every missing field', () => {
    const errors = validateTypeForm({ name: '', category_id: '' })
    expect(errors.name).toBe('Type name is required')
    expect(errors.category_id).toBe('Category is required')
  })

  it('TC-EXP-03-U08 type name length and description limit', () => {
    expect(validateTypeForm({ name: 'A', category_id: 'c1' }).name).toBe('Type name must be at least 2 characters')
    expect(validateTypeForm({ name: 'x'.repeat(101), category_id: 'c1' }).name).toBe(
      'Type name cannot exceed 100 characters'
    )
    expect(validateTypeForm({ name: 'Ok', category_id: 'c1', description: 'd'.repeat(501) }).description).toBe(
      'Description cannot exceed 500 characters'
    )
    expect(validateTypeForm({ name: 'Ok', category_id: 'c1', description: 'd'.repeat(500) })).toEqual({})
  })

  it('TC-EXP-06-U11 idempotency key matches txn_<digits>_<base36> and is unique per call', () => {
    const first = generateIdempotencyKey()
    const second = generateIdempotencyKey()
    expect(first).toMatch(/^txn_\d+_[a-z0-9]+$/)
    expect(second).toMatch(/^txn_\d+_[a-z0-9]+$/)
    expect(first).not.toBe(second)
  })
})
