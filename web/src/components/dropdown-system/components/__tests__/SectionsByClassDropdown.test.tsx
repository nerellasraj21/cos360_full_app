import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SectionsByClassDropdown } from '../SectionsByClassDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../../constants/dropdown/endpoints';
import type { DropdownOption } from '../../../../types/dropdown';

// Mock the InfiniteScrollDropdown component
jest.mock('../../../dropdown/InfiniteScrollDropdown', () => ({
  InfiniteScrollDropdown: jest.fn(({ endpoint, placeholder, onChange, value, dependsOn, ...props }) => (
    <div data-testid="infinite-scroll-dropdown">
      <div data-testid="endpoint-key">{endpoint.key}</div>
      <div data-testid="placeholder">{placeholder}</div>
      <div data-testid="depends-on">{dependsOn || 'none'}</div>
      <input
        data-testid="dropdown-input"
        value={value || ''}
        onChange={(e) => {
          const mockOption: DropdownOption = {
            id: e.target.value,
            label: `Section ${e.target.value}`,
            value: e.target.value,
          };
          onChange(e.target.value, mockOption);
        }}
        placeholder={placeholder}
        disabled={!dependsOn}
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

describe('SectionsByClassDropdown', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    renderWithQueryClient(
      <SectionsByClassDropdown
        classId="10"
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('placeholder')).toHaveTextContent('Select Section...');
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Choose Section';
    
    renderWithQueryClient(
      <SectionsByClassDropdown
        classId="10"
        value=""
        onChange={mockOnChange}
        placeholder={customPlaceholder}
      />
    );

    expect(screen.getByTestId('placeholder')).toHaveTextContent(customPlaceholder);
  });

  it('uses the correct endpoint configuration', () => {
    renderWithQueryClient(
      <SectionsByClassDropdown
        classId="10"
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.SECTIONS_BY_CLASS.key);
  });

  it('passes classId as dependsOn prop', () => {
    const classId = '10';
    
    renderWithQueryClient(
      <SectionsByClassDropdown
        classId={classId}
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('depends-on')).toHaveTextContent(classId);
  });

  it('handles cascading behavior when no classId is provided', () => {
    renderWithQueryClient(
      <SectionsByClassDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toBeDisabled();
    expect(screen.getByTestId('depends-on')).toHaveTextContent('none');
  });

  it('enables dropdown when classId is provided', () => {
    renderWithQueryClient(
      <SectionsByClassDropdown
        classId="10"
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).not.toBeDisabled();
  });

  it('handles value changes correctly', async () => {
    renderWithQueryClient(
      <SectionsByClassDropdown
        classId="10"
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    fireEvent.change(input, { target: { value: 'A' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('A', {
        id: 'A',
        label: 'Section A',
        value: 'A',
      });
    });
  });

  it('displays selected value correctly', () => {
    renderWithQueryClient(
      <SectionsByClassDropdown
        classId="10"
        value="B"
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toHaveValue('B');
  });

  it('passes through additional props', () => {
    renderWithQueryClient(
      <SectionsByClassDropdown
        classId="10"
        value=""
        onChange={mockOnChange}
        required={true}
        className="custom-class"
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toBeRequired();
    expect(input).toHaveClass('custom-class');
  });

  it('handles error prop correctly', () => {
    const errorMessage = 'Section is required';
    
    renderWithQueryClient(
      <SectionsByClassDropdown
        classId="10"
        value=""
        onChange={mockOnChange}
        error={errorMessage}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toHaveAttribute('error', errorMessage);
  });

  it('has correct display name', () => {
    expect(SectionsByClassDropdown.displayName).toBe('SectionsByClassDropdown');
  });

  it('handles numeric classId correctly', () => {
    const numericClassId = 10;
    
    renderWithQueryClient(
      <SectionsByClassDropdown
        classId={numericClassId}
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('depends-on')).toHaveTextContent('10');
  });
});