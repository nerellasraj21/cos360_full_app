import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Sample trip data for testing purposes
 */
const SAMPLE_TRIPS: DropdownOption[] = [
  {
    id: 1,
    label: 'Trip 1 - Route A to School',
    value: 1,
    metadata: {
      trip_number: 1,
      route_id: 1,
      vehicle_id: 1,
      driver_id: 1,
      direction: 'to_school',
      status: 'active'
    }
  },
  {
    id: 2,
    label: 'Trip 2 - Route B to School',
    value: 2,
    metadata: {
      trip_number: 2,
      route_id: 2,
      vehicle_id: 2,
      driver_id: 2,
      direction: 'to_school',
      status: 'active'
    }
  },
  {
    id: 3,
    label: 'Trip 3 - Route A from School',
    value: 3,
    metadata: {
      trip_number: 3,
      route_id: 1,
      vehicle_id: 1,
      driver_id: 1,
      direction: 'from_school',
      status: 'active'
    }
  },
  {
    id: 4,
    label: 'Trip 4 - Route C to School',
    value: 4,
    metadata: {
      trip_number: 4,
      route_id: 3,
      vehicle_id: 3,
      driver_id: 3,
      direction: 'to_school',
      status: 'active'
    }
  },
  {
    id: 5,
    label: 'Trip 5 - Route B from School',
    value: 5,
    metadata: {
      trip_number: 5,
      route_id: 2,
      vehicle_id: 2,
      driver_id: 2,
      direction: 'from_school',
      status: 'active'
    }
  }
];

/**
 * Props for the Trips dropdown component
 */
export interface TripsDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the trips dropdown
   */
  placeholder?: string;
}

/**
 * Trips Dropdown Component
 *
 * A specialized dropdown component for selecting trips.
 * Uses the predefined trips endpoint configuration.
 * Note: This dropdown uses the 'trip_number' field for display labels.
 *
 * @example
 * ```tsx
 * <TripsDropdown
 *   value={selectedTrip}
 *   onChange={(value, option) => setSelectedTrip(value)}
 *   placeholder="Select Trip"
 * />
 * ```
 */
export const TripsDropdown: React.FC<TripsDropdownProps> = ({
  placeholder = 'Select Trip...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.TRIPS}
      placeholder={placeholder}
      {...props}
    />
  );
};

TripsDropdown.displayName = 'TripsDropdown';