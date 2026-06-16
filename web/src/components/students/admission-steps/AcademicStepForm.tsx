
import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClassesDropdown, useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
import { AdmissionTypeDropdown } from '@/components/dropdown/AdmissionTypeDropdown';

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
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="admission_date">Admission Date *</Label>
          <Input
            id="admission_date"
            type="date"
            max={new Date().toISOString().split('T')[0]}
            {...register('admission_date', {
              required: 'Admission date is required',
              validate: {
                notFuture: (value) => {
                  const selectedDate = new Date(value);
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
          label="Admission Type *"
          value={watch('admission_type')}
          onChange={(value) => setValue('admission_type', value)}
        />

        <div>
          <Label htmlFor="admitted_class_id">Joining Class <span className="text-red-500">*</span></Label>
          <Select
            value={selectedClassId || ''}
            onValueChange={(value) => {
              setValue('admitted_class_id', value);
              setValue('admitted_section_id', ''); // Reset section when class changes
            }}
            disabled={classesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="admitted_section_id">Joining Section</Label>
          <Select
            value={watch('admitted_section_id') || ''}
            onValueChange={(value) => setValue('admitted_section_id', value)}
            disabled={sectionsLoading || !selectedClassId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Label htmlFor="current_class_id">Current Class <span className="text-red-500">*</span></Label>
          <Select
            value={watch('current_class_id') || ''}
            onValueChange={(value) => {
              setValue('current_class_id', value);
              setValue('current_section_id', ''); // Reset current section when class changes
            }}
            disabled={classesLoading || syncClassSection}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Current Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.current_class_id && (
            <span className="text-red-500">{errors.current_class_id.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="current_section_id">Current Section <span className="text-red-500">*</span></Label>
          <Select
            value={watch('current_section_id') || ''}
            onValueChange={(value) => setValue('current_section_id', value)}
            disabled={currentSectionsLoading || !watch('current_class_id') || syncClassSection}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Current Section" />
            </SelectTrigger>
            <SelectContent>
              {currentSections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.current_section_id && (
            <span className="text-red-500">{errors.current_section_id.message as string}</span>
          )}
        </div>
      </div>
    </div>
  );
};
