import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Props for the Classes dropdown component
 */
export interface ClassesDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the classes dropdown
   */
  placeholder?: string;
}

/**
 * Classes Dropdown Component
 * 
 * A specialized dropdown component for selecting classes.
 * Uses the predefined classes endpoint configuration.
 * 
 * @example
 * ```tsx
 * <ClassesDropdown
 *   value={selectedClass}
 *   onChange={(value, option) => setSelectedClass(value)}
 *   placeholder="Select Class"
 * />
 * ```
 */
export const ClassesDropdown: React.FC<ClassesDropdownProps> = ({
  placeholder = 'Select Class...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.CLASSES}
      placeholder={placeholder}
      {...props}
    />
  );
};

ClassesDropdown.displayName = 'ClassesDropdown';