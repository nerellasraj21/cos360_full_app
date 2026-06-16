import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { useAdmissionTypesDropdown } from '@/api/hooks/students/admissions';
import { InfiniteScrollDropdown } from './InfiniteScrollDropdown';
import type { DropdownOption } from '@/types/dropdown';

interface AdmissionTypeDropdownProps {
  id: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const AdmissionTypeDropdown: React.FC<AdmissionTypeDropdownProps> = ({
  id,
  label = 'Admission Type',
  value,
  onChange,
  required = false,
}) => {
  const { data: admissionTypes = [], isLoading } = useAdmissionTypesDropdown();

  const options: DropdownOption[] = useMemo(() =>
    admissionTypes.map(t => {
      const displayLabel =
        t.label === 'Primary Admission' ? 'Pre Primary' :
        t.label === 'Non-Primary Admission' ? 'Regular' :
        t.label;
      return { id: t.value, value: t.value, label: displayLabel };
    }), [admissionTypes]);

  return (
    <div>
      <Label>{label}{required && ' *'}</Label>
      <InfiniteScrollDropdown
        data={options}
        value={value || ''}
        onChange={(val) => onChange(val as string)}
        placeholder="-- Select Admission Type --"
        disabled={isLoading}
        required={required}
        clearable={false}
      />
      {admissionTypes.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No admission types available.</p>
      )}
    </div>
  );
};
