import { useFormContext } from 'react-hook-form';
import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StateDropdown } from '@/components/dropdown/StateDropdown';
import { DistrictDropdown } from '@/components/dropdown/DistrictDropdown';
import { MandalDropdown } from '@/components/dropdown/MandalDropdown';

export const AddressStepForm = () => {
  const { register, setValue, watch, formState: { errors } } = useFormContext();

  // Watch location fields directly
  const stateId = watch('state_id');
  const districtId = watch('district_id');

  // Track previous values to detect actual changes
  const prevStateIdRef = useRef<string | undefined>(undefined);
  const prevDistrictIdRef = useRef<string | undefined>(undefined);

  // Clear dependent fields only when parent actually changes
  useEffect(() => {
    if (prevStateIdRef.current !== undefined && prevStateIdRef.current !== stateId) {
      // State changed, clear district and mandal
      setValue('district_id', '');
      setValue('mandal_id', '');
    }
    prevStateIdRef.current = stateId;
  }, [stateId, setValue]);

  useEffect(() => {
    if (prevDistrictIdRef.current !== undefined && prevDistrictIdRef.current !== districtId) {
      // District changed, clear mandal
      setValue('mandal_id', '');
    }
    prevDistrictIdRef.current = districtId;
  }, [districtId, setValue]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Address Details</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="address_line1">Address Line 1 <span className="text-red-500">*</span></Label>
          <Input
            id="address_line1"
            {...register('address_line1', { required: 'Address Line 1 is required' })}
          />
          {errors.address_line1 && (
            <span className="text-red-500">{errors.address_line1.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
          <Input
            id="address_line2"
            placeholder="Apartment, suite, etc. (optional)"
            {...register('address_line2')}
          />
        </div>

        <div>
          <Label htmlFor="city">City (Optional)</Label>
          <Input
            id="city"
            {...register('city')}
          />
          {errors.city && (
            <span className="text-red-500">{errors.city.message as string}</span>
          )}
        </div>

        <div>
          <input type="hidden" {...register('state_id')} />
          <StateDropdown
            id="state_id"
            label="State (Optional)"
            value={stateId || ''}
            required={false}
            onChange={(value) => {
              setValue('state_id', value || '', { shouldValidate: true, shouldDirty: true });
            }}
          />
          {errors.state_id && (
            <span className="text-red-500 text-sm">{errors.state_id.message as string}</span>
          )}
        </div>

        <DistrictDropdown
          id="district_id"
          label="District (Optional)"
          stateId={stateId || undefined}
          value={districtId || ''}
          onChange={(value) => {
            setValue('district_id', value || '', { shouldValidate: true, shouldDirty: true });
          }}
        />

        <MandalDropdown
          id="mandal_id"
          label="Mandal (Optional)"
          districtId={districtId || undefined}
          value={watch('mandal_id') || ''}
          onChange={(value) => {
            setValue('mandal_id', value || '', { shouldValidate: true, shouldDirty: true });
          }}
        />

        <div>
          <Label htmlFor="pincode">Pincode (Optional)</Label>
          <Input
            id="pincode"
            {...register('pincode', {
              pattern: {
                value: /^\d{6}$/,
                message: 'Pincode must be 6 digits'
              }
            })}
          />
          {errors.pincode && (
            <span className="text-red-500">{errors.pincode.message as string}</span>
          )}
        </div>
      </div>
    </div>
  );
};
