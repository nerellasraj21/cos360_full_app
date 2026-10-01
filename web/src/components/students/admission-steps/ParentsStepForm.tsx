
import { useState, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const { register, watch, setValue, clearErrors, formState: { errors } } = useFormContext();

  // Father phone is mandatory per the admission contract; the "Primary" toggle
  // defaults on so it is required unless the user explicitly opts out.
  const [fatherPhoneRequired, setFatherPhoneRequired] = useState(true);
  const fatherPhoneRequiredRef = useRef(true);
  const [motherPhoneRequired, setMotherPhoneRequired] = useState(false);
  const motherPhoneRequiredRef = useRef(false);
  const [guardianPhoneRequired, setGuardianPhoneRequired] = useState(false);
  const guardianPhoneRequiredRef = useRef(false);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Parent & Guardian Details</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Father's Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Father's Information</h3>

          <div>
            <Label htmlFor="father_name">Name *</Label>
            <Input
              id="father_name"
              {...register('father_name', { required: "Father's name is required" })}
            />
            {errors.father_name && (
              <span className="text-red-500">{errors.father_name.message as string}</span>
            )}
          </div>

          <div>
            <Label htmlFor="father_email">Email</Label>
            <Input
              id="father_email"
              type="email"
              {...register('father_email', {
                validate: (value) => {
                  if (!value || value.trim() === '') return true;
                  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value) || 'Invalid email address';
                }
              })}
            />
            {errors.father_email && (
              <span className="text-red-500">{errors.father_email.message as string}</span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1">
              <Label htmlFor="father_phone">
                Phone{fatherPhoneRequired && <span className="text-red-500"> *</span>}
              </Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="father_phone_mandatory"
                  checked={fatherPhoneRequired}
                  onChange={(e) => {
                    fatherPhoneRequiredRef.current = e.target.checked;
                    setFatherPhoneRequired(e.target.checked);
                    if (!e.target.checked) clearErrors('father_phone');
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="father_phone_mandatory" className="text-sm text-muted-foreground cursor-pointer select-none">
                  Primary
                </label>
              </div>
            </div>
            <Input
              id="father_phone"
              inputMode="numeric"
              placeholder="10-digit phone number"
              {...register('father_phone', {
                validate: (value) => {
                  if (fatherPhoneRequiredRef.current) {
                    if (!value || value.trim() === '') return 'Phone number is required';
                    if (!/^\d+$/.test(value)) return 'Phone number must contain digits only';
                    if (value.length !== 10) return `Must be exactly 10 digits — you entered ${value.length}`;
                    return true;
                  }
                  if (!value || value.trim() === '') return true;
                  if (!/^\d+$/.test(value)) return 'Phone number must contain digits only';
                  if (value.length !== 10) return `Must be exactly 10 digits — you entered ${value.length}`;
                  return true;
                }
              })}
            />
            {errors.father_phone ? (
              <span className="text-red-500 text-sm">{errors.father_phone.message as string}</span>
            ) : isValidPhone(watch('father_phone')) && (
              <span className="text-green-600 text-sm">Mobile number is valid</span>
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
            value={watch('father_salary_range') || ''}
            onChange={(val) => setValue('father_salary_range', val)}
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
              className="bg-muted"
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
              {...register('mother_name')}
            />
            {errors.mother_name && (
              <span className="text-red-500">{errors.mother_name.message as string}</span>
            )}
          </div>

          <div>
            <Label htmlFor="mother_email">Email</Label>
            <Input
              id="mother_email"
              type="email"
              {...register('mother_email', {
                validate: {
                  format: (value) => {
                    if (!value || value.trim() === '') return true;
                    return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value) || 'Invalid email address';
                  },
                  differentFromFather: (value) => {
                    if (!value || value.trim() === '') return true;
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
            <div className="flex items-center gap-3 mb-1">
              <Label htmlFor="mother_phone">
                Phone
              </Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="mother_phone_mandatory"
                  checked={motherPhoneRequired}
                  onChange={(e) => {
                    motherPhoneRequiredRef.current = e.target.checked;
                    setMotherPhoneRequired(e.target.checked);
                    if (!e.target.checked) clearErrors('mother_phone');
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="mother_phone_mandatory" className="text-sm text-muted-foreground cursor-pointer select-none">
                  Primary
                </label>
              </div>
            </div>
            <Input
              id="mother_phone"
              inputMode="numeric"
              placeholder="10-digit phone number"
              {...register('mother_phone', {
                validate: (value) => {
                  if (motherPhoneRequiredRef.current) {
                    if (!value || value.trim() === '') return 'Phone number is required';
                    if (!/^\d+$/.test(value)) return 'Phone number must contain digits only';
                    if (value.length !== 10) return `Must be exactly 10 digits — you entered ${value.length}`;
                    return true;
                  }
                  if (!value || value.trim() === '') return true;
                  if (!/^\d+$/.test(value)) return 'Phone number must contain digits only';
                  if (value.length !== 10) return `Must be exactly 10 digits — you entered ${value.length}`;
                  return true;
                }
              })}
            />
            {errors.mother_phone ? (
              <span className="text-red-500 text-sm">{errors.mother_phone.message as string}</span>
            ) : isValidPhone(watch('mother_phone')) && (
              <span className="text-green-600 text-sm">Mobile number is valid</span>
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
            value={watch('mother_salary_range') || ''}
            onChange={(val) => setValue('mother_salary_range', val)}
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
              className="bg-muted"
            />
          </div>
        </div>

        {/* Guardian's Details (Optional) */}
        <div className="space-y-4 col-span-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Guardian's Information (Optional)</h3>
            <span className="text-xs text-muted-foreground">Optional</span>
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
              <Label htmlFor="guardian_email">
                Email (Optional)
              </Label>
              <Input
                id="guardian_email"
                type="email"
                {...register('guardian_email', {
                  validate: (value) => {
                    if (!value || value.trim() === '') {
                      return watch('guardian_name') ? "Guardian's email is required" : true;
                    }
                    return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value) || 'Invalid email address';
                  }
                })}
              />
              {errors.guardian_email && (
                <span className="text-red-500">{errors.guardian_email.message as string}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <Label htmlFor="guardian_phone">
                  Phone
                </Label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="guardian_phone_mandatory"
                    checked={guardianPhoneRequired}
                    onChange={(e) => {
                      guardianPhoneRequiredRef.current = e.target.checked;
                      setGuardianPhoneRequired(e.target.checked);
                      if (!e.target.checked) clearErrors('guardian_phone');
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="guardian_phone_mandatory" className="text-sm text-muted-foreground cursor-pointer select-none">
                    Primary
                  </label>
                </div>
              </div>
              <Input
                id="guardian_phone"
                inputMode="numeric"
                placeholder="10-digit phone number"
                {...register('guardian_phone', {
                  validate: (value) => {
                    if (guardianPhoneRequiredRef.current) {
                      if (!value || value.trim() === '') return 'Phone number is required';
                      if (!/^\d+$/.test(value)) return 'Phone number must contain digits only';
                      if (value.length !== 10) return `Must be exactly 10 digits — you entered ${value.length}`;
                      return true;
                    }
                    if (!value || value.trim() === '') return true;
                    if (!/^\d+$/.test(value)) return 'Phone number must contain digits only';
                    if (value.length !== 10) return `Must be exactly 10 digits — you entered ${value.length}`;
                    return true;
                  }
                })}
              />
              {errors.guardian_phone ? (
                <span className="text-red-500 text-sm">{errors.guardian_phone.message as string}</span>
              ) : isValidPhone(watch('guardian_phone')) && (
                <span className="text-green-600 text-sm">Mobile number is valid</span>
              )}
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
                value={watch('guardian_salary_range') || ''}
                onChange={(val) => setValue('guardian_salary_range', val)}
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
