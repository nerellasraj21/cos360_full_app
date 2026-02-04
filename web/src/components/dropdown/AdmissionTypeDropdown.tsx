import React from 'react';
import { Label } from '@/components/ui/label';
import { useAdmissionTypesDropdown } from '@/api/hooks/students/admissions';
import { Loader2 } from 'lucide-react';

interface AdmissionTypeDropdownProps {
  id: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const AdmissionTypeDropdown: React.FC<AdmissionTypeDropdownProps> = ({
  id,
  label = 'Admission Type',
  value,
  onChange,
  required = false,
}) => {
  const { data: admissionTypes = [], isLoading } = useAdmissionTypesDropdown();

  if (isLoading) {
    return (
      <div>
        <Label htmlFor={id}>{label}{required && ' *'}</Label>
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading admission types...</span>
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
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-- Select Admission Type --</option>
        {admissionTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      {admissionTypes.length === 0 && !isLoading && (
        <p className="text-xs text-gray-500 mt-1">No admission types available.</p>
      )}
    </div>
  );
};
