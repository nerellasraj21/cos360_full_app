import React from 'react';
import { Label } from '@/components/ui/label';
import { useSalaryRanges } from '@/api/hooks/masters/salaryRanges';
import { Loader2 } from 'lucide-react';

interface SalaryRangeDropdownProps {
  id: string;
  label: string;
  register: any; // React Hook Form register
  required?: boolean;
}

export const SalaryRangeDropdown: React.FC<SalaryRangeDropdownProps> = ({
  id,
  label,
  register,
  required = false,
}) => {
  const { data: ranges = [], isLoading } = useSalaryRanges();

  if (isLoading) {
    return (
      <div>
        <Label htmlFor={id}>{label}{required && ' *'}</Label>
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading salary ranges...</span>
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
        {...register}
      >
        <option value="">-- Select Salary Range --</option>
        {ranges.map((range) => (
          <option key={range.value} value={range.value}>
            {range.label}
          </option>
        ))}
      </select>
    </div>
  );
};
