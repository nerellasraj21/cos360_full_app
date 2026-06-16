import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { useCastesDropdown } from '@/api/hooks/masters/castes';
import { InfiniteScrollDropdown } from './InfiniteScrollDropdown';
import type { DropdownOption } from '@/types/dropdown';

interface CasteDropdownProps {
  id: string;
  label?: string;
  value?: string;
  onChange: (value: string | null) => void;
  required?: boolean;
}

export const CasteDropdown: React.FC<CasteDropdownProps> = ({
  id,
  label = 'Caste',
  value,
  onChange,
  required = false,
}) => {
  const { data: castes = [], isLoading } = useCastesDropdown(true);

  const options: DropdownOption[] = useMemo(() =>
    castes.map(c => ({
      id: c.id,
      value: c.id,
      label: c.code ? `${c.name} (${c.code})` : c.name,
    })), [castes]);

  return (
    <div>
      <Label>{label}{required && ' *'}</Label>
      <InfiniteScrollDropdown
        data={options}
        value={value || ''}
        onChange={(val) => onChange((val as string) || null)}
        placeholder="-- Select Caste --"
        disabled={isLoading}
        required={required}
        clearable
      />
      {castes.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No castes available. Please contact admin to add master data.</p>
      )}
    </div>
  );
};
