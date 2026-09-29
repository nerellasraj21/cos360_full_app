import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Sample route stops data for testing purposes
 */
const SAMPLE_ROUTE_STOPS: DropdownOption[] = [
  {
    id: 1,
    label: 'Stop 1 - Main Gate',
    value: 1,
    metadata: {
      route_id: 1,
      name: 'Main Gate',
      number: 1,
      reaching_time: '08:00:00Z',
      fees: 100,
      is_active: true
    }
  },
  {
    id: 2,
    label: 'Stop 2 - City Center',
    value: 2,
    metadata: {
      route_id: 1,
      name: 'City Center',
      number: 2,
      reaching_time: '08:15:00Z',
      fees: 120,
      is_active: true
    }
  },
  {
    id: 3,
    label: 'Stop 3 - Mall Road',
    value: 3,
    metadata: {
      route_id: 1,
      name: 'Mall Road',
      number: 3,
      reaching_time: '08:30:00Z',
      fees: 150,
      is_active: true
    }
  },
  {
    id: 4,
    label: 'Stop 4 - Park Avenue',
    value: 4,
    metadata: {
      route_id: 2,
      name: 'Park Avenue',
      number: 1,
      reaching_time: '09:00:00Z',
      fees: 90,
      is_active: true
    }
  },
  {
    id: 5,
    label: 'Stop 5 - Station Road',
    value: 5,
    metadata: {
      route_id: 2,
      name: 'Station Road',
      number: 2,
      reaching_time: '09:20:00Z',
      fees: 110,
      is_active: true
    }
  }
];

/**
 * Props for the RouteStops dropdown component
 */
export interface RouteStopsDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the route stops dropdown
   */
  placeholder?: string;
}

/**
 * RouteStops Dropdown Component
 *
 * A specialized dropdown component for selecting route stops.
 * Uses the predefined route stops endpoint configuration.
 * Note: This dropdown uses the 'name' field for display labels.
 *
 * @example
 * ```tsx
 * <RouteStopsDropdown
 *   value={selectedRouteStop}
 *   onChange={(value, option) => setSelectedRouteStop(value)}
 *   placeholder="Select Route Stop"
 * />
 * ```
 */
export const RouteStopsDropdown: React.FC<RouteStopsDropdownProps> = ({
  placeholder = 'Select Route Stop...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.ROUTE_STOPS}
      placeholder={placeholder}
      renderOption={(opt) => opt.label || opt.metadata?.route_name || ''}
      renderValue={(opt) => opt.label || opt.metadata?.route_name || ''}
      {...props}
    />
  );
};

RouteStopsDropdown.displayName = 'RouteStopsDropdown';