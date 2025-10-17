import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Sample vehicle data for testing purposes
 */
const SAMPLE_VEHICLES: DropdownOption[] = [
  {
    id: 1,
    label: 'Toyota Camry - ABC123',
    value: 1,
    metadata: {
      registration_number: 'ABC123',
      model: 'Camry',
      make: 'Toyota',
      capacity: 5,
      status: 'active'
    }
  },
  {
    id: 2,
    label: 'Honda Civic - XYZ456',
    value: 2,
    metadata: {
      registration_number: 'XYZ456',
      model: 'Civic',
      make: 'Honda',
      capacity: 5,
      status: 'active'
    }
  },
  {
    id: 3,
    label: 'Ford Transit - BUS789',
    value: 3,
    metadata: {
      registration_number: 'BUS789',
      model: 'Transit',
      make: 'Ford',
      capacity: 20,
      status: 'active'
    }
  },
  {
    id: 4,
    label: 'Mercedes Sprinter - VAN012',
    value: 4,
    metadata: {
      registration_number: 'VAN012',
      model: 'Sprinter',
      make: 'Mercedes',
      capacity: 15,
      status: 'active'
    }
  },
  {
    id: 5,
    label: 'Volvo XC90 - SUV345',
    value: 5,
    metadata: {
      registration_number: 'SUV345',
      model: 'XC90',
      make: 'Volvo',
      capacity: 7,
      status: 'active'
    }
  }
];

/**
 * Props for the Vehicles dropdown component
 */
export interface VehiclesDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the vehicles dropdown
   */
  placeholder?: string;
  /**
   * Sample data for testing purposes (optional)
   */
  sampleData?: InfiniteScrollDropdownProps['data'];
}

/**
 * Vehicles Dropdown Component
 *
 * A specialized dropdown component for selecting vehicles.
 * Uses the predefined vehicles endpoint configuration.
 * Note: This dropdown uses the 'name' field for display labels.
 *
 * @example
 * ```tsx
 * <VehiclesDropdown
 *   value={selectedVehicle}
 *   onChange={(value, option) => setSelectedVehicle(value)}
 *   placeholder="Select Vehicle"
 * />
 * ```
 */
export const VehiclesDropdown: React.FC<VehiclesDropdownProps> = ({
  placeholder = 'Select Vehicle...',
  sampleData,
  ...props
}) => {
  // Use sample data for testing, but keep API endpoint intact
  const dataToUse = sampleData;

  return (
    <InfiniteScrollDropdown
      endpoint={dataToUse ? undefined : DROPDOWN_ENDPOINTS.VEHICLES}
      data={dataToUse}
      placeholder={placeholder}
      {...props}
    />
  );
};

VehiclesDropdown.displayName = 'VehiclesDropdown';