import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogFooter } from '@/components/ui/dialog';
import { useCreateAdmission, useUploadStudentPhoto } from '@/api/hooks/students/admissions';
import type { StudentAdmissionCreate } from '@/types/admission';
import { UserCircle, X, Plus, Loader2 } from 'lucide-react';
import { config } from '@/lib/config';
import { AcademicStepForm } from './admission-steps/AcademicStepForm';
import { StudentStepForm } from './admission-steps/StudentStepForm';
import { ParentsStepForm } from './admission-steps/ParentsStepForm';
import { AddressStepForm } from './admission-steps/AddressStepForm';
import { PreviousSchoolStepForm } from './admission-steps/PreviousSchoolStepForm';
import { SummaryStepForm } from './admission-steps/SummaryStepForm';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { toast } from 'sonner';

interface MultiStepAdmissionFormProps {
  onComplete: () => void;
}

const steps = [
  { id: 'academic', title: 'Academic Details', component: AcademicStepForm },
  { id: 'student', title: 'Student Details', component: StudentStepForm },
  { id: 'parents', title: 'Parent Details', component: ParentsStepForm },
  { id: 'address', title: 'Address Details', component: AddressStepForm },
  { id: 'previous-school', title: 'Previous School', component: PreviousSchoolStepForm },
  { id: 'summary', title: 'Review & Submit', component: SummaryStepForm },
];

