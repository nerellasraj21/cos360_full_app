import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Props for the Subjects by Category dropdown component
 */
export interface SubjectsByCategoryDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint' | 'dependsOn'> {
  /**
   * The selected category ID that this subjects dropdown depends on
   */
  categoryId?: string | number;
  /**
   * Custom placeholder text for the subjects dropdown
   */
  placeholder?: string;
}

/**
 * Subjects by Category Dropdown Component
 * 
 * A specialized cascading dropdown component for selecting subjects based on a selected category.
 * Uses the predefined subjects by category endpoint configuration with cascading logic.
 * 
 * @example
 * ```tsx
 * <SubjectsByCategoryDropdown
 *   categoryId={selectedCategoryId}
 *   value={selectedSubject}
 *   onChange={(value, option) => setSelectedSubject(value)}
 *   placeholder="Select Subject"
 * />
 * ```
 */
export const SubjectsByCategoryDropdown: React.FC<SubjectsByCategoryDropdownProps> = ({
  categoryId,
  placeholder = 'Select Subject...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.SUBJECTS_BY_CATEGORY}
      dependsOn={categoryId}
      placeholder={placeholder}
      {...props}
    />
  );
};

SubjectsByCategoryDropdown.displayName = 'SubjectsByCategoryDropdown';