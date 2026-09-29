import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TransportRoutesDropdown } from '../TransportRoutesDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../../constants/dropdown/endpoints';
import type { DropdownOption } from '../../../../types/dropdown';

// Mock the InfiniteScrollDropdown component
jest.mock('../../../dropdown/InfiniteScrollDropdown', () => ({
  InfiniteScrollDropdown: jest.fn(({ endpoint, placeholder, onChange, value, ...props }) => (
    <div data-testid="infinite-scroll-dropdown">
      <div data-testid="endpoint-key">{endpoint.key}</div>
      <div data-testid="placeholder">{placeholder}</div>
      <div data-testid="label-field">{endpoint.labelField}</div>
      <input
        data-testid="dropdown-input"
        value={value || ''}
        onChange={(e) => {
          const mockOption: DropdownOption = {
            id: e.target.value,
            label: `Route ${e.target.value}`,
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

describe('TransportRoutesDropdown', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    renderWithQueryClient(
      <TransportRoutesDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('placeholder')).toHaveTextContent('Select Transport Route...');
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Choose Transport Route';
    
    renderWithQueryClient(
      <TransportRoutesDropdown
        value=""
        onChange={mockOnChange}
        placeholder={customPlaceholder}
      />
    );

    expect(screen.getByTestId('placeholder')).toHaveTextContent(customPlaceholder);
  });

  it('uses the correct endpoint configuration', () => {
    renderWithQueryClient(
      <TransportRoutesDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('endpoint-key')).toHaveTextContent(DROPDOWN_ENDPOINTS.TRANSPORT_ROUTES.key);
  });

  it('uses the correct label field (route_name)', () => {
    renderWithQueryClient(
      <TransportRoutesDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('label-field')).toHaveTextContent('route_name');
  });

  it('handles value changes correctly', async () => {
    renderWithQueryClient(
      <TransportRoutesDropdown
        value=""
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    fireEvent.change(input, { target: { value: 'Route-A' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('Route-A', {
        id: 'Route-A',
        label: 'Route Route-A',
        value: 'Route-A',
      });
    });
  });

  it('displays selected value correctly', () => {
    renderWithQueryClient(
      <TransportRoutesDropdown
        value="Route-B"
        onChange={mockOnChange}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toHaveValue('Route-B');
  });

  it('passes through additional props', () => {
    renderWithQueryClient(
      <TransportRoutesDropdown
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
    const errorMessage = 'Transport route is required';
    
    renderWithQueryClient(
      <TransportRoutesDropdown
        value=""
        onChange={mockOnChange}
        error={errorMessage}
      />
    );

    const input = screen.getByTestId('dropdown-input');
    expect(input).toHaveAttribute('error', errorMessage);
  });

  it('has correct display name', () => {
    expect(TransportRoutesDropdown.displayName).toBe('TransportRoutesDropdown');
  });
});