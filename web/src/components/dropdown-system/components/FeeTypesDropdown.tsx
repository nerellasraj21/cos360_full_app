import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Props for the Fee Types dropdown component
 */
export interface FeeTypesDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the fee types dropdown
   */
  placeholder?: string;
  /**
   * Filter by fee category ID
   */
  feeCategoryId?: string;
}

/**
 * Fee Types Dropdown Component
 *
 * A specialized dropdown component for selecting fee types.
 * Uses the predefined fee types endpoint configuration.
 *
 * @example
 * ```tsx
 * <FeeTypesDropdown
 *   value={selectedFeeType}
 *   onChange={(value, option) => setSelectedFeeType(value)}
 *   placeholder="Select Fee Type"
 * />
 * ```
 */
export const FeeTypesDropdown: React.FC<FeeTypesDropdownProps> = ({
  placeholder = 'Select Fee Type...',
  feeCategoryId,
  ...props
}) => {
  // Create custom endpoint config for fee types with category filter
  const feeTypesEndpoint = {
    ...DROPDOWN_ENDPOINTS.FEE_TERMS, // Use fee terms as base since fee types endpoint doesn't exist in constants
    key: 'fee_types',
    url: '/fee/types/dropdown',
    labelField: 'name',
    valueField: 'id',
    queryParams: feeCategoryId ? { fee_category_id: feeCategoryId } : undefined,
  };

  return (
    <InfiniteScrollDropdown
      endpoint={feeTypesEndpoint}
      placeholder={placeholder}
      {...props}
    />
  );
};

FeeTypesDropdown.displayName = 'FeeTypesDropdown';