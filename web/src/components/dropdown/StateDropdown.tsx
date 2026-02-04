import React from 'react';
import { Label } from '@/components/ui/label';
import { useStatesDropdown } from '@/api/hooks/masters/locations';
import { Loader2 } from 'lucide-react';

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

  if (isLoading) {
    return (
      <div>
        <Label htmlFor={id}>{label}{required && ' *'}</Label>
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading states...</span>
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
        <option value="">-- Select State --</option>
        {states.map((state) => (
          <option key={state.id} value={state.id}>
            {state.name} {state.code && `(${state.code})`}
          </option>
        ))}
      </select>
      {states.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No states available. Please contact admin to add master data.</p>
      )}
    </div>
  );
};
