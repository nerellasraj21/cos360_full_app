import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { useMandalsDropdown } from '@/api/hooks/masters/locations';
import { InfiniteScrollDropdown } from './InfiniteScrollDropdown';
import type { DropdownOption } from '@/types/dropdown';

interface MandalDropdownProps {
  id: string;
  label?: string;
  districtId?: string;
  value?: string;
  onChange: (value: string | null) => void;
  required?: boolean;
}

export const MandalDropdown: React.FC<MandalDropdownProps> = ({
  id,
  label = 'Mandal',
  districtId,
  value,
  onChange,
  required = false,
}) => {
  const { data: mandals = [], isLoading } = useMandalsDropdown(districtId, true);

  const options: DropdownOption[] = useMemo(() =>
    mandals.map(m => ({
      id: m.id,
      value: m.id,
      label: m.name,
    })), [mandals]);

  const isDisabled = !districtId;

  return (
    <div>
      <Label>{label}{required && ' *'}</Label>
      <InfiniteScrollDropdown
        data={options}
        value={value || ''}
        onChange={(val) => onChange((val as string) || null)}
        placeholder="-- Select Mandal --"
        disabled={isDisabled || isLoading}
        required={required}
        clearable
      />
      {isDisabled && (
        <p className="text-xs text-gray-500 mt-1">Please select a district first</p>
      )}
      {!isDisabled && mandals.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No mandals available for this district.</p>
      )}
    </div>
  );
};
