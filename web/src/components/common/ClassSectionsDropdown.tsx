import React from 'react';
import Select from 'react-select';
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections';
import type { ClassRead } from '@/types/masters/classesandsections';

interface ClassSectionsDropdownProps {
  onChange?: (value: { classId: string; section?: string } | null) => void;
  value?: { classId: string; section?: string } | null;
  placeholder?: string;
  isClearable?: boolean;
}

export const ClassSectionsDropdown: React.FC<ClassSectionsDropdownProps> = ({
  onChange,
  value,
  placeholder = "Select Class & Section",
  isClearable = true
}) => {
  const { data: dropdownData, isLoading } = useClassSectionsDropdown();

  const options = React.useMemo(() => {
    if (!dropdownData) return [];

    return dropdownData.flatMap(item =>
      item.sections.map(section => ({
        value: { classId: item.id, section: section.name },
        label: `${item.name} - ${section.name}`,
        className: item.name,
        sectionName: section.name
      }))
    );
  }, [dropdownData]);

  const selectedOption = options.find(opt =>
    opt.value.classId === value?.classId && opt.value.section === value?.section
  ) || null;

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={(opt) => onChange?.(opt?.value || null)}
      placeholder={placeholder}
      isLoading={isLoading}
      isClearable={isClearable}
      className="min-w-[200px]"
      classNamePrefix="react-select"
      menuPlacement="auto"
      menuPosition="fixed"
      formatOptionLabel={(option, { context }) => {
        if (context === 'value') {
          return option.label;
        }
        return (
          <div className="flex flex-col">
            <span className="font-medium">{option.className}</span>
            <span className="text-sm text-muted-foreground">{option.sectionName}</span>
          </div>
        );
      }}
      styles={{
        control: (base, state) => ({
          ...base,
          borderRadius: '0.75rem',
          border: 'none',
          background: 'var(--color-muted)',
          minHeight: 28,
          fontSize: '13px',
          boxShadow: state.isFocused ? '0 0 0 2px var(--color-ring)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }),
        option: (base, state) => ({
          ...base,
          borderRadius: 8,
          background: state.isSelected
            ? 'var(--color-primary)'
            : state.isFocused
              ? 'var(--color-accent)'
              : 'var(--color-popover)',
          color: state.isSelected
            ? 'var(--color-primary-foreground)'
            : state.isFocused
              ? 'var(--color-accent-foreground)'
              : 'var(--color-popover-foreground)',
          fontWeight: state.isSelected ? 600 : 400,
          padding: '8px 14px',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }),
        menu: base => ({
          ...base,
          borderRadius: 12,
          background: 'var(--color-card)',
          color: 'var(--color-foreground)',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.12)',
          zIndex: 9999,
          overflow: 'hidden',
        }),
        menuList: base => ({
          ...base,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          maxHeight: 200,
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }),
        singleValue: base => ({
          ...base,
          color: 'var(--color-foreground)',
        }),
        placeholder: base => ({
          ...base,
          color: 'var(--color-muted-foreground)',
        }),
        menuPortal: base => ({ ...base, zIndex: 9999 }),
      }}
    />
  );
};

export default ClassSectionsDropdown;