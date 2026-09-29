import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Props for the Transport Routes dropdown component
 */
export interface TransportRoutesDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the transport routes dropdown
   */
  placeholder?: string;
  /**
   * Sample data for testing purposes (optional)
   */
  sampleData?: InfiniteScrollDropdownProps['data'];
}

/**
 * Transport Routes Dropdown Component
 * 
 * A specialized dropdown component for selecting transport routes.
 * Uses the predefined transport routes endpoint configuration.
 * Note: This dropdown uses the 'route_name' field for display labels.
 * 
 * @example
 * ```tsx
 * <TransportRoutesDropdown
 *   value={selectedRoute}
 *   onChange={(value, option) => setSelectedRoute(value)}
 *   placeholder="Select Transport Route"
 * />
 * ```
 */
export const TransportRoutesDropdown: React.FC<TransportRoutesDropdownProps> = ({
  placeholder = 'Select Transport Route...',
  sampleData,
  ...props
}) => {
  // Use sample data for testing, but keep API endpoint intact
  const dataToUse = sampleData;

  return (
    <InfiniteScrollDropdown
      endpoint={dataToUse ? undefined : DROPDOWN_ENDPOINTS.TRANSPORT_ROUTES}
      data={dataToUse}
      placeholder={placeholder}
      {...props}
    />
  );
};

TransportRoutesDropdown.displayName = 'TransportRoutesDropdown';