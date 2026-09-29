import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { useSubCastesDropdown } from '@/api/hooks/masters/castes';
import { InfiniteScrollDropdown } from './InfiniteScrollDropdown';
import type { DropdownOption } from '@/types/dropdown';

interface SubCasteDropdownProps {
  id: string;
  label?: string;
  casteId?: string;
  value?: string;
  onChange: (value: string | null) => void;
  required?: boolean;
}

export const SubCasteDropdown: React.FC<SubCasteDropdownProps> = ({
  id,
  label = 'Sub Caste',
  casteId,
  value,
  onChange,
  required = false,
}) => {
  const { data: subCastes = [], isLoading } = useSubCastesDropdown(casteId, true);

  const options: DropdownOption[] = useMemo(() =>
    subCastes.map(sc => ({
      id: sc.id,
      value: sc.id,
      label: sc.code ? `${sc.name} (${sc.code})` : sc.name,
    })), [subCastes]);

  const isDisabled = !casteId;

  return (
    <div>
      <Label>{label}{required && ' *'}</Label>
      <InfiniteScrollDropdown
        data={options}
        value={value || ''}
        onChange={(val) => onChange((val as string) || null)}
        placeholder="Select"
        disabled={isDisabled || isLoading}
        required={required}
        clearable
      />
      {isDisabled && (
        <p className="text-xs text-gray-500 mt-1">Please select a caste first</p>
      )}
      {!isDisabled && subCastes.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No sub castes available for this caste.</p>
      )}
    </div>
  );
};
