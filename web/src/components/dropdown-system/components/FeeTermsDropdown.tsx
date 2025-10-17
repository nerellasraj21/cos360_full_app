import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';
import { useAcademicYearStore } from '@/lib/academicYearStore';

/**
 * Sample fee terms data for testing purposes
 */
const SAMPLE_FEE_TERMS: DropdownOption[] = [
  {
    id: 1,
    label: 'Monthly - April 2025',
    value: 1,
    metadata: {
      name: 'Monthly - April 2025',
      term_type: 'monthly',
      start_date: '2025-04-01',
      end_date: '2025-04-30',
      amount: 500,
      is_active: true
    }
  },
  {
    id: 2,
    label: 'Quarterly - Q1 2025',
    value: 2,
    metadata: {
      name: 'Quarterly - Q1 2025',
      term_type: 'quarterly',
      start_date: '2025-04-01',
      end_date: '2025-06-30',
      amount: 1500,
      is_active: true
    }
  },
  {
    id: 3,
    label: 'Half Yearly - First Half 2025',
    value: 3,
    metadata: {
      name: 'Half Yearly - First Half 2025',
      term_type: 'half_yearly',
      start_date: '2025-04-01',
      end_date: '2025-09-30',
      amount: 3000,
      is_active: true
    }
  },
  {
    id: 4,
    label: 'Yearly - Academic Year 2024-25',
    value: 4,
    metadata: {
      name: 'Yearly - Academic Year 2024-25',
      term_type: 'yearly',
      start_date: '2024-04-01',
      end_date: '2025-03-31',
      amount: 6000,
      is_active: true
    }
  },
  {
    id: 5,
    label: 'Monthly - May 2025',
    value: 5,
    metadata: {
      name: 'Monthly - May 2025',
      term_type: 'monthly',
      start_date: '2025-05-01',
      end_date: '2025-05-31',
      amount: 500,
      is_active: true
    }
  }
];

/**
 * Props for the FeeTerms dropdown component
 */
export interface FeeTermsDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the fee terms dropdown
   */
  placeholder?: string;
}

/**
 * FeeTerms Dropdown Component
 *
 * A specialized dropdown component for selecting fee terms.
 * Uses the predefined fee terms endpoint configuration.
 * Note: This dropdown uses the 'name' field for display labels.
 *
 * @example
 * ```tsx
 * <FeeTermsDropdown
 *   value={selectedFeeTerm}
 *   onChange={(value, option) => setSelectedFeeTerm(value)}
 *   placeholder="Select Fee Term"
 * />
 * ```
 */
export const FeeTermsDropdown: React.FC<FeeTermsDropdownProps> = ({
  placeholder = 'Select Fee Term...',
  ...props
}) => {
  const academicYearId = useAcademicYearStore((s) => s.selectedAcademicYearId);

  const feeTermsEndpoint = {
    ...DROPDOWN_ENDPOINTS.FEE_TERMS,
    // ensure query param academic_year_id is included dynamically
    queryParams: {
      ...(DROPDOWN_ENDPOINTS.FEE_TERMS.queryParams || {}),
      academic_year_id: academicYearId || undefined,
    },
  } as typeof DROPDOWN_ENDPOINTS.FEE_TERMS;

  return (
    <InfiniteScrollDropdown
      endpoint={feeTermsEndpoint}
      placeholder={placeholder}
      {...props}
    />
  );
};

FeeTermsDropdown.displayName = 'FeeTermsDropdown';