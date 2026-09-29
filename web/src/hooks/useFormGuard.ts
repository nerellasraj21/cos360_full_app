import { useState } from 'react';

/**
 * Tracks whether a form has unsaved changes and manages
 * the confirmation dialog before closing.
 */
export function useFormGuard() {
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /** Call when any form field changes */
  const markDirty = () => setIsDirty(true);

  /** Reset dirty + confirm state (call after successful submit or confirmed discard) */
  const reset = () => {
    setIsDirty(false);
    setShowConfirm(false);
  };

  /**
   * Attempt to close the form.
   * If dirty → show confirmation dialog.
   * If clean → call onClose immediately.
   */
  const attemptClose = (onClose: () => void) => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  /**
   * User confirmed discard — close and reset.
   */
  const confirmDiscard = (onClose: () => void) => {
    reset();
    onClose();
  };

  return {
    isDirty,
    markDirty,
    reset,
    showConfirm,
    setShowConfirm,
    attemptClose,
    confirmDiscard,
  };
}
