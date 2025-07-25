import React from 'react';
import Select from 'react-select';
import { usePaginatedAcademicYears } from '@/api/hooks/masters/academicyears';

export const AcademicYearDropdown: React.FC = () => {
  const PAGE_SIZE = 5;
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

  const [selectedAcademicYearId, setSelectedAcademicYearId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (options.length > 0 && selectedAcademicYearId === null) {
      setSelectedAcademicYearId(options[0].value);
    }
  }, [options, selectedAcademicYearId]);

  const selectedOption = options.find(opt => opt.value === selectedAcademicYearId) || null;

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={opt => { if (opt) setSelectedAcademicYearId(opt.value); }}
      placeholder="Select Academic Year"
      isLoading={isFetchingNextPage}
      onMenuScrollToBottom={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      className="min-w-[110px] w-[110px]"
      classNamePrefix="react-select"
      menuPlacement="auto"
      menuPosition="fixed"
      styles={{
        control: (base, state) => ({
          ...base,
          borderRadius: '0.75rem',
          border: 'none',
          background: 'var(--color-muted)',
          width: 110,
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
          width: 110,
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
        menuPortal: base => ({ ...base, zIndex: 9999 }),
      }}
    />
  );
};

export default AcademicYearDropdown;
