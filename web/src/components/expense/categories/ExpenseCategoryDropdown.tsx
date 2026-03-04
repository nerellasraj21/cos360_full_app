import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenseCategoryDropdown } from '@/hooks/expense';
import type { ExpenseCategoryDropdown as ExpenseCategoryDropdownType } from '@/types/expense/index';

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

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category: ExpenseCategoryDropdownType) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Export for use in other components
export default ExpenseCategoryDropdown;