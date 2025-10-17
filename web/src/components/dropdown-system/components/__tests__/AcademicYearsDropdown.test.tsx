import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AcademicYearsDropdown } from '../AcademicYearsDropdown';
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
            label: `Academic Year ${e.target.value}`,
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

describe('AcademicYearsDropdown', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    renderWithQueryClient(
      <AcademicYearsDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('placeholder')).toHaveTextContent('Select Academic Year...');
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Choose Academic Year';
    
    renderWithQueryClient(
      <AcademicYearsDropdown
        value=""
        onChange={mockOnChange}
        placeholder={customPlaceholder}
      />
    );

    expect(screen.getByTestId('placeholder')).toHaveTextContent(customPlaceholder);
  });

  it('uses the correct endpoint configuration', () => {
    renderWithQueryClient(
      <AcademicYearsDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.ACADEMIC_YEARS.key);
  });

  it('handles value changes correctly', async () => {
    renderWithQueryClient(
      <AcademicYearsDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    fireEvent.change(input, { target: { value: '2024' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('2024', {
        id: '2024',
        label: 'Academic Year 2024',
        value: '2024',
      });
    });
  });

  it('displays selected value correctly', () => {
    renderWithQueryClient(
      <AcademicYearsDropdown
        value="2023"
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toHaveValue('2023');
  });

  it('passes through additional props', () => {
    renderWithQueryClient(
      <AcademicYearsDropdown
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
    const errorMessage = 'Academic year is required';
    
    renderWithQueryClient(
      <AcademicYearsDropdown
        value=""
        onChange={mockOnChange}
        error={errorMessage}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toHaveAttribute('error', errorMessage);
  });

  it('has correct display name', () => {
    expect(AcademicYearsDropdown.displayName).toBe('AcademicYearsDropdown');
  });
});