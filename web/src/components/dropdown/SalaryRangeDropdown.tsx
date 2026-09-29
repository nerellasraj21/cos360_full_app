import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { useSalaryRanges } from '@/api/hooks/masters/salaryRanges';
import { InfiniteScrollDropdown } from './InfiniteScrollDropdown';
import type { DropdownOption } from '@/types/dropdown';

interface SalaryRangeDropdownProps {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const SalaryRangeDropdown: React.FC<SalaryRangeDropdownProps> = ({
  id,
  label,
  value,
  onChange,
  required = false,
}) => {
  const { data: ranges = [], isLoading } = useSalaryRanges();

  const options: DropdownOption[] = useMemo(() =>
    ranges.map(r => ({
      id: r.value,
      value: r.value,
      label: r.label,
    })), [ranges]);

  return (
    <div>
      {label && <Label>{label}{required && ' *'}</Label>}
      <InfiniteScrollDropdown
        data={options}
        value={value || ''}
        onChange={(val) => onChange(val as string)}
        placeholder="-- Select Salary Range --"
        disabled={isLoading}
        required={required}
        clearable
      />
    </div>
  );
};
