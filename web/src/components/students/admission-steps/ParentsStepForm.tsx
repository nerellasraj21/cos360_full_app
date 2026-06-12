
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import { searchParentByPhone } from '@/api/masters/parents';
import { SalaryRangeDropdown } from '@/components/dropdown/SalaryRangeDropdown';

// Phone is optional, but if entered it must be exactly 10 digits.
// Returns a clear message indicating whether the number is too short or too long.
const validatePhoneDigits = (value?: string): true | string => {
  if (!value || value.trim() === '') return true; // optional
  if (!/^\d+$/.test(value)) return 'Phone number must contain digits only';
  if (value.length < 10) return `Number is less than 10 digits — you entered ${value.length}. Please enter exactly 10 digits`;
  if (value.length > 10) return `Number exceeds 10 digits — you entered ${value.length}. Please enter exactly 10 digits`;
  return true;
};

// True only when the value is exactly 10 digits (used to show the green "valid" hint).
const isValidPhone = (value?: string): boolean =>
  !!value && /^\d{10}$/.test(value);

export const ParentsStepForm = () => {
  const { register, setValue, watch, formState: { errors } } = useFormContext();
  const [fatherSearching, setFatherSearching] = useState(false);
  const [motherSearching, setMotherSearching] = useState(false);
  const [fatherFound, setFatherFound] = useState<boolean | null>(null);
  const [motherFound, setMotherFound] = useState<boolean | null>(null);

  const handleFatherPhoneSearch = async (phone: string) => {
    if (!phone || phone.length < 10) return;

    setFatherSearching(true);
    setFatherFound(null);

    try {
      const parent = await searchParentByPhone(phone);
      if (parent) {
        setFatherFound(true);
        setValue('father_name', parent.name || '');
        setValue('father_email', parent.email || '');
        setValue('father_occupation', parent.occupation || '');
        setValue('father_aadhar_number', parent.aadhar_number || '');
        setValue('father_gender', parent.gender || '');
      } else {
        setFatherFound(false);
      }
    } catch (error) {
      console.error('Error searching for father:', error);
      setFatherFound(false);
    } finally {
      setFatherSearching(false);
    }
  };

  const handleMotherPhoneSearch = async (phone: string) => {
    if (!phone || phone.length < 10) return;

    setMotherSearching(true);
    setMotherFound(null);

    try {
      const parent = await searchParentByPhone(phone);
      if (parent) {
        setMotherFound(true);
        setValue('mother_name', parent.name || '');
        setValue('mother_email', parent.email || '');
        setValue('mother_occupation', parent.occupation || '');
        setValue('mother_aadhar_number', parent.aadhar_number || '');
        setValue('mother_gender', parent.gender || '');
      } else {
        setMotherFound(false);
      }
    } catch (error) {
      console.error('Error searching for mother:', error);
      setMotherFound(false);
    } finally {
      setMotherSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Parent & Guardian Details</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Father's Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Father's Information</h3>

          <div>
            <Label htmlFor="father_name">Name</Label>
            <Input
              id="father_name"
              {...register('father_name', { required: "Father's name is required" })}
            />
            {errors.father_name && (
              <span className="text-red-500">{errors.father_name.message as string}</span>
            )}
          </div>

          <div>
            <Label htmlFor="father_email">Email *</Label>
            <Input
              id="father_email"
              type="email"
              {...register('father_email', {
                required: "Father's email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
            />
            {errors.father_email && (
              <span className="text-red-500">{errors.father_email.message as string}</span>
            )}
          </div>

          <div>
            <Label htmlFor="father_phone">Phone (Optional)</Label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  id="father_phone"
                  {...register('father_phone', {
                    validate: validatePhoneDigits
                  })}
                />
                {errors.father_phone ? (
                  <span className="text-red-500 text-sm">{errors.father_phone.message as string}</span>
                ) : isValidPhone(watch('father_phone')) && (
                  <span className="text-green-600 text-sm">Mobile number is valid</span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const phone = (document.getElementById('father_phone') as HTMLInputElement)?.value;
                  handleFatherPhoneSearch(phone);
                }}
                disabled={fatherSearching}
                className="mt-0"
              >
                {fatherSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {fatherFound !== null && (
              <Badge variant={fatherFound ? "default" : "secondary"} className="mt-1">
                {fatherFound ? 'Parent found' : 'New parent'}
              </Badge>
            )}
          </div>

          <div>
            <Label htmlFor="father_occupation">Occupation (Optional)</Label>
            <Input
              id="father_occupation"
              {...register('father_occupation')}
            />
          </div>

          <SalaryRangeDropdown
            id="father_salary_range"
            label="Salary Range (Optional)"
            register={register('father_salary_range')}
          />

          <div>
            <Label htmlFor="father_aadhar_number">Aadhar Number (Optional)</Label>
            <Input
              id="father_aadhar_number"
              {...register('father_aadhar_number', {
                pattern: {
                  value: /^\d{12}$/,
                  message: 'Aadhar number must be 12 digits'
                }
              })}
            />
            {errors.father_aadhar_number && (
              <span className="text-red-500">{errors.father_aadhar_number.message as string}</span>
            )}
          </div>

          <div>
            <Label htmlFor="father_gender">Gender (Optional)</Label>
            <select
              id="father_gender"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('father_gender')}
            >
              <option value="">Select Gender</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>

          <div>
            <Label htmlFor="father_relation_to_student">Relation to Student</Label>
            <Input
              id="father_relation_to_student"
              value="Father"
              readOnly
              className="bg-gray-100"
            />
          </div>
        </div>

        {/* Mother's Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Mother's Information</h3>

          <div>
            <Label htmlFor="mother_name">Name</Label>
            <Input
              id="mother_name"
              {...register('mother_name', { required: "Mother's name is required" })}
            />
            {errors.mother_name && (
              <span className="text-red-500">{errors.mother_name.message as string}</span>
            )}
          </div>

          <div>
            <Label htmlFor="mother_email">Email *</Label>
            <Input
              id="mother_email"
              type="email"
              {...register('mother_email', {
                required: "Mother's email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                },
                validate: {
                  differentFromFather: (value) => {
                    const fatherEmail = watch('father_email');
                    return value !== fatherEmail || "Mother's email must be different from father's email";
                  }
                }
              })}
            />
            {errors.mother_email && (
              <span className="text-red-500">{errors.mother_email.message as string}</span>
            )}
          </div>

          <div>
            <Label htmlFor="mother_phone">Phone (Optional)</Label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Input
                  id="mother_phone"
                  {...register('mother_phone', {
                    validate: validatePhoneDigits
                  })}
                />
                {errors.mother_phone ? (
                  <span className="text-red-500 text-sm">{errors.mother_phone.message as string}</span>
                ) : isValidPhone(watch('mother_phone')) && (
                  <span className="text-green-600 text-sm">Mobile number is valid</span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const phone = (document.getElementById('mother_phone') as HTMLInputElement)?.value;
                  handleMotherPhoneSearch(phone);
                }}
                disabled={motherSearching}
                className="mt-0"
              >
                {motherSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {motherFound !== null && (
              <Badge variant={motherFound ? "default" : "secondary"} className="mt-1">
                {motherFound ? 'Parent found' : 'New parent'}
              </Badge>
            )}
          </div>

          <div>
            <Label htmlFor="mother_occupation">Occupation (Optional)</Label>
            <Input
              id="mother_occupation"
              {...register('mother_occupation')}
            />
          </div>

          <SalaryRangeDropdown
            id="mother_salary_range"
            label="Salary Range (Optional)"
            register={register('mother_salary_range')}
          />

          <div>
            <Label htmlFor="mother_aadhar_number">Aadhar Number (Optional)</Label>
            <Input
              id="mother_aadhar_number"
              {...register('mother_aadhar_number', {
                pattern: {
                  value: /^\d{12}$/,
                  message: 'Aadhar number must be 12 digits'
                }
              })}
            />
            {errors.mother_aadhar_number && (
              <span className="text-red-500">{errors.mother_aadhar_number.message as string}</span>
            )}
          </div>

          <div>
            <Label htmlFor="mother_gender">Gender (Optional)</Label>
            <select
              id="mother_gender"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('mother_gender')}
            >
              <option value="">Select Gender</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>

          <div>
            <Label htmlFor="mother_relation_to_student">Relation to Student</Label>
            <Input
              id="mother_relation_to_student"
              value="Mother"
              readOnly
              className="bg-gray-100"
            />
          </div>
        </div>

        {/* Guardian's Details (Optional) */}
        <div className="space-y-4 col-span-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Guardian's Information (Optional)</h3>
            <span className="text-xs text-gray-500">Optional</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guardian_name">Name (Optional)</Label>
              <Input
                id="guardian_name"
                {...register('guardian_name')}
              />
            </div>

            <div>
              <Label htmlFor="guardian_email">Email (Optional)</Label>
              <Input
                id="guardian_email"
                type="email"
                {...register('guardian_email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
              {errors.guardian_email && (
                <span className="text-red-500">{errors.guardian_email.message as string}</span>
              )}
            </div>

            <div>
              <Label htmlFor="guardian_phone">Phone (Optional)</Label>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    id="guardian_phone"
                    {...register('guardian_phone', {
                      validate: validatePhoneDigits
                    })}
                  />
                  {errors.guardian_phone ? (
                    <span className="text-red-500 text-sm">{errors.guardian_phone.message as string}</span>
                  ) : isValidPhone(watch('guardian_phone')) && (
                    <span className="text-green-600 text-sm">Mobile number is valid</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="guardian_occupation">Occupation (Optional)</Label>
              <Input
                id="guardian_occupation"
                {...register('guardian_occupation')}
              />
            </div>

            <div>
              <Label htmlFor="guardian_salary_range">Salary Range (Optional)</Label>
              <SalaryRangeDropdown
                id="guardian_salary_range"
                label=""
                register={register('guardian_salary_range')}
              />
            </div>

            <div>
              <Label htmlFor="guardian_aadhar_number">Aadhar Number (Optional)</Label>
              <Input
                id="guardian_aadhar_number"
                {...register('guardian_aadhar_number', {
                  pattern: {
                    value: /^\d{12}$/,
                    message: 'Aadhar number must be 12 digits'
                  }
                })}
              />
              {errors.guardian_aadhar_number && (
                <span className="text-red-500">{errors.guardian_aadhar_number.message as string}</span>
              )}
            </div>

            <div>
              <Label htmlFor="guardian_gender">Gender (Optional)</Label>
              <select
                id="guardian_gender"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('guardian_gender')}
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="guardian_relation_to_student">Relation to Student (Optional)</Label>
              <Input
                id="guardian_relation_to_student"
                placeholder="e.g., Grandfather, Grandmother, Uncle, Aunt"
                {...register('guardian_relation_to_student')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
