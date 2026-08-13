
import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useClassesDropdown, useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
import { AdmissionTypeDropdown } from '@/components/dropdown/AdmissionTypeDropdown';
import { InfiniteScrollDropdown } from '@/components/dropdown/InfiniteScrollDropdown';

export const AcademicStepForm = () => {
  const { register, setValue, watch, formState: { errors } } = useFormContext();
  const selectedClassId = watch('admitted_class_id');
  const selectedSectionId = watch('admitted_section_id');
  const currentClassId = watch('current_class_id');
  const [syncClassSection, setSyncClassSection] = useState(false);

  const { data: classes = [], isLoading: classesLoading } = useClassesDropdown(true);
  const { data: sections = [], isLoading: sectionsLoading } = useSectionsByClassId(selectedClassId || undefined);
  const { data: currentSections = [], isLoading: currentSectionsLoading } = useSectionsByClassId(currentClassId || undefined);

  // Sync current class/section when checkbox is checked
  useEffect(() => {
    if (syncClassSection) {
      setValue('current_class_id', selectedClassId);
      setValue('current_section_id', selectedSectionId);
    }
  }, [syncClassSection, selectedClassId, selectedSectionId, setValue]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Academic Details</h2>
      {/* Hidden inputs attach refs so trigger() can validate dropdown-controlled fields */}
      <input type="hidden" {...register('admitted_class_id', { required: 'Joining Class is required' })} />
      <input type="hidden" {...register('admitted_section_id')} />
      <input type="hidden" {...register('current_class_id')} />
      <input type="hidden" {...register('current_section_id')} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="admission_date">Admission Date</Label>
          <Input
            id="admission_date"
            type="date"
            max={new Date().toISOString().split('T')[0]}
            {...register('admission_date', {
              required: 'Admission date is required',
              validate: {
                notFuture: (value) => {
                  // Parse as local date (not UTC) so timezones ahead of UTC
                  // don't get bumped to "tomorrow" and falsely flagged as future.
                  const [year, month, day] = value.split('-').map(Number);
                  const selectedDate = new Date(year, month - 1, day);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return selectedDate <= today || 'Admission date cannot be in the future';
                }
              }
            })}
          />
          {errors.admission_date && (
            <span className="text-red-500">{errors.admission_date.message as string}</span>
          )}
        </div>

        <AdmissionTypeDropdown
          id="admission_type"
          label="Admission Type"
          value={watch('admission_type')}
          onChange={(value) => setValue('admission_type', value)}
        />

        <div>
          <Label htmlFor="admitted_class_id">Joining Class <span className="text-red-500">*</span></Label>
          <InfiniteScrollDropdown
            data={classes.map(c => ({ id: c.id, value: c.id, label: c.name }))}
            value={selectedClassId || ''}
            onChange={(value) => {
              setValue('admitted_class_id', value as string, { shouldValidate: true });
              setValue('admitted_section_id', '');
            }}
            placeholder="Select Class"
            disabled={classesLoading}
            clearable={false}
          />
          {errors.admitted_class_id && (
            <span className="text-red-500 text-sm">{errors.admitted_class_id.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="admitted_section_id">Joining Section</Label>
          <InfiniteScrollDropdown
            data={sections.map(s => ({ id: s.id, value: s.id, label: s.name }))}
            value={watch('admitted_section_id') || ''}
            onChange={(value) => setValue('admitted_section_id', value as string, { shouldValidate: true })}
            placeholder="Select Section"
            disabled={sectionsLoading || !selectedClassId}
            clearable={false}
          />
          {errors.admitted_section_id && (
            <span className="text-red-500 text-sm">{errors.admitted_section_id.message as string}</span>
          )}
        </div>

        <div className="col-span-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sync_class_section"
              checked={syncClassSection}
              onCheckedChange={(checked) => setSyncClassSection(checked as boolean)}
            />
            <Label htmlFor="sync_class_section" className="cursor-pointer">
              Current Class/Section same as Admission Class/Section
            </Label>
          </div>
        </div>

        <div>
          <Label htmlFor="current_class_id">Current Class</Label>
          <InfiniteScrollDropdown
            data={classes.map(c => ({ id: c.id, value: c.id, label: c.name }))}
            value={watch('current_class_id') || ''}
            onChange={(value) => {
              setValue('current_class_id', value as string, { shouldValidate: true });
              setValue('current_section_id', '');
            }}
            placeholder="Select Current Class"
            disabled={classesLoading || syncClassSection}
            clearable={false}
          />
          {errors.current_class_id && (
            <span className="text-red-500 text-sm">{errors.current_class_id.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="current_section_id">Current Section</Label>
          <InfiniteScrollDropdown
            data={currentSections.map(s => ({ id: s.id, value: s.id, label: s.name }))}
            value={watch('current_section_id') || ''}
            onChange={(value) => setValue('current_section_id', value as string, { shouldValidate: true })}
            placeholder="Select Current Section"
            disabled={currentSectionsLoading || !watch('current_class_id')}
            clearable={false}
          />
          {errors.current_section_id && (
            <span className="text-red-500 text-sm">{errors.current_section_id.message as string}</span>
          )}
        </div>
      </div>
    </div>
  );
};
