import React, { useMemo } from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
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
 * A cascading dropdown for selecting sections based on a selected class.
 * Uses /masters/class_sections/by_class_id/{classId}/sections (path param).
 */
export const SectionsByClassDropdown: React.FC<SectionsByClassDropdownProps> = ({
  classId,
  placeholder = 'Select Section...',
  ...props
}) => {
  const { data: sections, isLoading } = useSectionsByClassId(classId ? String(classId) : '');

  const options = useMemo<DropdownOption[]>(() => {
    if (!sections) return [];
    return sections.map((s) => ({
      id: s.id,
      label: s.name,
      value: s.id,
    }));
  }, [sections]);

  return (
    <InfiniteScrollDropdown
      data={options}
      placeholder={isLoading ? 'Loading…' : placeholder}
      disabled={!classId || props.disabled}
      {...props}
    />
  );
};

SectionsByClassDropdown.displayName = 'SectionsByClassDropdown';
