
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClassesDropdown, useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
import { useAcademicYearsDropdown } from '@/api/hooks/masters/academicyears';

export const AcademicStepForm = () => {
  const { register, setValue, watch, formState: { errors } } = useFormContext();
  const selectedClassId = watch('admitted_class_id');

  const { data: classes = [], isLoading: classesLoading } = useClassesDropdown(true);
  const { data: sections = [], isLoading: sectionsLoading } = useSectionsByClassId(selectedClassId || undefined);
  const { data: academicYears = [], isLoading: academicYearsLoading } = useAcademicYearsDropdown();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Academic Details</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="admission_date">Admission Date</Label>
          <Input
            id="admission_date"
            type="date"
            {...register('admission_date', { required: 'Admission date is required' })}
          />
          {errors.admission_date && (
            <span className="text-red-500">{errors.admission_date.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="academic_year_id">Current Academic Year</Label>
          <Select
            value={watch('academic_year_id') || ''}
            onValueChange={(value) => setValue('academic_year_id', value)}
            disabled={academicYearsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Current Academic Year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.title} {year.is_current ? '(Current)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.academic_year_id && (
            <span className="text-red-500">{errors.academic_year_id.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="admitted_academic_year_id">Admitted Academic Year</Label>
          <Select
            value={watch('admitted_academic_year_id') || ''}
            onValueChange={(value) => setValue('admitted_academic_year_id', value)}
            disabled={academicYearsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Admitted Academic Year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.title} {year.is_current ? '(Current)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.admitted_academic_year_id && (
            <span className="text-red-500">{errors.admitted_academic_year_id.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="admitted_class_id">Class</Label>
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
          <Label htmlFor="admitted_section_id">Section</Label>
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

        <div>
          <Label htmlFor="current_class_id">Current Class</Label>
          <Select
            value={watch('current_class_id') || ''}
            onValueChange={(value) => {
              setValue('current_class_id', value);
              setValue('current_section_id', ''); // Reset current section when class changes
            }}
            disabled={classesLoading}
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
          <Label htmlFor="current_section_id">Current Section</Label>
          <Select
            value={watch('current_section_id') || ''}
            onValueChange={(value) => setValue('current_section_id', value)}
            disabled={sectionsLoading || !watch('current_class_id')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Current Section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
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
