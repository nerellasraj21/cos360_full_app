import React from 'react';
import Select from 'react-select';
import { useAcademicYearsDropdown } from '@/api/hooks/masters/academicyears';
import { useAcademicYearStore } from '@/lib/academicYearStore';

export const AcademicYearDropdown: React.FC = () => {
  const { data: academicYears, isLoading } = useAcademicYearsDropdown();
  const { selectedAcademicYearId, setSelectedAcademicYearId } = useAcademicYearStore();

  const options = academicYears ? academicYears.map(year => ({
    value: year.id,
    label: year.title,
  })) : [];

  // Initialize from store or fallback to current/first year
  React.useEffect(() => {
    if (!academicYears || academicYears.length === 0) return;
    if (!selectedAcademicYearId || selectedAcademicYearId === '' || selectedAcademicYearId === '371' || selectedAcademicYearId.length < 10) {
      const currentYear = academicYears.find(year => year.is_current);
      const fallbackId = (currentYear ? currentYear.id : academicYears[0].id) as string;
      if (fallbackId && String(fallbackId).length >= 10) {
        setSelectedAcademicYearId(String(fallbackId));
      }
    }
  }, [academicYears, selectedAcademicYearId, setSelectedAcademicYearId]);

  const selectedOption = options.find(opt => String(opt.value) === String(selectedAcademicYearId)) || null;

  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={opt => { if (opt) setSelectedAcademicYearId(String(opt.value)); }}
      placeholder="Select Academic Year"
      isLoading={isLoading}
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
