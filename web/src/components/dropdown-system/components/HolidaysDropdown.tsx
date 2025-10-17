import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Props for the Holidays dropdown component
 */
export interface HolidaysDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the holidays dropdown
   */
  placeholder?: string;
}

/**
 * Holidays Dropdown Component
 * 
 * A specialized dropdown component for selecting holidays.
 * Uses the predefined holidays endpoint configuration.
 * 
 * @example
 * ```tsx
 * <HolidaysDropdown
 *   value={selectedHoliday}
 *   onChange={(value, option) => setSelectedHoliday(value)}
 *   placeholder="Select Holiday"
 * />
 * ```
 */
export const HolidaysDropdown: React.FC<HolidaysDropdownProps> = ({
  placeholder = 'Select Holiday...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.HOLIDAYS}
      placeholder={placeholder}
      {...props}
    />
  );
};

HolidaysDropdown.displayName = 'HolidaysDropdown';