import { useCallback, useRef, useState } from 'react';

/**
 * Generic snapshot-based "dirty" detector for forms that hold their state in
 * plain `useState` (the pattern used across this app's forms, e.g.
 * StaffProfileForm, ParentProfileForm, exam/create.tsx, expense transaction
 * forms, etc). Not tied to any form library.
 *
 * Usage:
 *   const [formData, setFormData] = useState(initialData);
 *   const { isDirty, markClean } = useDirtyTracking(formData);
 *   ...
 *   await save(formData);
 *   markClean(); // form is now considered saved/clean again
 */

export type DirtyComparator<T> = (baseline: T, current: T) => boolean;

/** Default equality check: deep-ish comparison via JSON serialization. */
function defaultIsEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    // Non-serializable values (functions, File/Blob refs, etc) fall back to
    // reference equality rather than throwing.
    return a === b;
  }
}

export interface UseDirtyTrackingOptions<T> {
  /** Baseline to diff `values` against. Defaults to the first `values` seen. */
  initialValues?: T;
  /** Custom equality check, in case JSON.stringify isn't appropriate. */
  isEqual?: DirtyComparator<T>;
}

export interface UseDirtyTrackingResult<T> {
  /** True when `values` differs from the current baseline. */
  isDirty: boolean;
  /** Reset the baseline (defaults to the latest `values`) — call after a successful save. */
  markClean: (newBaseline?: T) => void;
  /** The value currently considered "saved". */
  baseline: T;
}

export function useDirtyTracking<T>(
  values: T,
  options: UseDirtyTrackingOptions<T> = {}
): UseDirtyTrackingResult<T> {
  const isEqual = options.isEqual ?? defaultIsEqual;
  const baselineRef = useRef<T>(options.initialValues ?? values);
  // Only used to force a re-render when markClean() doesn't itself change `values`.
  const [, bump] = useState(0);

  const isDirty = !isEqual(baselineRef.current, values);

  const markClean = useCallback(
    (newBaseline?: T) => {
      baselineRef.current = newBaseline ?? values;
      bump((n) => n + 1);
    },
    [values]
  );

  return { isDirty, markClean, baseline: baselineRef.current };
}
