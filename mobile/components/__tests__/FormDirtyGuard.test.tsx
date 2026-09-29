import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import {
  __navigationDispatchMock,
  __resetFormDirtyGuardNavMock,
  __triggerBeforeRemove,
} from '@react-navigation/native';

import { renderWithProviders } from './test-utils';
import { withFormDirtyGuard, FormDirtyGuard } from '@/components/FormDirtyGuard';
import { useDirtyTracking } from '@/hooks/use-dirty-tracking';

// --- Test fixtures --------------------------------------------------------

interface SimpleFormProps {
  value: string;
  onChangeValue: (v: string) => void;
}

/** Minimal "screen" with one field, standing in for any real form screen. */
function SimpleForm({ value, onChangeValue }: SimpleFormProps) {
  return (
    <View>
      <TextInput
        testID="field"
        value={value}
        onChangeText={onChangeValue}
      />
    </View>
  );
}

const GuardedSimpleForm = withFormDirtyGuard(SimpleForm, {
  title: 'Discard changes?',
  message: 'You have unsaved changes. If you leave now, they will be lost.',
});

interface WizardProps {
  onDirtyChange: (isDirty: boolean) => void;
}

/**
 * Stand-in for a multi-step ("multi-set") form: several distinct field
 * groups spread across steps, all feeding one dirty snapshot the way a real
 * wizard screen would (e.g. exam/create.tsx moving through tabs).
 */
