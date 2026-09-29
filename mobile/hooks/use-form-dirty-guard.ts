import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import type { NavigationAction } from '@react-navigation/native';

/**
 * Reusable "unsaved changes" navigation guard.
 *
 * Wraps React Navigation's `usePreventRemove` (which expo-router screens sit
 * on top of) so any screen can block back/gesture/hardware-back navigation
 * while a form is dirty, and surface a confirmation dialog instead of
 * silently discarding edits.
 *
 * Generic on purpose: it only needs a boolean `isDirty`, so it composes with
 * any state source — manual `useState`, [[useDirtyTracking]] snapshots, or a
 * form library's own `isDirty`/`formState.isDirty`.
 *
 * NOTE on scope: this guards the *current screen* leaving via a navigation
 * action (back button, gesture, header back, router.back()/push() away,
 * hardware back on Android — all of these dispatch actions that funnel
 * through `beforeRemove`). It does not intercept switching tabs in a bottom
 * tab navigator that keeps screens mounted (no unmount = nothing to prevent),
 * and on Android it can't stop the OS from backgrounding/killing the app from
 * the root screen. For web builds it additionally guards tab close/refresh
 * via `beforeunload`.
 */

export interface UseFormDirtyGuardOptions {
  /** Master on/off switch — e.g. only guard while in "edit mode". Default true. */
  enabled?: boolean;
  title?: string;
  message?: string;
  /** Label for the destructive action that discards changes and leaves. */
  confirmLabel?: string;
  /** Label for staying on the screen. */
  cancelLabel?: string;
  /** Called after the user confirms discarding (e.g. to reset form state). */
  onDiscard?: () => void;
}

export interface UseFormDirtyGuardResult {
  /** True while a confirmation is pending (i.e. the user tried to leave). */
  isBlocked: boolean;
  /** Confirm discarding changes and complete the navigation that was blocked. */
  confirmDiscard: () => void;
  /** Cancel and stay on the screen. */
  cancelDiscard: () => void;
  /**
   * Spread directly onto `<ConfirmModal />` (see components/ConfirmModal.tsx):
   *   <ConfirmModal {...modalProps} />
   */
  modalProps: {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    destructive: true;
    onConfirm: () => void;
    onCancel: () => void;
  };
}

const DEFAULT_TITLE = 'Discard changes?';
const DEFAULT_MESSAGE =
  'You have unsaved changes. If you leave now, they will be lost.';

export function useFormDirtyGuard(
  isDirty: boolean,
  options: UseFormDirtyGuardOptions = {}
): UseFormDirtyGuardResult {
  const {
    enabled = true,
    title = DEFAULT_TITLE,
    message = DEFAULT_MESSAGE,
    confirmLabel = 'Discard',
    cancelLabel = 'Keep Editing',
    onDiscard,
  } = options;

  const shouldPrevent = enabled && isDirty;
  const navigation = useNavigation();
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(
    null
  );

  usePreventRemove(shouldPrevent, ({ data }) => {
    setPendingAction(data.action);
  });

  // Web parity: guard tab close / refresh / external navigation too.
  useEffect(() => {
    if (Platform.OS !== 'web' || !shouldPrevent) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [shouldPrevent]);

  const confirmDiscard = useCallback(() => {
    if (pendingAction) {
      navigation.dispatch(pendingAction);
    }
    setPendingAction(null);
    onDiscard?.();
  }, [pendingAction, navigation, onDiscard]);

  const cancelDiscard = useCallback(() => {
    setPendingAction(null);
  }, []);

  return {
    isBlocked: pendingAction !== null,
    confirmDiscard,
    cancelDiscard,
    modalProps: {
      visible: pendingAction !== null,
      title,
      message,
      confirmLabel,
      cancelLabel,
      destructive: true,
      onConfirm: confirmDiscard,
      onCancel: cancelDiscard,
    },
  };
}
