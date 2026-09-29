import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Props for the Subjects dropdown component
 */
export interface SubjectsDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the subjects dropdown
   */
  placeholder?: string;
}

/**
 * Subjects Dropdown Component
 * 
 * A specialized dropdown component for selecting subjects.
 * Uses the predefined subjects endpoint configuration.
 * 
 * @example
 * ```tsx
 * <SubjectsDropdown
 *   value={selectedSubject}
 *   onChange={(value, option) => setSelectedSubject(value)}
 *   placeholder="Select Subject"
 * />
 * ```
 */
export const SubjectsDropdown: React.FC<SubjectsDropdownProps> = ({
  placeholder = 'Select Subject...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.SUBJECTS}
      placeholder={placeholder}
      {...props}
    />
  );
};

SubjectsDropdown.displayName = 'SubjectsDropdown';