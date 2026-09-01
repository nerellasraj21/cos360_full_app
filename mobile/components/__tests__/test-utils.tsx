import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';

/**
 * Shared render helper for component tests that touch themed UI
 * (ConfirmModal, ThemedText, etc all read from ThemeContext).
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions
) {
  return render(<ThemeProvider>{ui}</ThemeProvider>, options);
}

export * from '@testing-library/react-native';
