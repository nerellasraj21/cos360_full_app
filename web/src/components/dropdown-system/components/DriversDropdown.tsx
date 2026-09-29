import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Sample driver data for testing purposes
 */
const SAMPLE_DRIVERS: DropdownOption[] = [
  {
    id: 1,
    label: 'John Smith - License: DL123456',
    value: 1,
    metadata: {
      license_number: 'DL123456',
      name: 'John Smith',
      phone: '+1234567890',
      experience_years: 5,
      status: 'active'
    }
  },
  {
    id: 2,
    label: 'Sarah Johnson - License: DL789012',
    value: 2,
    metadata: {
      license_number: 'DL789012',
      name: 'Sarah Johnson',
      phone: '+1234567891',
      experience_years: 8,
      status: 'active'
    }
  },
  {
    id: 3,
    label: 'Mike Davis - License: DL345678',
    value: 3,
    metadata: {
      license_number: 'DL345678',
      name: 'Mike Davis',
      phone: '+1234567892',
      experience_years: 3,
      status: 'active'
    }
  },
  {
    id: 4,
    label: 'Emma Wilson - License: DL901234',
    value: 4,
    metadata: {
      license_number: 'DL901234',
      name: 'Emma Wilson',
      phone: '+1234567893',
      experience_years: 6,
      status: 'active'
    }
  },
  {
    id: 5,
    label: 'David Brown - License: DL567890',
    value: 5,
    metadata: {
      license_number: 'DL567890',
      name: 'David Brown',
      phone: '+1234567894',
      experience_years: 10,
      status: 'active'
    }
  }
];

/**
 * Props for the Drivers dropdown component
 */
export interface DriversDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the drivers dropdown
   */
  placeholder?: string;
}

/**
 * Drivers Dropdown Component
 *
 * A specialized dropdown component for selecting drivers.
 * Uses the predefined drivers endpoint configuration.
 * Note: This dropdown uses the 'name' field for display labels.
 *
 * @example
 * ```tsx
 * <DriversDropdown
 *   value={selectedDriver}
 *   onChange={(value, option) => setSelectedDriver(value)}
 *   placeholder="Select Driver"
 * />
 * ```
 */
export const DriversDropdown: React.FC<DriversDropdownProps> = ({
  placeholder = 'Select Driver...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.DRIVERS}
      placeholder={placeholder}
      {...props}
    />
  );
};

DriversDropdown.displayName = 'DriversDropdown';