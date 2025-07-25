import React from 'react';
import Select from 'react-select';
import { usePaginatedAcademicYears } from '@/api/hooks/masters/academicyears';

export interface AcademicYearSelectProps {
  value: number | null;
  onChange: (value: number | null) => void;
  required?: boolean;
  disabled?: boolean;
}

const PAGE_SIZE = 5;

export const AcademicYearSelect: React.FC<AcademicYearSelectProps> = ({ value, onChange, required, disabled }) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePaginatedAcademicYears(['academicYears'], PAGE_SIZE);

  const academicYears = data
    ? data.pages.flatMap(page => page.data)
    : [];

  const options = academicYears.map(year => ({
    value: year.id,
    label: year.name,
  }));


  React.useEffect(() => {
    if (options.length > 0 && value === null) {
      onChange(options[0].value);
    }
  }, [options, value, onChange]);

  const selectedOption = options.find(opt => opt.value === value) || null;

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={opt => {
        const val = opt ? Number(opt.value) : null;
        console.log('AcademicYearSelect onChange', val);
        onChange(val);
      }}
      placeholder="Select Academic Year"
      isLoading={isFetchingNextPage}
      onMenuScrollToBottom={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      isDisabled={disabled}
      classNamePrefix="react-select"
      styles={{
        control: (base, state) => ({
          ...base,
          borderRadius: '0.75rem',
          border: 'none',
          background: 'var(--color-muted)',
          width: '100%',
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
          width: '100%',
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
        dropdownIndicator: base => ({
          ...base,
          display: 'none',
        }),
        indicatorSeparator: base => ({
          ...base,
          display: 'none',
        }),
        placeholder: base => ({
          ...base,
          color: 'var(--color-muted-foreground)',
        }),
        menuPortal: base => ({ ...base, zIndex: 2147483647 }),
      }}
    />
  );
};

export default AcademicYearSelect; 