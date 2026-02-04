import React from 'react';
import { Label } from '@/components/ui/label';
import { useCastesDropdown } from '@/api/hooks/masters/castes';
import { Loader2 } from 'lucide-react';

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

  if (isLoading) {
    return (
      <div>
        <Label htmlFor={id}>{label}{required && ' *'}</Label>
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading castes...</span>
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
      >
        <option value="">-- Select Caste --</option>
        {castes.map((caste) => (
          <option key={caste.id} value={caste.id}>
            {caste.name} {caste.code && `(${caste.code})`}
          </option>
        ))}
      </select>
      {castes.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No castes available. Please contact admin to add master data.</p>
      )}
    </div>
  );
};
