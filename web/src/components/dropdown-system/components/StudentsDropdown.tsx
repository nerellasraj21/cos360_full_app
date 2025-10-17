import React from 'react';
import { InfiniteScrollDropdown } from '../../dropdown/InfiniteScrollDropdown';
import { DROPDOWN_ENDPOINTS } from '../../../constants/dropdown/endpoints';
import type { InfiniteScrollDropdownProps, DropdownOption } from '../../../types/dropdown';

/**
 * Sample student data for testing purposes
 */
const SAMPLE_STUDENTS: DropdownOption[] = [
  {
    id: 1,
    label: 'John Doe - ADM001',
    value: 1,
    metadata: {
      admission_number: 'ADM001',
      name: 'John Doe',
      class: '10A',
      section: 'A',
      roll_number: '001',
      status: 'active'
    }
  },
  {
    id: 2,
    label: 'Jane Smith - ADM002',
    value: 2,
    metadata: {
      admission_number: 'ADM002',
      name: 'Jane Smith',
      class: '9B',
      section: 'B',
      roll_number: '002',
      status: 'active'
    }
  },
  {
    id: 3,
    label: 'Bob Johnson - ADM003',
    value: 3,
    metadata: {
      admission_number: 'ADM003',
      name: 'Bob Johnson',
      class: '8C',
      section: 'C',
      roll_number: '003',
      status: 'active'
    }
  },
  {
    id: 4,
    label: 'Alice Brown - ADM004',
    value: 4,
    metadata: {
      admission_number: 'ADM004',
      name: 'Alice Brown',
      class: '11A',
      section: 'A',
      roll_number: '004',
      status: 'active'
    }
  },
  {
    id: 5,
    label: 'Charlie Wilson - ADM005',
    value: 5,
    metadata: {
      admission_number: 'ADM005',
      name: 'Charlie Wilson',
      class: '7B',
      section: 'B',
      roll_number: '005',
      status: 'active'
    }
  }
];

/**
 * Props for the Students dropdown component
 */
export interface StudentsDropdownProps extends Omit<InfiniteScrollDropdownProps, 'endpoint'> {
  /**
   * Custom placeholder text for the students dropdown
   */
  placeholder?: string;
}

/**
 * Students Dropdown Component
 *
 * A specialized dropdown component for selecting students.
 * Uses the predefined students endpoint configuration.
 * Note: This dropdown uses the 'name' field for display labels.
 *
 * @example
 * ```tsx
 * <StudentsDropdown
 *   value={selectedStudent}
 *   onChange={(value, option) => setSelectedStudent(value)}
 *   placeholder="Select Student"
 * />
 * ```
 */
export const StudentsDropdown: React.FC<StudentsDropdownProps> = ({
  placeholder = 'Select Student...',
  ...props
}) => {
  return (
    <InfiniteScrollDropdown
      endpoint={DROPDOWN_ENDPOINTS.STUDENTS}
      placeholder={placeholder}
      renderOption={(opt) => {
        const s = opt.metadata?.student;
        const name = s ? `${s.first_name} ${s.last_name}`.trim() : (opt.label || '');
        const adm = opt.metadata?.admission_number || opt.label;
        return `${name} (${adm})`;
      }}
      renderValue={(opt) => {
        const s = opt.metadata?.student;
        const name = s ? `${s.first_name} ${s.last_name}`.trim() : (opt.label || '');
        const adm = opt.metadata?.admission_number || opt.label;
        return `${name} (${adm})`;
      }}
      {...props}
    />
  );
};

StudentsDropdown.displayName = 'StudentsDropdown';