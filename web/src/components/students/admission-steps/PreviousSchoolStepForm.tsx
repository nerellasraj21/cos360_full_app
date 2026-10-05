
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const PreviousSchoolStepForm = () => {
  const { register, watch, setValue, formState: { errors } } = useFormContext();
  const previousSchoolValue = watch('is_previous_school');
  const hasPreviousSchool = previousSchoolValue === true || previousSchoolValue === 'true';

  useEffect(() => {
    if (!hasPreviousSchool) {
      setValue('previous_school_name', '');
      setValue('previous_class', '');
      setValue('previous_school_remark', '');
    }
  }, [hasPreviousSchool, setValue]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Previous School Details</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="is_previous_school">Previous School</Label>
          <select
            id="is_previous_school"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('is_previous_school', { setValueAs: (value) => value === true || value === 'true' })}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>

        {hasPreviousSchool && (
          <>
            <div>
              <Label htmlFor="previous_school_name">Previous School Name (Optional)</Label>
              <Input
                id="previous_school_name"
                {...register('previous_school_name')}
              />
            </div>

            <div>
              <Label htmlFor="previous_class">Previous Class (Optional)</Label>
              <Input
                id="previous_class"
                {...register('previous_class')}
              />
            </div>

            <div>
              <Label htmlFor="previous_school_remark">Previous School Remarks (Optional)</Label>
              <Input
                id="previous_school_remark"
                {...register('previous_school_remark')}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
