import React, { useMemo } from 'react';
import { InfiniteScrollDropdown } from '@/components/dropdown/InfiniteScrollDropdown';
import { useExpenseCategoryDropdown } from '@/hooks/expense';
import type { DropdownOption } from '@/types/dropdown';

interface ExpenseCategoryDropdownProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ExpenseCategoryDropdown({
  value,
  onValueChange,
  placeholder = "Select category",
  disabled = false,
  className
}: ExpenseCategoryDropdownProps) {
  const { data: categories = [], isLoading } = useExpenseCategoryDropdown();

  const options: DropdownOption[] = useMemo(() =>
    categories.map(c => ({
      id: c.id,
      value: c.id,
      label: c.name,
    })), [categories]);

  return (
    <InfiniteScrollDropdown
      data={options}
      value={value || ''}
      onChange={(val) => onValueChange?.(val as string)}
      placeholder={placeholder}
      disabled={disabled || isLoading}
      clearable={false}
      className={className}
    />
  );
}

export default ExpenseCategoryDropdown;