const MultiStepAdmissionForm: React.FC<MultiStepAdmissionFormProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const mediaBase = config.api.baseURL.replace(/\/api\/v\d+$/, '');
  const createAdmission = useCreateAdmission();
  const uploadPhotoMutation = useUploadStudentPhoto();
  const selectedAcademicYearId = useAcademicYearStore((state) => state.selectedAcademicYearId);

  const methods = useForm<StudentAdmissionCreate>({
    mode: 'onChange', // validate live as the user types (show errors immediately)
    defaultValues: {
      admission_number: '',
      admission_date: new Date().toISOString().split('T')[0],
      admission_type: 'non_primary',
      primary_phone: '',
      academic_year_id: selectedAcademicYearId || '',
      admitted_academic_year_id: selectedAcademicYearId || '',
      admitted_class_id: '',
      admitted_section_id: '',
      current_class_id: '',
      current_section_id: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state_id: '',
      district_id: '',
      mandal_id: '',
      pincode: '',
      is_previous_school: false,
      previous_school_name: '',
      previous_class: '',
      previous_school_remark: '',
      // Flat student fields
      student_first_name: '',
      student_last_name: '',
      student_date_of_birth: '',
      student_gender: '',
      student_is_primary: 'not_primary',
      student_nationality: 'Indian',
      student_mother_tongue: 'Telugu',
      student_aadhar_number: '',
      student_apaar_number: '',
      caste_id: '',
      sub_caste_id: '',
      student_community: '',
      student_identification_marks: '',
      father_name: '',
      father_email: '',
      father_phone: '',
      father_occupation: '',
      father_salary_range: '',
      father_aadhar_number: '',
      father_gender: '',
      father_relation_to_student: 'Father',
      mother_name: '',
      mother_email: '',
      mother_phone: '',
      mother_occupation: '',
      mother_salary_range: '',
      mother_aadhar_number: '',
      mother_gender: '',
      mother_relation_to_student: 'Mother',
      // Guardian details (optional)
      guardian_name: '',
      guardian_email: '',
      guardian_phone: '',
      guardian_occupation: '',
      guardian_salary_range: '',
      guardian_aadhar_number: '',
      guardian_gender: '',
      guardian_relation_to_student: 'Guardian',
      // Keep nested structure for backward compatibility
      student: {
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        is_primary: 'not_primary',
        nationality: 'Indian',
        mother_tongue: 'Telugu',
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

  const { trigger } = methods;

  const nextStep = async () => {
    // Define ONLY required fields for each step
    const stepFields = {
      0: ['admission_date'], // Academic Details
      1: ['admission_number', 'student_first_name', 'student_last_name', 'student_date_of_birth', 'student_gender', 'student_aadhar_number', 'student_apaar_number', 'primary_phone'], // Student Details
      2: ['father_name', 'father_email', 'mother_name', 'mother_email', 'father_phone', 'mother_phone', 'guardian_phone'], // Parent Details - required fields + phone format (10 digits)
      3: ['address_line1', 'city', 'state_id'], // Address Details - including required state
      4: [], // Previous School (no required fields)
      5: [] // Summary (no validation needed)
    };

    const fieldsToValidate = stepFields[currentStep as keyof typeof stepFields] || [];
    console.log(`Step ${currentStep} validation - fields to validate:`, fieldsToValidate);
    const isValid = await trigger(fieldsToValidate as any);
    console.log(`Step ${currentStep} validation result:`, isValid);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = async (data: StudentAdmissionCreate) => {
    try {
      // Get the CURRENT academic year from store at submission time
      const currentAcademicYearId = useAcademicYearStore.getState().selectedAcademicYearId;

      // Log ALL form data for debugging
      console.log('===== FORM SUBMISSION STARTED =====');
      console.log('Complete form data:', data);
      console.log('Academic Year from store (at mount):', selectedAcademicYearId);
      console.log('Academic Year from store (current):', currentAcademicYearId);

      // Validate academic year is selected
      if (!currentAcademicYearId || currentAcademicYearId.trim() === '') {
        toast.error('Academic Year is required. Please select an academic year from the header dropdown.');
        return;
      }

      // Validate required fields before submission
      const requiredFields = {
        'Academic Year': currentAcademicYearId,
        'Admission Number': data.admission_number,
        'Admission Date': data.admission_date,
        'Student First Name': data.student_first_name,
        'Student Last Name': data.student_last_name,
        'Student Date of Birth': data.student_date_of_birth,
        'Student Gender': data.student_gender,
        'Primary Phone': data.primary_phone,
        "Father's Name": data.father_name,
        "Father's Email": data.father_email,
        "Mother's Name": data.mother_name,
        "Mother's Email": data.mother_email,
        'Address Line 1': data.address_line1,
        'City': data.city,
        'State': data.state_id,
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => {
          if (!value) return true;
          if (typeof value === 'string' && value.trim() === '') return true;
          return false;
        })
        .map(([fieldName]) => fieldName);

      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Validate parent emails are different
      if (data.father_email && data.mother_email && data.father_email === data.mother_email) {
        toast.error("Father's and Mother's email addresses must be different");
        return;
      }

      // Restructure flat form data into nested API format
      // Use current academic year from store
      const cleanedData = {
        admission_number: data.admission_number,
        admission_date: data.admission_date,
        admission_type: data.admission_type || 'non_primary',
        academic_year_id: currentAcademicYearId,
        admitted_academic_year_id: currentAcademicYearId,
        admitted_class_id: data.admitted_class_id || undefined,
        admitted_section_id: data.admitted_section_id || undefined,
        current_class_id: data.current_class_id || undefined,
        current_section_id: data.current_section_id || undefined,
        address_line1: data.address_line1,
        address_line2: data.address_line2 || '',
        city: data.city,
        state: data.state_id,
        state_id: data.state_id || undefined,
        district_id: data.district_id || undefined,
        mandal_id: data.mandal_id || undefined,
        pincode: data.pincode || undefined,
        is_previous_school: data.is_previous_school || false,
        previous_school_name: data.is_previous_school ? (data.previous_school_name || undefined) : 'NA',
        previous_class: data.is_previous_school ? (data.previous_class || undefined) : 'NA',
        previous_school_remark: data.is_previous_school ? (data.previous_school_remark || undefined) : 'NA',
        student: {
          first_name: data.student_first_name ?? '',
          last_name: data.student_last_name ?? '',
          date_of_birth: data.student_date_of_birth ?? '',
          gender: data.student_gender ?? '',
          is_primary: data.student_is_primary || 'not_primary',
          nationality: data.student_nationality || 'Indian',
          mother_tongue: data.student_mother_tongue || 'Telugu',
          aadhar_number: data.student_aadhar_number || '',  // Required - send empty string if not provided
          apaar_number: data.student_apaar_number || '',     // Required - send empty string if not provided
          caste: data.caste_id || '',                        // Field name is 'caste' not 'caste_id'
          sub_caste: data.sub_caste_id || '',                // Field name is 'sub_caste' not 'sub_caste_id'
          community: data.student_community || '',           // Required - send empty string if not provided
          identification_marks: data.student_identification_marks || '',  // Required - send empty string if not provided
          primary_phone: data.primary_phone || '',  // Primary contact phone (required in the form, 10 digits)
          father: {
            name: data.father_name || '',
            email: data.father_email || undefined,
            phone: data.father_phone || undefined,
            occupation: data.father_occupation || undefined,
            salary_range: data.father_salary_range || undefined,
            aadhar_number: data.father_aadhar_number || undefined,
            gender: data.father_gender || undefined,
            relation_to_student: 'Father' as const,
          },
          mother: {
            name: data.mother_name || '',
            email: data.mother_email || undefined,
            phone: data.mother_phone || undefined,
            occupation: data.mother_occupation || undefined,
            salary_range: data.mother_salary_range || undefined,
            aadhar_number: data.mother_aadhar_number || undefined,
            gender: data.mother_gender || undefined,
            relation_to_student: 'Mother' as const,
          },
          ...(data.guardian_name ? {
            guardian: {
              name: data.guardian_name,
              email: data.guardian_email || undefined,
              phone: data.guardian_phone || undefined,
              occupation: data.guardian_occupation || undefined,
              salary_range: data.guardian_salary_range || undefined,
              aadhar_number: data.guardian_aadhar_number || undefined,
              gender: data.guardian_gender || undefined,
              relation_to_student: 'Guardian' as const,
            }
          } : {}),
        },
      };

      // Log the complete payload before sending
      console.log('===== PAYLOAD TO API =====');
      console.log('Payload structure:', JSON.stringify(cleanedData, null, 2));
      console.log('=========================');

      const result = await createAdmission.mutateAsync(cleanedData);
      console.log('===== SUCCESS =====');
      console.log('API Response:', result);

      // Upload pending photo if one was selected before creation
      if (pendingPhotoFile) {
        const studentId = result.student?.id;
        if (studentId) {
          try {
            await uploadPhotoMutation.mutateAsync({ studentId, file: pendingPhotoFile });
          } catch {
            // Photo upload failed non-fatally — admission was already created
          }
        }
      }

      // Wait a moment for the table to refetch before closing the dialog
      await new Promise(resolve => setTimeout(resolve, 500));
      onComplete();
    } catch (error: any) {
      console.error('===== ERROR =====');
      console.error('Full error object:', error);
      console.error('Error response:', error?.response);
      console.error('Error data:', error?.response?.data);

      // Duplicate admission number — set field error and return to Student Details step
      // Note: handleApiError in the API layer converts Axios errors to plain Error objects,
      // so we check error.message (which contains the backend's detail string) not error.response.
      const isDuplicate =
        typeof error?.message === 'string' &&
        error.message.toLowerCase().includes('is already in use');

      if (isDuplicate) {
        methods.setError('admission_number', {
          message: 'Admission number already exists. It must be unique.',
        });
        setCurrentStep(1);
        return;
      }

      // Show detailed error message
      let errorMessage = 'Failed to create admission: ';

      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage += detail.map((err: any) => {
            const loc = err.loc?.join('.') || 'unknown';
            return `${loc}: ${err.msg}`;
          }).join(' | ');
        } else if (typeof detail === 'string') {
          errorMessage += detail;
        } else {
          errorMessage += JSON.stringify(detail);
        }
      } else {
        errorMessage += error.message || 'Unknown error';
      }

      toast.error(errorMessage);
    }
  };

  const handleCreateAdmissionClick = () => {
    if (currentStep !== steps.length - 1) return;
    // Bypass react-hook-form's global validation (which incorrectly blocks
    // optional fields with pattern rules). Each step already validated its
    // required fields via nextStep(). onSubmit() has its own required-field
    // checks and will show toast errors for anything missing.
    const values = methods.getValues();
    onSubmit(values as StudentAdmissionCreate);
  };

  return (
    <FormProvider {...methods}>
      <div
        className="flex flex-col flex-1 min-h-0"
        onKeyDown={(e) => {
          // Defense in depth: swallow Enter inside inputs so nothing can
          // accidentally trigger an implicit form submission.
          const target = e.target as HTMLElement;
          if (e.key === 'Enter' && target.tagName === 'INPUT') {
            e.preventDefault();
          }
        }}
      >
        <div className="flex-1 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{steps[currentStep].title}</span>
                <span className="text-sm text-gray-500">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </CardTitle>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                ></div>
              </div>
            </CardHeader>
            <CardContent>
              {steps.map((step, index) => (
                <div key={step.id} style={{ display: index === currentStep ? 'block' : 'none' }}>
                  {/* Photo picker shown on Student Details step */}
                  {index === 1 && (
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        {photoPreviewUrl ? (
                          <img
                            src={photoPreviewUrl}
                            alt="Student photo preview"
                            className="h-20 w-20 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                            <UserCircle className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        {pendingPhotoFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setPendingPhotoFile(null);
                              setPhotoPreviewUrl(null);
                            }}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80"
                            title="Remove photo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="block text-sm font-medium text-foreground">
                          Student Photo <span className="text-muted-foreground font-normal">(Optional)</span>
                        </label>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error('Photo must be under 2 MB');
                                e.target.value = '';
                                return;
                              }
                              setPendingPhotoFile(file);
                              setPhotoPreviewUrl(URL.createObjectURL(file));
                              e.target.value = '';
                            }}
                          />
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                            <Plus className="h-3.5 w-3.5" />
                            {pendingPhotoFile ? 'Change photo' : 'Choose photo'}
                          </span>
                        </label>
                        <span className="text-xs text-muted-foreground">JPG, PNG or WebP · max 2 MB</span>
                      </div>
                    </div>
                  )}
                  <step.component />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex-shrink-0 border-t pt-4 mt-2">
        <DialogFooter className="!justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onComplete}
            >
              Cancel
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button
                id="create-admission-submit"
                type="button"
                onClick={handleCreateAdmissionClick}
                disabled={createAdmission.isPending}
              >
                {createAdmission.isPending ? 'Creating...' : 'Create Admission'}
              </Button>
            )}
          </div>
        </DialogFooter>
        </div>
      </div>
    </FormProvider>
  );
};

export default MultiStepAdmissionForm;