import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { useDistrictsDropdown } from '@/api/hooks/masters/locations';
import { InfiniteScrollDropdown } from './InfiniteScrollDropdown';
import type { DropdownOption } from '@/types/dropdown';

interface DistrictDropdownProps {
  id: string;
  label?: string;
  stateId?: string;
  value?: string;
  onChange: (value: string | null) => void;
  required?: boolean;
}

export const DistrictDropdown: React.FC<DistrictDropdownProps> = ({
  id,
  label = 'District',
  stateId,
  value,
  onChange,
  required = false,
}) => {
  const { data: districts = [], isLoading } = useDistrictsDropdown(stateId, true);

  const options: DropdownOption[] = useMemo(() =>
    districts.map(d => ({
      id: d.id,
      value: d.id,
      label: d.code ? `${d.name} (${d.code})` : d.name,
    })), [districts]);

  const isDisabled = !stateId;

  return (
    <div>
      <Label>{label}{required && ' *'}</Label>
      <InfiniteScrollDropdown
        data={options}
        value={value || ''}
        onChange={(val) => onChange((val as string) || null)}
        placeholder="-- Select District --"
        disabled={isDisabled || isLoading}
        required={required}
        clearable
      />
      {isDisabled && (
        <p className="text-xs text-gray-500 mt-1">Please select a state first</p>
      )}
      {!isDisabled && districts.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No districts available for this state.</p>
      )}
    </div>
  );
};
