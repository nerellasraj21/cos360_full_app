import React from 'react';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  useFormDirtyGuard,
  UseFormDirtyGuardOptions,
} from '@/hooks/use-form-dirty-guard';

/**
 * Declarative sibling to [[useFormDirtyGuard]] for screens that already know
 * their dirty state as a prop (e.g. a container passes down
 * `formState.isDirty`, or a parent owns the form's `useState`). It renders
 * the confirmation modal for you, so the wrapped screen needs zero
 * boilerplate beyond reporting `isDirty`.
 *
 * Prefer the hook directly when the component that owns the form state can
 * call hooks itself — this HOC is just `useFormDirtyGuard` + `ConfirmModal`
 * wired together for the "wrap an existing screen" case.
 *
 * Usage:
 *   function EditStudentScreen({ isDirty, ...rest }: Props) { ... }
 *   export default withFormDirtyGuard(EditStudentScreen, {
 *     message: 'Your changes to this student record will be lost.',
 *   });
 */

export interface WithFormDirtyGuardProps {
  /** Whether the wrapped screen currently has unsaved changes. */
  isDirty: boolean;
}

export function withFormDirtyGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardOptions?: UseFormDirtyGuardOptions
) {
  function FormDirtyGuardedScreen(props: P & WithFormDirtyGuardProps) {
    const { isDirty, ...rest } = props;
    const { modalProps } = useFormDirtyGuard(isDirty, guardOptions);

    return (
      <>
        <Component {...(rest as P)} />
        <ConfirmModal {...modalProps} />
      </>
    );
  }

  FormDirtyGuardedScreen.displayName = `withFormDirtyGuard(${
    Component.displayName || Component.name || 'Component'
  })`;

  return FormDirtyGuardedScreen;
}

/**
 * Component form of the same wiring, for JSX composition instead of a HOC —
 * useful when the form lives inline in a screen and you'd rather not extract
 * a separate component to wrap.
 *
 * Usage:
 *   <FormDirtyGuard isDirty={isDirty} message="...">
 *     <MyFormFields />
 *   </FormDirtyGuard>
 */
export function FormDirtyGuard({
  isDirty,
  children,
  ...guardOptions
}: WithFormDirtyGuardProps &
  UseFormDirtyGuardOptions & { children: React.ReactNode }) {
  const { modalProps } = useFormDirtyGuard(isDirty, guardOptions);

  return (
    <>
      {children}
      <ConfirmModal {...modalProps} />
    </>
  );
}
