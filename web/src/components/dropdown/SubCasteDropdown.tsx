import React from 'react';
import { Label } from '@/components/ui/label';
import { useSubCastesDropdown } from '@/api/hooks/masters/castes';
import { Loader2 } from 'lucide-react';

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
  label = 'Sub-Caste',
  casteId,
  value,
  onChange,
  required = false,
}) => {
  const { data: subCastes = [], isLoading } = useSubCastesDropdown(casteId, true);

  const isDisabled = !casteId;

  if (isLoading && casteId) {
    return (
      <div>
        <Label htmlFor={id}>{label}{required && ' *'}</Label>
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading sub-castes...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={id}>{label}{required && ' *'}</Label>
      <select
        id={id}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={isDisabled}
      >
        <option value="">-- Select Sub-Caste --</option>
        {subCastes.map((subCaste) => (
          <option key={subCaste.id} value={subCaste.id}>
            {subCaste.name} {subCaste.code && `(${subCaste.code})`}
          </option>
        ))}
      </select>
      {isDisabled && (
        <p className="text-xs text-gray-500 mt-1">Please select a caste first</p>
      )}
      {!isDisabled && subCastes.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No sub-castes available for this caste.</p>
      )}
    </div>
  );
};
