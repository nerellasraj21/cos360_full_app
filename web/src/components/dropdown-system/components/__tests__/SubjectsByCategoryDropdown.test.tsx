import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubjectsByCategoryDropdown } from '../SubjectsByCategoryDropdown';
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
            label: `${e.target.value} Subject`,
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

describe('SubjectsByCategoryDropdown', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        categoryId="science"
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('placeholder')).toHaveTextContent('Select Subject...');
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Choose Subject';
    
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        categoryId="science"
        value=""
        onChange={mockOnChange}
        placeholder={customPlaceholder}
      />
    );

    expect(screen.getByTestId('placeholder')).toHaveTextContent(customPlaceholder);
  });

  it('uses the correct endpoint configuration', () => {
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        categoryId="science"
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.SUBJECTS_BY_CATEGORY.key);
  });

  it('passes categoryId as dependsOn prop', () => {
    const categoryId = 'science';
    
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        categoryId={categoryId}
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('depends-on')).toHaveTextContent(categoryId);
  });

  it('handles cascading behavior when no categoryId is provided', () => {
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toBeDisabled();
    expect(screen.getByTestId('depends-on')).toHaveTextContent('none');
  });

  it('enables dropdown when categoryId is provided', () => {
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        categoryId="science"
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).not.toBeDisabled();
  });

  it('handles value changes correctly', async () => {
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        categoryId="science"
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    fireEvent.change(input, { target: { value: 'Physics' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('Physics', {
        id: 'Physics',
        label: 'Physics Subject',
        value: 'Physics',
      });
    });
  });

  it('displays selected value correctly', () => {
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        categoryId="science"
        value="Chemistry"
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toHaveValue('Chemistry');
  });

  it('passes through additional props', () => {
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        categoryId="science"
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
    const errorMessage = 'Subject is required';
    
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        categoryId="science"
        value=""
        onChange={mockOnChange}
        error={errorMessage}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toHaveAttribute('error', errorMessage);
  });

  it('has correct display name', () => {
    expect(SubjectsByCategoryDropdown.displayName).toBe('SubjectsByCategoryDropdown');
  });

  it('handles numeric categoryId correctly', () => {
    const numericCategoryId = 1;
    
    renderWithQueryClient(
      <SubjectsByCategoryDropdown
        categoryId={numericCategoryId}
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('depends-on')).toHaveTextContent('1');
  });
});