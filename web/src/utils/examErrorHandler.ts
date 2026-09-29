import type { AxiosError } from 'axios'
import type { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'

interface ValidationError {
  loc: string[]
  msg: string
  type: string
}

export const handleExamApiError = (
  error: AxiosError<{ detail: string | ValidationError[] }>,
  form?: UseFormReturn<any>
) => {
  if (!error.response) {
    toast.error('Network error. Please check your connection.')
    return
  }

  const { status, data } = error.response

  if (status === 422) {
    const detail = data?.detail
    if (Array.isArray(detail)) {
      detail.forEach((err) => {
        const fieldPath = err.loc?.slice(1).join('.')
        if (fieldPath && form) {
          form.setError(fieldPath as any, { message: err.msg })
        } else {
          toast.error(`Validation error: ${err.msg}`)
        }
      })
    } else {
      toast.error('Validation failed. Please check your inputs.')
    }
    return
  }

  if (status === 400) {
    const message = typeof data?.detail === 'string'
      ? data.detail
      : 'Request failed.'
    toast.error(message)
    return
  }

  if (status === 403) {
    window.location.href = '/error/403'
    return
  }

  if (status === 404) {
    toast.error('The requested record was not found.')
    return
  }

  if (status === 409) {
    const message = typeof data?.detail === 'string'
      ? data.detail
      : 'Conflict: This record already exists.'
    toast.error(message)
    return
  }

  toast.error('An unexpected error occurred. Please try again.')
}

/**
 * Maps 422 errors from create-full to wizard accordion sections
 */
export const mapCreateFullErrorsToWizardSections = (
  detail: ValidationError[]
): { section: 1 | 2 | 3 | 4; field: string; message: string }[] => {
  return detail.map((err) => {
    const root = err.loc[1]
    let section: 1 | 2 | 3 | 4 = 1

    if (root === 'exam') section = 1
    else if (root === 'class_sections') section = 2
    else if (root === 'subject_configs') section = 3
    else if (root === 'exam_dates') section = 4

    const field = err.loc.slice(1).join('.')
    return { section, field, message: err.msg }
  })
}
