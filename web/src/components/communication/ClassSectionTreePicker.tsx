import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { useReadAllClassSections } from '@/api/hooks/masters/classesandsections';
import { cn } from '@/lib/utils';

export interface ClassSectionSelection {
  classId: string;
  sectionId: string;
}

interface ClassSectionTreePickerProps {
  academicYearId?: string;
  value: ClassSectionSelection[];
  onChange: (value: ClassSectionSelection[]) => void;
  searchQuery?: string;
  className?: string;
}

function TriStateCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 rounded border-border accent-primary shrink-0"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function ClassSectionTreePicker({
  academicYearId,
  value,
  onChange,
  searchQuery = '',
  className,
}: ClassSectionTreePickerProps) {
  const { data: allClasses = [], isLoading } = useReadAllClassSections({
    academic_year_id: academicYearId,
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const query = searchQuery.trim().toLowerCase();
  const classes = useMemo(() => {
    if (!query) return allClasses;
    return allClasses
      .map((cls) => {
        const classMatches = cls.name.toLowerCase().includes(query);
        const matchingSections = cls.sections.filter((s) => s.name.toLowerCase().includes(query));
        if (classMatches) return cls;
        if (matchingSections.length > 0) return { ...cls, sections: matchingSections };
        return null;
      })
      .filter((c): c is (typeof allClasses)[number] => c !== null);
  }, [allClasses, query]);

  useEffect(() => {
    if (!query) return;
    setExpanded(new Set(classes.map((c) => c.id)));
  }, [query, classes]);

  const selectedByClass = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const { classId, sectionId } of value) {
      if (!map.has(classId)) map.set(classId, new Set());
      map.get(classId)!.add(sectionId);
    }
    return map;
  }, [value]);

  function toggleExpanded(classId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  function toggleSection(classId: string, sectionId: string) {
    const isSelected = selectedByClass.get(classId)?.has(sectionId) ?? false;
    if (isSelected) {
      onChange(value.filter((v) => !(v.classId === classId && v.sectionId === sectionId)));
    } else {
      onChange([...value, { classId, sectionId }]);
    }
  }

  function toggleClass(classId: string, sectionIds: string[]) {
    const selectedSections = selectedByClass.get(classId) ?? new Set<string>();
    const isFullySelected = sectionIds.length > 0 && sectionIds.every((id) => selectedSections.has(id));

    if (isFullySelected) {
      onChange(value.filter((v) => v.classId !== classId));
    } else {
      const withoutClass = value.filter((v) => v.classId !== classId);
      onChange([...withoutClass, ...sectionIds.map((sectionId) => ({ classId, sectionId }))]);
    }
  }

  const allSelectableSectionCount = classes.reduce((sum, c) => sum + c.sections.length, 0);
  const isAllSelected = allSelectableSectionCount > 0 && value.length === allSelectableSectionCount;
  const isSomeSelected = value.length > 0 && !isAllSelected;

  function toggleSelectAll() {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(
        classes.flatMap((c) => c.sections.map((s) => ({ classId: c.id, sectionId: s.id }))),
      );
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 py-6 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading classes…
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className={cn('py-6 text-sm text-muted-foreground text-center', className)}>
        {query ? 'No classes or sections match your search.' : 'No classes found.'}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <button
        type="button"
        onClick={toggleSelectAll}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted/50"
      >
        <TriStateCheckbox
          checked={isAllSelected}
          indeterminate={isSomeSelected}
          onChange={toggleSelectAll}
          label="Select all classes"
        />
        Select all classes
      </button>

      <div className="space-y-0.5">
        {classes.map((cls) => {
          const sectionIds = cls.sections.map((s) => s.id);
          const selectedSections = selectedByClass.get(cls.id) ?? new Set<string>();
          const isClassFullySelected = sectionIds.length > 0 && sectionIds.every((id) => selectedSections.has(id));
          const isClassPartiallySelected = selectedSections.size > 0 && !isClassFullySelected;
          const isExpanded = expanded.has(cls.id);
          const hasSections = sectionIds.length > 0;

          return (
            <div key={cls.id}>
              <div
                role={hasSections ? 'button' : undefined}
                onClick={hasSections ? () => toggleExpanded(cls.id) : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm',
                  hasSections && 'cursor-pointer hover:bg-muted/50',
                )}
              >
                {hasSections ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <TriStateCheckbox
                  checked={isClassFullySelected}
                  indeterminate={isClassPartiallySelected}
                  onChange={() => toggleClass(cls.id, sectionIds)}
                  label={`Select all sections of ${cls.name}`}
                />
                <span className="flex-1 font-medium">{cls.name}</span>
              </div>

              {isExpanded && hasSections && (
                <div className="ml-8 space-y-0.5">
                  {cls.sections.map((section) => (
                    <label
                      key={section.id}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/50"
                    >
                      <TriStateCheckbox
                        checked={selectedSections.has(section.id)}
                        indeterminate={false}
                        onChange={() => toggleSection(cls.id, section.id)}
                        label={`${cls.name} ${section.name}`}
                      />
                      <span className="flex-1">{section.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
