import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { useStatesDropdown } from '@/api/hooks/masters/locations';
import { InfiniteScrollDropdown } from './InfiniteScrollDropdown';
import type { DropdownOption } from '@/types/dropdown';

interface StateDropdownProps {
  id: string;
  label?: string;
  value?: string;
  onChange: (value: string | null) => void;
  required?: boolean;
}

export const StateDropdown: React.FC<StateDropdownProps> = ({
  id,
  label = 'State',
  value,
  onChange,
  required = false,
}) => {
  const { data: states = [], isLoading } = useStatesDropdown(true);

  const options: DropdownOption[] = useMemo(() =>
    states.map(s => ({
      id: s.id,
      value: s.id,
      label: s.code ? `${s.name} (${s.code})` : s.name,
    })), [states]);

  return (
    <div>
      <Label>{label}{required && ' *'}</Label>
      <InfiniteScrollDropdown
        data={options}
        value={value || ''}
        onChange={(val) => onChange((val as string) || null)}
        placeholder="-- Select State --"
        disabled={isLoading}
        required={required}
        clearable
      />
      {states.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No states available. Please contact admin to add master data.</p>
      )}
    </div>
  );
};
