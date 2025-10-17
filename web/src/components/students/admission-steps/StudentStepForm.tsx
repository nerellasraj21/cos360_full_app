
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Select component will be replaced with native select

export const StudentStepForm = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Student Details</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="student_first_name">First Name</Label>
          <Input
            id="student_first_name"
            {...register('student_first_name', { required: 'First name is required' })}
          />
          {errors.student_first_name && (
            <span className="text-red-500">{errors.student_first_name.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="student_last_name">Last Name</Label>
          <Input
            id="student_last_name"
            {...register('student_last_name', { required: 'Last name is required' })}
          />
          {errors.student_last_name && (
            <span className="text-red-500">{errors.student_last_name.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="student_date_of_birth">Date of Birth</Label>
          <Input
            id="student_date_of_birth"
            type="date"
            {...register('student_date_of_birth', { required: 'Date of birth is required' })}
          />
          {errors.student_date_of_birth && (
            <span className="text-red-500">{errors.student_date_of_birth.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="student_gender">Gender</Label>
          <select
            id="student_gender"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('student_gender', { required: 'Gender is required' })}
          >
            <option value="">Select Gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
          {errors.student_gender && (
            <span className="text-red-500">{errors.student_gender.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="student_is_primary">Primary Status</Label>
          <select
            id="student_is_primary"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('student_is_primary')}
          >
            <option value="not_primary">Not Primary</option>
            <option value="primary">Primary</option>
          </select>
        </div>

        <div>
          <Label htmlFor="student_nationality">Nationality</Label>
          <Input
            id="student_nationality"
            {...register('student_nationality')}
            placeholder="Indian"
          />
        </div>

        <div>
          <Label htmlFor="student_mother_tongue">Mother Tongue</Label>
          <Input
            id="student_mother_tongue"
            {...register('student_mother_tongue')}
            placeholder="Telugu"
          />
        </div>

        <div>
          <Label htmlFor="student_aadhar_number">Aadhar Number (Optional)</Label>
          <Input
            id="student_aadhar_number"
            {...register('student_aadhar_number', {
              pattern: {
                value: /^\d{12}$/,
                message: 'Aadhar number must be 12 digits'
              }
            })}
          />
          {errors.student_aadhar_number && (
            <span className="text-red-500">{errors.student_aadhar_number.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="student_apaar_number">APAAR Number (Optional)</Label>
          <Input
            id="student_apaar_number"
            {...register('student_apaar_number', {
              pattern: {
                value: /^\d{12}$/,
                message: 'APAAR number must be 12 digits'
              }
            })}
          />
          {errors.student_apaar_number && (
            <span className="text-red-500">{errors.student_apaar_number.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="student_caste">Caste (Optional)</Label>
          <Input
            id="student_caste"
            {...register('student_caste')}
          />
        </div>

        <div>
          <Label htmlFor="student_sub_caste">Sub Caste (Optional)</Label>
          <Input
            id="student_sub_caste"
            {...register('student_sub_caste')}
          />
        </div>

        <div>
          <Label htmlFor="student_community">Community (Optional)</Label>
          <Input
            id="student_community"
            {...register('student_community')}
          />
        </div>

        <div>
          <Label htmlFor="student_identification_marks">Identification Marks (Optional)</Label>
          <Input
            id="student_identification_marks"
            {...register('student_identification_marks')}
          />
        </div>
      </div>
    </div>
  );
};