function MultiStepWizard({ onDirtyChange }: WizardProps) {
  const [step, setStep] = useState<0 | 1>(0);
  const [values, setValues] = useState({ name: '', address: '' });
  const { isDirty } = useDirtyTracking(values);

  // Real screens typically lift `isDirty` to whatever owns navigation guard
  // wiring (a parent, or the same component in the hook-based approach).
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <View>
      <Text testID="step">{step}</Text>
      {step === 0 && (
        <TextInput
          testID="name-input"
          value={values.name}
          onChangeText={(t) => setValues((v) => ({ ...v, name: t }))}
        />
      )}
      {step === 1 && (
        <TextInput
          testID="address-input"
          value={values.address}
          onChangeText={(t) => setValues((v) => ({ ...v, address: t }))}
        />
      )}
      <TouchableOpacity testID="next-step" onPress={() => setStep(1)}>
        <Text>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const GuardedWizard = withFormDirtyGuard(MultiStepWizard, {
  message: 'Your progress across all steps will be lost.',
});

/** Owns the `isDirty` prop the HOC needs, the way a route/container would. */
function WizardHarness() {
  const [isDirty, setIsDirty] = useState(false);
  return <GuardedWizard isDirty={isDirty} onDirtyChange={setIsDirty} />;
}

// --- Tests -----------------------------------------------------------------

beforeEach(() => {
  __resetFormDirtyGuardNavMock();
});

describe('withFormDirtyGuard', () => {
  it('renders the wrapped screen with no confirmation dialog while clean', () => {
    const { queryByText } = renderWithProviders(
      <GuardedSimpleForm isDirty={false} value="" onChangeValue={() => {}} />
    );

    expect(queryByText('Discard changes?')).toBeNull();
  });

  it('does not show a dialog or block navigation when the form is clean', () => {
    const { queryByText } = renderWithProviders(
      <GuardedSimpleForm isDirty={false} value="" onChangeValue={() => {}} />
    );

    __triggerBeforeRemove();

    expect(queryByText('Discard changes?')).toBeNull();
    expect(__navigationDispatchMock).not.toHaveBeenCalled();
  });

  it('shows the confirmation dialog when leaving a screen with unsaved changes', () => {
    const { queryByText } = renderWithProviders(
      <GuardedSimpleForm isDirty={true} value="edited" onChangeValue={() => {}} />
    );

    expect(queryByText('Discard changes?')).toBeNull();

    __triggerBeforeRemove();

    expect(
      queryByText('You have unsaved changes. If you leave now, they will be lost.')
    ).not.toBeNull();
  });

  it('blocks navigation (no dispatch) until the user explicitly chooses to discard', () => {
    const { getByText, queryByText } = renderWithProviders(
      <GuardedSimpleForm isDirty={true} value="edited" onChangeValue={() => {}} />
    );

    __triggerBeforeRemove();
    expect(queryByText('Discard changes?')).not.toBeNull();

    // Merely having the dialog open must not have let navigation through.
    expect(__navigationDispatchMock).not.toHaveBeenCalled();

    // Choosing to stay: dialog closes, navigation still never dispatched.
    fireEvent.press(getByText('Keep Editing'));
    expect(queryByText('Discard changes?')).toBeNull();
    expect(__navigationDispatchMock).not.toHaveBeenCalled();

    // A second leave attempt must still be caught — the guard doesn't
    // one-shot itself after a cancel.
    __triggerBeforeRemove();
    expect(queryByText('Discard changes?')).not.toBeNull();

    // Choosing to discard completes the navigation that was blocked.
    fireEvent.press(getByText('Discard'));
    expect(queryByText('Discard changes?')).toBeNull();
    expect(__navigationDispatchMock).toHaveBeenCalledTimes(1);
  });

  it('dispatches the exact action that was originally blocked', () => {
    const { getByText } = renderWithProviders(
      <GuardedSimpleForm isDirty={true} value="edited" onChangeValue={() => {}} />
    );

    const blockedAction = { type: 'GO_BACK', source: 'test-back-button' };
    __triggerBeforeRemove(blockedAction);

    fireEvent.press(getByText('Discard'));

    expect(__navigationDispatchMock).toHaveBeenCalledWith(blockedAction);
  });

  it('invokes onDiscard after the user confirms leaving', () => {
    const onDiscard = jest.fn();
    const Guarded = withFormDirtyGuard(SimpleForm, { onDiscard });
    const { getByText } = renderWithProviders(
      <Guarded isDirty={true} value="edited" onChangeValue={() => {}} />
    );

    __triggerBeforeRemove();
    fireEvent.press(getByText('Discard'));

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});

describe('withFormDirtyGuard across a multi-step form', () => {
  it('keeps guarding as isDirty flips true from step 0 and survives moving to step 1', () => {
    const { getByTestId, queryByText } = renderWithProviders(<WizardHarness />);

    // Untouched wizard: leaving is not blocked.
    __triggerBeforeRemove();
    expect(queryByText('Your progress across all steps will be lost.')).toBeNull();

    // Edit a field on step 0.
    fireEvent.changeText(getByTestId('name-input'), 'Jane Doe');

    // Move to step 1 — the field from step 0 is gone from the tree, but the
    // dirty snapshot (and thus the guard) must persist across the step
    // change since it's the same underlying form state.
    fireEvent.press(getByTestId('next-step'));
    expect(getByTestId('step').props.children).toBe(1);

    __triggerBeforeRemove();
    expect(
      queryByText('Your progress across all steps will be lost.')
    ).not.toBeNull();
  });

  it('accumulates edits from multiple steps and still blocks a single "Keep Editing"/"Discard" cycle correctly', () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(
      <WizardHarness />
    );

    fireEvent.changeText(getByTestId('name-input'), 'Jane Doe');
    fireEvent.press(getByTestId('next-step'));
    fireEvent.changeText(getByTestId('address-input'), '221B Baker Street');

    __triggerBeforeRemove();
    expect(
      queryByText('Your progress across all steps will be lost.')
    ).not.toBeNull();

    // Stay and keep editing — nothing should navigate away.
    fireEvent.press(getByText('Keep Editing'));
    expect(__navigationDispatchMock).not.toHaveBeenCalled();
    expect(getByTestId('address-input').props.value).toBe('221B Baker Street');

    // Now discard — the blocked navigation finally goes through.
    __triggerBeforeRemove();
    fireEvent.press(getByText('Discard'));
    expect(__navigationDispatchMock).toHaveBeenCalledTimes(1);
  });
});

describe('FormDirtyGuard (component form)', () => {
  it('guards inline JSX children the same way the HOC guards a wrapped screen', () => {
    const { getByText, queryByText } = renderWithProviders(
      <FormDirtyGuard isDirty={true} message="Inline children changes will be lost.">
        <Text>Inline form content</Text>
      </FormDirtyGuard>
    );

    expect(queryByText('Inline form content')).not.toBeNull();
    expect(queryByText('Inline children changes will be lost.')).toBeNull();

    __triggerBeforeRemove();
    expect(queryByText('Inline children changes will be lost.')).not.toBeNull();

    fireEvent.press(getByText('Discard'));
    expect(__navigationDispatchMock).toHaveBeenCalledTimes(1);
  });
});
