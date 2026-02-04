import React from 'react';
import { Label } from '@/components/ui/label';
import { useDistrictsDropdown } from '@/api/hooks/masters/locations';
import { Loader2 } from 'lucide-react';

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

  const isDisabled = !stateId;

  if (isLoading && stateId) {
    return (
      <div>
        <Label htmlFor={id}>{label}{required && ' *'}</Label>
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading districts...</span>
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
        <option value="">-- Select District --</option>
        {districts.map((district) => (
          <option key={district.id} value={district.id}>
            {district.name} {district.code && `(${district.code})`}
          </option>
        ))}
      </select>
      {isDisabled && (
        <p className="text-xs text-gray-500 mt-1">Please select a state first</p>
      )}
      {!isDisabled && districts.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No districts available for this state.</p>
      )}
    </div>
  );
};
