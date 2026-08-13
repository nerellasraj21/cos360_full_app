import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { CasteDropdown } from '@/components/dropdown/CasteDropdown';
import { SubCasteDropdown } from '@/components/dropdown/SubCasteDropdown';
import { InfiniteScrollDropdown } from '@/components/dropdown/InfiniteScrollDropdown';
import type { DropdownOption } from '@/types/dropdown';
import { getNextAdmissionNumber } from '@/api/students/admissions';
import { useAdmissionTypesDropdown } from '@/api/hooks/students/admissions';
import { feeCollectionApi } from '@/api/fee/collection';

const GENDER_OPTIONS: DropdownOption[] = [
  { id: 'M', value: 'M', label: 'Male' },
  { id: 'F', value: 'F', label: 'Female' },
  { id: 'O', value: 'O', label: 'Other' },
];

const STUDENT_TYPE_OPTIONS: DropdownOption[] = [
  { id: 'not_primary', value: 'not_primary', label: 'Day Scholar' },
  { id: 'primary', value: 'primary', label: 'Hostel' },
];

const MOTHER_TONGUE_OPTIONS: DropdownOption[] = [
  { id: 'Telugu', value: 'Telugu', label: 'Telugu' },
  { id: 'Hindi', value: 'Hindi', label: 'Hindi' },
  { id: 'English', value: 'English', label: 'English' },
  { id: 'Tamil', value: 'Tamil', label: 'Tamil' },
  { id: 'Malayalam', value: 'Malayalam', label: 'Malayalam' },
  { id: 'Kannada', value: 'Kannada', label: 'Kannada' },
  { id: 'Marathi', value: 'Marathi', label: 'Marathi' },
  { id: 'Bengali', value: 'Bengali', label: 'Bengali' },
  { id: 'Gujarati', value: 'Gujarati', label: 'Gujarati' },
  { id: 'Urdu', value: 'Urdu', label: 'Urdu' },
  { id: 'Others', value: 'Others', label: 'Others' },
];

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

// Exact-match existence check against the search endpoint (no form side-effects)
const admissionNumberExists = async (value: string): Promise<boolean> => {
  try {
    const results = await feeCollectionApi.searchStudents({ q: value });
    return results.some(
      (r) => r.admission_number.toLowerCase() === value.toLowerCase()
    );
  } catch {
    return false; // network error — assume free; backend will catch on submit
  }
};

// Increments a purely numeric admission number, preserving zero-padding/length.
// Non-numeric formats are returned unchanged since we can't safely bump them.
const incrementAdmissionNumber = (value: string): string => {
  if (!/^\d+$/.test(value)) return value;
  const next = (BigInt(value) + BigInt(1)).toString();
  return next.padStart(value.length, '0');
};

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
        setError('admission_number', { message: 'Admission number already exists. Please use a different number.' });
      } else {
        clearErrors('admission_number');
      }
    } catch {
      // Network error — silently skip; server will catch on submit
    } finally {
      setIsCheckingNum(false);
    }
  };

  // Derive admission type from the AcademicStepForm field on this same step.
  // Match on the backend label since t.value is the API-supplied identifier.
  const admissionTypeValue = watch('admission_type');
  const { data: admissionTypes = [] } = useAdmissionTypesDropdown();
  const selectedAdmissionType = admissionTypes.find(t => t.value === admissionTypeValue);
  const apiAdmissionType: 'pre_primary' | 'regular' =
    selectedAdmissionType?.label === 'Pre Primary Admission' ? 'pre_primary' : 'regular';

  const { data: admissionHint } = useQuery({
    queryKey: ['next-admission-number', apiAdmissionType],
    queryFn: () => getNextAdmissionNumber(apiAdmissionType),
    staleTime: 60 * 1000,
  });

  const { getValues } = useFormContext();

  const [verifiedNextNumber, setVerifiedNextNumber] = useState<string | null>(null);
  const [isVerifyingNextNumber, setIsVerifyingNextNumber] = useState(false);

  // Verify the backend's suggested number against existing students; if it's
  // already taken, keep incrementing until a free one is found, then auto-fill
  // it when the field is empty.
  useEffect(() => {
    if (!admissionHint?.next_number) return;
    let cancelled = false;

    (async () => {
      setIsVerifyingNextNumber(true);
      let candidate = admissionHint.next_number;
      for (let attempts = 0; attempts < 50; attempts++) {
        const exists = await admissionNumberExists(candidate);
        if (!exists) break;
        candidate = incrementAdmissionNumber(candidate);
      }
      if (cancelled) return;
      setVerifiedNextNumber(candidate);
      const current = getValues('admission_number');
      if (!current || current.trim() === '') {
        setValue('admission_number', candidate);
      }
      setIsVerifyingNextNumber(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [admissionHint?.next_number, getValues, setValue]);

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
            Admission Number
          </Label>
          <div className="flex gap-2">
            <Input
              id="admission_number"
              {...admissionNumberField}
              onBlur={async (e) => {
                admissionNumberField.onBlur(e);
                await checkAdmissionNumberExists(e.target.value);
              }}
              placeholder={apiAdmissionType === 'primary' ? 'e.g. 20260001' : 'e.g. 2026001'}
              className="flex-1"
            />
            {(isCheckingNum || isVerifyingNextNumber) && (
              <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />
            )}
          </div>
          {errors.admission_number ? (
            <span className="text-red-500 text-sm">{errors.admission_number.message as string}</span>
          ) : verifiedNextNumber && (
            <p className="text-xs text-muted-foreground mt-1">
              Next available: <strong>{verifiedNextNumber}</strong>
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="student_first_name">First Name <span className="text-red-500">*</span></Label>
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
            {...register('student_last_name')}
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
            {...register('student_date_of_birth')}
          />
          {errors.student_date_of_birth && (
            <span className="text-red-500">{errors.student_date_of_birth.message as string}</span>
          )}
        </div>

        <div>
          <Label htmlFor="student_gender">Gender</Label>
          <input type="hidden" {...register('student_gender')} />
          <InfiniteScrollDropdown
            data={GENDER_OPTIONS}
            value={watch('student_gender') || ''}
            onChange={(val) => setValue('student_gender', val as string)}
            placeholder="Select Gender"
            clearable={false}
          />
        </div>

        <div>
          <Label htmlFor="student_is_primary">Student Type</Label>
          <InfiniteScrollDropdown
            data={STUDENT_TYPE_OPTIONS}
            value={watch('student_is_primary') || 'not_primary'}
            onChange={(val) => setValue('student_is_primary', val as string)}
            placeholder="Select Student Type"
            clearable={false}
          />
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
          <InfiniteScrollDropdown
            data={MOTHER_TONGUE_OPTIONS}
            value={watch('student_mother_tongue') || 'Telugu'}
            onChange={(val) => setValue('student_mother_tongue', val as string)}
            placeholder="Select Mother Tongue"
            clearable={false}
          />
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
