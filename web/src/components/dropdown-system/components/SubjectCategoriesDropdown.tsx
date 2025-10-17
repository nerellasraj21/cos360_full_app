import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps } from '../../../types/dropdown';

/**
 * Props for the Subject Categories dropdown component
 */
export interface SubjectCategoriesDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the subject categories dropdown
   */
  placeholder?: string;
}

/**
 * Subject Categories Dropdown Component
 * 
 * A specialized dropdown component for selecting subject categories.
 * Uses the predefined subject categories endpoint configuration.
 * 
 * @example
 * ```tsx
 * <SubjectCategoriesDropdown
 *   value={selectedCategory}
 *   onChange={(value, option) => setSelectedCategory(value)}
 *   placeholder="Select Subject Category"
 * />
 * ```
 */
export const SubjectCategoriesDropdown: React.FC<SubjectCategoriesDropdownProps> = ({
  placeholder = 'Select Subject Category...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.SUBJECT_CATEGORIES}
      placeholder={placeholder}
      {...props}
    />
  );
};

SubjectCategoriesDropdown.displayName = 'SubjectCategoriesDropdown';