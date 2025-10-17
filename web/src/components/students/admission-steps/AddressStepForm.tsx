
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const AddressStepForm = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Address Details</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="address_line1">Address Line 1</Label>
          <Input
            id="address_line1"
            {...register('address_line1', { required: 'Address is required' })}
          />
          {errors.address_line1 && (
            <span className="text-red-500">{errors.address_line1.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="address_line2">Address Line 2</Label>
          <Input
            id="address_line2"
            {...register('address_line2')}
          />
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            {...register('city', { required: 'City is required' })}
          />
          {errors.city && (
            <span className="text-red-500">{errors.city.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            {...register('state', { required: 'State is required' })}
          />
          {errors.state && (
            <span className="text-red-500">{errors.state.message as string}</span>
          )}
        </div>
      </div>
    </div>
  );
};
