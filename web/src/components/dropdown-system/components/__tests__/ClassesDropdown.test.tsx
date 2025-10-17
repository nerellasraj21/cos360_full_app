import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClassesDropdown } from '../ClassesDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../../constants/dropdown/endpoints';
import type { DropdownOption } from '../../../../types/dropdown';

// Mock the InfiniteScrollDropdown component
jest.mock('../../../dropdown/InfiniteScrollDropdown', () => ({
  InfiniteScrollDropdown: jest.fn(({ endpoint, placeholder, onChange, value, ...props }) => (
    <div data-testid="infinite-scroll-dropdown">
      <div data-testid="endpoint-key">{endpoint.key}</div>
      <div data-testid="placeholder">{placeholder}</div>
      <input
        data-testid="dropdown-input"
        value={value || ''}
        onChange={(e) => {
          const mockOption: DropdownOption = {
            id: e.target.value,
            label: `Class ${e.target.value}`,
            value: e.target.value,
          };
          onChange(e.target.value, mockOption);
        }}
        placeholder={placeholder}
        {...props}
      />
    </div>
  )),
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ClassesDropdown', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    renderWithQueryClient(
      <ClassesDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('placeholder')).toHaveTextContent('Select Class...');
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Choose Class';
    
    renderWithQueryClient(
      <ClassesDropdown
        value=""
        onChange={mockOnChange}
        placeholder={customPlaceholder}
      />
    );

    expect(screen.getByTestId('placeholder')).toHaveTextContent(customPlaceholder);
  });

  it('uses the correct endpoint configuration', () => {
    renderWithQueryClient(
      <ClassesDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.CLASSES.key);
  });

  it('handles value changes correctly', async () => {
    renderWithQueryClient(
      <ClassesDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    fireEvent.change(input, { target: { value: '10' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('10', {
        id: '10',
        label: 'Class 10',
        value: '10',
      });
    });
  });

  it('displays selected value correctly', () => {
    renderWithQueryClient(
      <ClassesDropdown
        value="12"
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toHaveValue('12');
  });

  it('passes through additional props', () => {
    renderWithQueryClient(
      <ClassesDropdown
        value=""
        onChange={mockOnChange}
        disabled={true}
        required={true}
        className="custom-class"
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toBeDisabled();
    expect(input).toBeRequired();
    expect(input).toHaveClass('custom-class');
  });

  it('handles error prop correctly', () => {
    const errorMessage = 'Class is required';
    
    renderWithQueryClient(
      <ClassesDropdown
        value=""
        onChange={mockOnChange}
        error={errorMessage}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toHaveAttribute('error', errorMessage);
  });

  it('has correct display name', () => {
    expect(ClassesDropdown.displayName).toBe('ClassesDropdown');
  });
});