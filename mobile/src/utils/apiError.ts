/**
 * Extracts a human-readable message from a failed API call.
 *
 * The backend returns errors as `{ detail: string }` for simple failures and
 * `{ detail: [{ msg, loc, ... }, ...] }` for FastAPI validation errors (422).
 * Every exam mutation should surface this real message instead of a generic
 * "Failed to X" string, so a validation failure is actually actionable.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as any)?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d: any) => (typeof d === 'string' ? d : d?.msg)).filter(Boolean).join(' | ') || fallback;
  }
  return fallback;
}
