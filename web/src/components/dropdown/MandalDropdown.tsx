import React from 'react';
import { Label } from '@/components/ui/label';
import { useMandalsDropdown } from '@/api/hooks/masters/locations';
import { Loader2 } from 'lucide-react';

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

  const isDisabled = !districtId;

  if (isLoading && districtId) {
    return (
      <div>
        <Label htmlFor={id}>{label}{required && ' *'}</Label>
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading mandals...</span>
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
        <option value="">-- Select Mandal --</option>
        {mandals.map((mandal) => (
          <option key={mandal.id} value={mandal.id}>
            {mandal.name}
          </option>
        ))}
      </select>
      {isDisabled && (
        <p className="text-xs text-gray-500 mt-1">Please select a district first</p>
      )}
      {!isDisabled && mandals.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No mandals available for this district.</p>
      )}
    </div>
  );
};
