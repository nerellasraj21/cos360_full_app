import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const toastError = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({ toast: { error: toastError } }))

import { handleExamApiError, mapCreateFullErrorsToWizardSections } from '@/utils/examErrorHandler'

const apiError = (status: number, detail?: unknown) =>
  ({ response: { status, data: { detail } } }) as never

describe('handleExamApiError', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { href: '/exam' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports a network error when there is no response', () => {
    handleExamApiError({} as never)
    expect(toastError).toHaveBeenCalledWith('Network error. Please check your connection.')
  })

  it('maps 422 field errors onto the form with the leading loc segment dropped', () => {
    const setError = vi.fn()
    handleExamApiError(
      apiError(422, [{ loc: ['body', 'exam', 'exam_name'], msg: 'too long', type: 'x' }]),
      { setError } as never,
    )
    expect(setError).toHaveBeenCalledWith('exam.exam_name', { message: 'too long' })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('toasts 422 field errors when no form is given', () => {
    handleExamApiError(apiError(422, [{ loc: ['body', 'x'], msg: 'bad', type: 'x' }]))
    expect(toastError).toHaveBeenCalledWith('Validation error: bad')
  })

  it('uses a generic 422 message when detail is not a list', () => {
    handleExamApiError(apiError(422, 'nope'))
    expect(toastError).toHaveBeenCalledWith('Validation failed. Please check your inputs.')
  })

  it('shows string detail for 400 and 409 with fallbacks', () => {
    handleExamApiError(apiError(400, 'Bad thing'))
    expect(toastError).toHaveBeenLastCalledWith('Bad thing')
    handleExamApiError(apiError(400, [] as never))
    expect(toastError).toHaveBeenLastCalledWith('Request failed.')
    handleExamApiError(apiError(409, 'Already there'))
    expect(toastError).toHaveBeenLastCalledWith('Already there')
    handleExamApiError(apiError(409))
    expect(toastError).toHaveBeenLastCalledWith('Conflict: This record already exists.')
  })

  it('redirects on 403 and toasts on 404 and unknown statuses', () => {
    handleExamApiError(apiError(403))
    expect((globalThis as unknown as { window: { location: { href: string } } }).window.location.href).toBe(
      '/error/403',
    )
    handleExamApiError(apiError(404))
    expect(toastError).toHaveBeenLastCalledWith('The requested record was not found.')
    handleExamApiError(apiError(500))
    expect(toastError).toHaveBeenLastCalledWith('An unexpected error occurred. Please try again.')
  })
})

describe('mapCreateFullErrorsToWizardSections', () => {
  it('maps the loc root to a wizard section', () => {
    const out = mapCreateFullErrorsToWizardSections([
      { loc: ['body', 'exam', 'exam_name'], msg: 'a', type: 't' },
      { loc: ['body', 'class_sections', '0'], msg: 'b', type: 't' },
      { loc: ['body', 'subject_configs', '0', 'components'], msg: 'c', type: 't' },
      { loc: ['body', 'exam_dates', '1', 'exam_date'], msg: 'd', type: 't' },
      { loc: ['body', 'other'], msg: 'e', type: 't' },
    ])
    expect(out.map((e) => e.section)).toEqual([1, 2, 3, 4, 1])
    expect(out[0].field).toBe('exam.exam_name')
    expect(out[2].field).toBe('subject_configs.0.components')
  })
})
