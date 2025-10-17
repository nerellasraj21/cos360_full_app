import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Props for the Sections by Class dropdown component
 */
export interface SectionsByClassDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint' | 'dependsOn'> {
  /**
   * The selected class ID that this sections dropdown depends on
   */
  classId?: string | number;
  /**
   * Custom placeholder text for the sections dropdown
   */
  placeholder?: string;
}

/**
 * Sections by Class Dropdown Component
 * 
 * A specialized cascading dropdown component for selecting sections based on a selected class.
 * Uses the predefined sections by class endpoint configuration with cascading logic.
 * 
 * @example
 * ```tsx
 * <SectionsByClassDropdown
 *   classId={selectedClassId}
 *   value={selectedSection}
 *   onChange={(value, option) => setSelectedSection(value)}
 *   placeholder="Select Section"
 * />
 * ```
 */
export const SectionsByClassDropdown: React.FC<SectionsByClassDropdownProps> = ({
  classId,
  placeholder = 'Select Section...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.SECTIONS_BY_CLASS}
      dependsOn={classId}
      placeholder={placeholder}
      {...props}
    />
  );
};

SectionsByClassDropdown.displayName = 'SectionsByClassDropdown';