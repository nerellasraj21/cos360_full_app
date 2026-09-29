import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Props for the Academic Years dropdown component
 */
export interface AcademicYearsDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the academic years dropdown
   */
  placeholder?: string;
}

/**
 * Academic Years Dropdown Component
 * 
 * A specialized dropdown component for selecting academic years.
 * Uses the predefined academic years endpoint configuration.
 * 
 * @example
 * ```tsx
 * <AcademicYearsDropdown
 *   value={selectedYear}
 *   onChange={(value, option) => setSelectedYear(value)}
 *   placeholder="Select Academic Year"
 * />
 * ```
 */
export const AcademicYearsDropdown: React.FC<AcademicYearsDropdownProps> = ({
  placeholder = 'Select Academic Year...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.ACADEMIC_YEARS}
      placeholder={placeholder}
      {...props}
    />
  );
};

AcademicYearsDropdown.displayName = 'AcademicYearsDropdown';