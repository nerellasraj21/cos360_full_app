import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { CasteDropdown } from '@/components/dropdown/CasteDropdown';
import { SubCasteDropdown } from '@/components/dropdown/SubCasteDropdown';
import { getNextAdmissionNumber } from '@/api/students/admissions';
import { feeCollectionApi } from '@/api/fee/collection';

// Optional numeric field that, if entered, must be exactly `length` digits.
// Returns a clear message indicating whether the number is too short or too long.
const makeExactDigitsValidator = (label: string, length: number) =>
  (value?: string): true | string => {
    if (!value || value.trim() === '') return true; // optional
    if (!/^\d+$/.test(value)) return `${label} must contain digits only`;
    if (value.length < length) return `${label} is less than ${length} digits — you entered ${value.length}. Please enter exactly ${length} digits`;
    if (value.length > length) return `${label} exceeds ${length} digits — you entered ${value.length}. Please enter exactly ${length} digits`;
    return true;
  };

// True only when the value is exactly `length` digits (used to show the green "valid" hint).
const isExactDigits = (value: string | undefined, length: number): boolean =>
  !!value && /^\d+$/.test(value) && value.length === length;

const validateAadharDigits = makeExactDigitsValidator('Aadhar number', 12);
const validateApaarDigits = makeExactDigitsValidator('APAAR number', 12);

export const StudentStepForm = () => {
  const { register, setValue, setError, clearErrors, watch, formState: { errors } } = useFormContext();
  const [selectedCasteId, setSelectedCasteId] = useState<string | undefined>();
  const [isCheckingNum, setIsCheckingNum] = useState(false);

  // On-blur duplicate check against the search endpoint
  const checkAdmissionNumberExists = async (value: string) => {
    if (!value.trim()) return;
    setIsCheckingNum(true);
    try {
      const results = await feeCollectionApi.searchStudents({ q: value.trim() });
      const duplicate = results.some(
        (r) => r.admission_number.toLowerCase() === value.trim().toLowerCase()
      );
      if (duplicate) {
        setError('admission_number', { message: 'Admission number already exists. It must be unique.' });
      } else {
        clearErrors('admission_number');
      }
    } catch {
      // Network error — silently skip; server will catch on submit
    } finally {
      setIsCheckingNum(false);
    }
  };

  // Watch primary status for admission number hint
  const isPrimary = watch('student_is_primary') === 'primary';
  const admissionType = isPrimary ? 'primary' : 'non_primary';

  const { data: admissionHint } = useQuery({
    queryKey: ['next-admission-number', admissionType],
    queryFn: () => getNextAdmissionNumber(admissionType),
    staleTime: 60 * 1000,
  });

  // Register admission_number once — override onBlur to chain duplicate check
  const admissionNumberField = register('admission_number', { required: 'Admission number is required' });

  // Watch caste field
  const casteId = watch('caste_id');

  // Sync state with form field
  useEffect(() => {
    setSelectedCasteId(casteId || undefined);
  }, [casteId]);

  // Clear sub-caste when caste changes
  useEffect(() => {
    if (casteId) {
      setValue('sub_caste_id', '');
    }
  }, [selectedCasteId, setValue]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Student Details</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Admission Number — spans full width */}
        <div className="col-span-2">
          <Label htmlFor="admission_number">
            Admission Number <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="admission_number"
              {...admissionNumberField}
              onBlur={async (e) => {
                admissionNumberField.onBlur(e);
                await checkAdmissionNumberExists(e.target.value);
              }}
              placeholder={isPrimary ? 'e.g. P2025001' : 'e.g. NP2025001'}
              className="flex-1"
            />
            {isCheckingNum && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
            {!isCheckingNum && admissionHint?.next_number && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => setValue('admission_number', admissionHint.next_number)}
              >
                Use suggested
              </Button>
            )}
          </div>
          {errors.admission_number ? (
            <span className="text-red-500 text-sm">{errors.admission_number.message as string}</span>
          ) : admissionHint && (
            <p className="text-xs text-muted-foreground mt-1">
              {isPrimary
                ? `Format: ${admissionHint.format} — e.g. ${admissionHint.next_number}`
                : `Enter as per government rules — e.g. ${admissionHint.next_number}`}
            </p>
          )}
        </div>

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
          <select
            id="student_mother_tongue"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('student_mother_tongue')}
          >
            <option value="Telugu">Telugu</option>
            <option value="Hindi">Hindi</option>
            <option value="English">English</option>
            <option value="Tamil">Tamil</option>
            <option value="Malayalam">Malayalam</option>
            <option value="Kannada">Kannada</option>
            <option value="Marathi">Marathi</option>
            <option value="Bengali">Bengali</option>
            <option value="Gujarati">Gujarati</option>
            <option value="Urdu">Urdu</option>
            <option value="Others">Others</option>
          </select>
        </div>

        <div>
          <Label htmlFor="student_aadhar_number">Aadhar Number (Optional)</Label>
          <Input
            id="student_aadhar_number"
            {...register('student_aadhar_number', {
              validate: validateAadharDigits
            })}
          />
          {errors.student_aadhar_number ? (
            <span className="text-red-500 text-sm">{errors.student_aadhar_number.message as string}</span>
          ) : isExactDigits(watch('student_aadhar_number'), 12) && (
            <span className="text-green-600 text-sm">Aadhar number is valid</span>
          )}
        </div>

        <div>
          <Label htmlFor="student_apaar_number">APAAR Number (Optional)</Label>
          <Input
            id="student_apaar_number"
            {...register('student_apaar_number', {
              validate: validateApaarDigits
            })}
          />
          {errors.student_apaar_number ? (
            <span className="text-red-500 text-sm">{errors.student_apaar_number.message as string}</span>
          ) : isExactDigits(watch('student_apaar_number'), 12) && (
            <span className="text-green-600 text-sm">APAAR number is valid</span>
          )}
        </div>

        <div>
          <Label htmlFor="primary_phone">
            Primary Phone <span className="text-red-500">*</span>
          </Label>
          <Input
            id="primary_phone"
            inputMode="numeric"
            {...register('primary_phone', {
              required: 'Primary phone is required',
              validate: makeExactDigitsValidator('Primary phone', 10),
            })}
          />
          {errors.primary_phone ? (
            <span className="text-red-500 text-sm">{errors.primary_phone.message as string}</span>
          ) : isExactDigits(watch('primary_phone'), 10) && (
            <span className="text-green-600 text-sm">Primary phone is valid</span>
          )}
        </div>

        <CasteDropdown
          id="caste_id"
          label="Caste (Optional)"
          value={selectedCasteId}
          onChange={(value) => {
            setValue('caste_id', value || '');
            setSelectedCasteId(value || undefined);
          }}
        />

        <SubCasteDropdown
          id="sub_caste_id"
          label="Sub-Caste (Optional)"
          casteId={selectedCasteId}
          value={watch('sub_caste_id')}
          onChange={(value) => setValue('sub_caste_id', value || '')}
        />

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
