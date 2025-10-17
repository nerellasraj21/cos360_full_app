import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateAdmission } from '@/api/hooks/students/admissions';
import type { StudentAdmissionCreate } from '@/types/admission';

interface AdmissionFormProps {
  onComplete: () => void;
}

const AdmissionForm: React.FC<AdmissionFormProps> = ({ onComplete }) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<StudentAdmissionCreate>({
    defaultValues: {
      admission_date: '',
      academic_year_id: '',
      admitted_class_id: '',
      admitted_section_id: '',
      current_class_id: '',
      current_section_id: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      is_previous_school: false,
      previous_school_name: '',
      previous_class: '',
      previous_school_remark: '',
      student: {
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'male',
        aadhar_number: '',
        father: {
          name: '',
          email: '',
          phone: '',
          occupation: ''
        },
        mother: {
          name: '',
          email: '',
          phone: '',
          occupation: ''
        }
      }
    },
  });

  const createAdmission = useCreateAdmission();

  const onSubmit = async (data: StudentAdmissionCreate) => {
    try {
      await createAdmission.mutateAsync(data);
      onComplete();
    } catch (error) {
      console.error('Failed to create admission:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Academic Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Academic Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="admission_date">Admission Date</Label>
            <Input
              id="admission_date"
              type="date"
              {...register('admission_date', { required: 'Admission date is required' })}
            />
            {errors.admission_date && <p className="text-red-500 text-sm">{errors.admission_date.message}</p>}
          </div>

          <div>
            <Label htmlFor="academic_year_id">Academic Year</Label>
            <Input
              id="academic_year_id"
              {...register('academic_year_id')}
            />
          </div>

          <div>
            <Label htmlFor="admitted_class_id">Admitted Class</Label>
            <Input
              id="admitted_class_id"
              {...register('admitted_class_id', { required: 'Admitted class is required' })}
            />
            {errors.admitted_class_id && <p className="text-red-500 text-sm">{errors.admitted_class_id.message}</p>}
          </div>

          <div>
            <Label htmlFor="admitted_section_id">Admitted Section</Label>
            <Input
              id="admitted_section_id"
              {...register('admitted_section_id', { required: 'Admitted section is required' })}
            />
            {errors.admitted_section_id && <p className="text-red-500 text-sm">{errors.admitted_section_id.message}</p>}
          </div>

          <div>
            <Label htmlFor="current_class_id">Current Class</Label>
            <Input
              id="current_class_id"
              {...register('current_class_id')}
            />
          </div>

          <div>
            <Label htmlFor="current_section_id">Current Section</Label>
            <Input
              id="current_section_id"
              {...register('current_section_id')}
            />
          </div>
        </div>
      </div>

      {/* Student Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Student Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="student.first_name">First Name</Label>
            <Input
              id="student.first_name"
              {...register('student.first_name', { required: 'First name is required' })}
            />
            {(errors as any).student?.first_name && <p className="text-red-500 text-sm">{(errors as any).student.first_name.message}</p>}
          </div>

          <div>
            <Label htmlFor="student.last_name">Last Name</Label>
            <Input
              id="student.last_name"
              {...register('student.last_name', { required: 'Last name is required' })}
            />
            {(errors as any).student?.last_name && <p className="text-red-500 text-sm">{(errors as any).student.last_name.message}</p>}
          </div>

          <div>
            <Label htmlFor="student.date_of_birth">Date of Birth</Label>
            <Input
              id="student.date_of_birth"
              type="date"
              {...register('student.date_of_birth', { required: 'Date of birth is required' })}
            />
            {(errors as any).student?.date_of_birth && <p className="text-red-500 text-sm">{(errors as any).student.date_of_birth.message}</p>}
          </div>

          <div>
            <Label htmlFor="student.gender">Gender</Label>
            <Select onValueChange={(value) => setValue('student.gender', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {(errors as any).student?.gender && <p className="text-red-500 text-sm">{(errors as any).student.gender.message}</p>}
          </div>

          <div>
            <Label htmlFor="student.aadhar_number">Aadhar Number</Label>
            <Input
              id="student.aadhar_number"
              {...register('student.aadhar_number', {
                pattern: {
                  value: /^\d{12}$/,
                  message: 'Aadhar number must be 12 digits'
                }
              })}
            />
            {(errors as any).student?.aadhar_number && <p className="text-red-500 text-sm">{(errors as any).student.aadhar_number.message}</p>}
          </div>
        </div>
      </div>

      {/* Parent Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Parent Information</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Father's Details */}
          <div className="space-y-4">
            <h4 className="text-md font-medium">Father's Information</h4>

            <div>
              <Label htmlFor="student.father.name">Name</Label>
              <Input
                id="student.father.name"
                {...register('student.father.name', { required: "Father's name is required" })}
              />
              {(errors as any).student?.father?.name && <p className="text-red-500 text-sm">{(errors as any).student.father.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="student.father.email">Email</Label>
              <Input
                id="student.father.email"
                type="email"
                {...register('student.father.email', {
                  required: "Father's email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
              {(errors as any).student?.father?.email && <p className="text-red-500 text-sm">{(errors as any).student.father.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="student.father.phone">Phone</Label>
              <Input
                id="student.father.phone"
                {...register('student.father.phone', {
                  required: "Father's phone is required",
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'Phone number must be 10 digits'
                  }
                })}
              />
              {(errors as any).student?.father?.phone && <p className="text-red-500 text-sm">{(errors as any).student.father.phone.message}</p>}
            </div>

            <div>
              <Label htmlFor="student.father.occupation">Occupation</Label>
              <Input
                id="student.father.occupation"
                {...register('student.father.occupation')}
              />
            </div>
          </div>

          {/* Mother's Details */}
          <div className="space-y-4">
            <h4 className="text-md font-medium">Mother's Information</h4>

            <div>
              <Label htmlFor="student.mother.name">Name</Label>
              <Input
                id="student.mother.name"
                {...register('student.mother.name', { required: "Mother's name is required" })}
              />
              {(errors as any).student?.mother?.name && <p className="text-red-500 text-sm">{(errors as any).student.mother.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="student.mother.email">Email</Label>
              <Input
                id="student.mother.email"
                type="email"
                {...register('student.mother.email', {
                  required: "Mother's email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
              {(errors as any).student?.mother?.email && <p className="text-red-500 text-sm">{(errors as any).student.mother.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="student.mother.phone">Phone</Label>
              <Input
                id="student.mother.phone"
                {...register('student.mother.phone', {
                  required: "Mother's phone is required",
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'Phone number must be 10 digits'
                  }
                })}
              />
              {(errors as any).student?.mother?.phone && <p className="text-red-500 text-sm">{(errors as any).student.mother.phone.message}</p>}
            </div>

            <div>
              <Label htmlFor="student.mother.occupation">Occupation</Label>
              <Input
                id="student.mother.occupation"
                {...register('student.mother.occupation')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Address Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input
              id="address_line1"
              {...register('address_line1', { required: 'Address is required' })}
            />
            {errors.address_line1 && <p className="text-red-500 text-sm">{errors.address_line1.message}</p>}
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
            {errors.city && <p className="text-red-500 text-sm">{errors.city.message}</p>}
          </div>

          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              {...register('state', { required: 'State is required' })}
            />
            {errors.state && <p className="text-red-500 text-sm">{errors.state.message}</p>}
          </div>
        </div>
      </div>

      {/* Previous School Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Previous School Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="is_previous_school">Previous School Experience</Label>
            <select
              id="is_previous_school"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('is_previous_school')}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>

          {watch('is_previous_school') && (
            <>
              <div>
                <Label htmlFor="previous_school_name">Previous School Name</Label>
                <Input
                  id="previous_school_name"
                  {...register('previous_school_name', {
                    required: watch('is_previous_school') ? 'Previous school name is required' : false
                  })}
                />
                {errors.previous_school_name && <p className="text-red-500 text-sm">{errors.previous_school_name.message}</p>}
              </div>

              <div>
                <Label htmlFor="previous_class">Previous Class</Label>
                <Input
                  id="previous_class"
                  {...register('previous_class', {
                    required: watch('is_previous_school') ? 'Previous class is required' : false
                  })}
                />
                {errors.previous_class && <p className="text-red-500 text-sm">{errors.previous_class.message}</p>}
              </div>

              <div>
                <Label htmlFor="previous_school_remark">Previous School Remarks</Label>
                <Input
                  id="previous_school_remark"
                  {...register('previous_school_remark')}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onComplete}>
          Cancel
        </Button>
        <Button type="submit" disabled={createAdmission.status === 'pending'}>
          {createAdmission.status === 'pending' ? 'Creating...' : 'Create Admission'}
        </Button>
      </div>
    </form>
  );
};

export default AdmissionForm;
