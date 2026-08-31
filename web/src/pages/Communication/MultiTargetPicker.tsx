import { useCallback } from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { useQuery } from '@tanstack/react-query';
import CAxios from '@/api';
import { useSelectStyles } from '@/lib/useSelectStyles';

export interface PickedOption {
  value: string;
  label: string;
}

interface MultiTargetPickerProps {
  kind: 'parent' | 'student' | 'staff';
  value: PickedOption[];
  onChange: (selected: PickedOption[]) => void;
}

interface RawParent {
  id?: string;
  name?: string;
  phone?: string;
}

interface RawStudentAdmissionItem {
  admission_number?: string;
  student?: { id?: string; first_name?: string; last_name?: string };
}

interface RawStaff {
  id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

async function loadParentOptions(search: string): Promise<PickedOption[]> {
  const { data } = await CAxios.get('/parents/search', {
    params: { search_query: search || undefined, limit: 20 },
  });
  const items: RawParent[] = data?.items ?? [];
  return items
    .filter((p): p is RawParent & { id: string } => !!p?.id)
    .map((p) => ({
      value: p.id,
      label: p.phone ? `${p.name} (${p.phone})` : (p.name ?? p.id),
    }));
}

async function loadStudentOptions(search: string): Promise<PickedOption[]> {
  const { data } = await CAxios.get('/students/admission', {
    params: { search: search || undefined, limit: 20 },
  });
  const items: RawStudentAdmissionItem[] = data?.items ?? [];
  return items
    .filter((item): item is RawStudentAdmissionItem & { student: { id: string } } => !!item?.student?.id)
    .map((item) => {
      const s = item.student;
      const name = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || item.admission_number || s.id;
      return { value: s.id, label: `${name} (${item.admission_number})` };
    });
}

/**
 * Searchable multi-select for picking a specific set of parents, students, or
 * staff to send a communication to (Target Type: "Multiple Parents/Students/Staff").
 */
export function MultiTargetPicker({ kind, value, onChange }: MultiTargetPickerProps) {
  const selectStyles = useSelectStyles();

  // Staff has no search endpoint yet — fetch the full list once and filter client-side.
  const { data: staffOptions, isLoading: staffLoading } = useQuery({
    queryKey: ['communication-staff-options'],
    queryFn: async (): Promise<PickedOption[]> => {
      const { data } = await CAxios.get('/staff/');
      const items: RawStaff[] = Array.isArray(data) ? data : [];
      return items
        .filter((s): s is RawStaff & { id: string } => !!s?.id)
        .map((s) => {
          const name = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim();
          return { value: s.id, label: s.phone ? `${name} (${s.phone})` : name };
        });
    },
    enabled: kind === 'staff',
    staleTime: 5 * 60 * 1000,
  });

  const handleChange = useCallback(
    (selected: readonly PickedOption[] | null) => onChange(selected ? [...selected] : []),
    [onChange],
  );

  if (kind === 'staff') {
    return (
      <div className="space-y-1">
        <Select
          isMulti
          isLoading={staffLoading}
          options={staffOptions ?? []}
          value={value}
          onChange={handleChange}
          placeholder="Search and select staff…"
          menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
          styles={selectStyles}
          closeMenuOnSelect={false}
        />
        {value.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {value.length} staff selected
          </p>
        )}
      </div>
    );
  }

  const loadOptions = kind === 'parent' ? loadParentOptions : loadStudentOptions;
  const placeholder =
    kind === 'parent' ? 'Search parents by name / phone…' : 'Search students by name / admission no…';

  return (
    <div className="space-y-1">
      <AsyncSelect
        isMulti
        cacheOptions
        defaultOptions
        loadOptions={loadOptions}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
        styles={selectStyles}
        closeMenuOnSelect={false}
      />
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} {kind}{value.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
