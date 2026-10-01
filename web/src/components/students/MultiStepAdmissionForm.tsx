import React, { useState, useRef, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogFooter } from '@/components/ui/dialog';
import { useCreateAdmission, useUploadStudentPhoto } from '@/api/hooks/students/admissions';
import type { StudentAdmissionCreate } from '@/types/admission';
import { UserCircle, X, Plus, Loader2 } from 'lucide-react';
import { config } from '@/lib/config';
import { AcademicAndStudentStepForm } from './admission-steps/AcademicAndStudentStepForm';
import { ParentsStepForm } from './admission-steps/ParentsStepForm';
import { AddressStepForm } from './admission-steps/AddressStepForm';
import { PreviousSchoolStepForm } from './admission-steps/PreviousSchoolStepForm';
import { SummaryStepForm } from './admission-steps/SummaryStepForm';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MultiStepAdmissionFormProps {
  onComplete: () => void;
}

const steps = [
  { id: 'academic-student', title: 'Student & Academic Details', component: AcademicAndStudentStepForm },
  { id: 'parents', title: 'Parent Details', component: ParentsStepForm },
  { id: 'address', title: 'Address Details', component: AddressStepForm },
  { id: 'previous-school', title: 'Previous School', component: PreviousSchoolStepForm },
  { id: 'summary', title: 'Review & Submit', component: SummaryStepForm },
];

const FIELD_LABELS: Record<string, string> = {
  admission_date: 'Admission Date',
  admitted_class_id: 'Joining Class',
  admitted_section_id: 'Joining Section',
  current_class_id: 'Current Class',
  current_section_id: 'Current Section',
  admission_number: 'Admission Number',
  student_first_name: 'Student First Name',
  student_last_name: 'Student Last Name',
  student_date_of_birth: 'Student Date of Birth',
  student_gender: 'Student Gender',
  student_aadhar_number: 'Student Aadhar Number',
  student_apaar_number: 'Student Apaar Number',
  father_name: "Father's Name",
  father_email: "Father's Email",
  mother_name: "Mother's Name",
  mother_email: "Mother's Email",
  father_phone: "Father's Phone",
  mother_phone: "Mother's Phone",
  guardian_phone: "Guardian's Phone",
  guardian_email: "Guardian's Email",
  address_line1: 'Address Line 1',
  city: 'City',
  state_id: 'State',
};

const MultiStepAdmissionForm: React.FC<MultiStepAdmissionFormProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepMissingFields, setStepMissingFields] = useState<string[]>([]);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep]);

  const mediaBase = config.api.baseURL.replace(/\/api\/v\d+$/, '');
  const createAdmission = useCreateAdmission();
  const uploadPhotoMutation = useUploadStudentPhoto();
  const selectedAcademicYearId = useAcademicYearStore((state) => state.selectedAcademicYearId);

  const methods = useForm<StudentAdmissionCreate>({
    mode: 'onChange', // validate live as the user types (show errors immediately)
    defaultValues: {
      admission_number: '',
      admission_date: new Date().toISOString().split('T')[0],
      admission_type: 'regular',
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

  const { trigger, formState } = methods;

  const nextStep = async () => {
    const stepFields = {
      0: ['admission_date', 'admitted_class_id', 'admission_number', 'student_first_name', 'student_aadhar_number', 'student_apaar_number'],
      1: ['father_name', 'father_phone', 'mother_phone', 'guardian_phone', 'guardian_email'],
      2: ['address_line1'],
      3: [],
      4: []
    };

    const fieldsToValidate = stepFields[currentStep as keyof typeof stepFields] || [];
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setStepMissingFields([]);
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } else {
      const invalidFields = fieldsToValidate.filter((name) => formState.errors[name as keyof typeof formState.errors]);
      setStepMissingFields(invalidFields.map((name) => FIELD_LABELS[name] || name));
    }
  };

  const prevStep = () => {
    setStepMissingFields([]);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = async (data: StudentAdmissionCreate) => {
    try {
      // Get the CURRENT academic year from store at submission time
      const currentAcademicYearId = useAcademicYearStore.getState().selectedAcademicYearId;


      // Validate academic year is selected
      if (!currentAcademicYearId || currentAcademicYearId.trim() === '') {
        toast.error('Academic Year is required. Please select an academic year from the header dropdown.');
        return;
      }

      // Validate required fields before submission
      const requiredFields: Record<string, { value: string | undefined; step: number }> = {
        'Academic Year':         { value: currentAcademicYearId,      step: 0 },
        'Admission Number':      { value: data.admission_number,      step: 0 },
        'Joining Class':         { value: data.admitted_class_id,     step: 0 },
        'Student First Name':    { value: data.student_first_name,    step: 0 },
        "Father's Name":         { value: data.father_name,           step: 1 },
        "Father's Phone":        { value: data.father_phone,          step: 1 },
        'Address Line 1':        { value: data.address_line1,         step: 2 },
      };

      const missingEntries = Object.entries(requiredFields).filter(([, { value }]) =>
        !value || (typeof value === 'string' && value.trim() === '')
      );

      if (missingEntries.length > 0) {
        const missingNames = missingEntries.map(([name]) => name);
        const earliestStep = Math.min(...missingEntries.map(([, { step }]) => step));
        setStepMissingFields(missingNames);
        setCurrentStep(earliestStep);
        toast.error(`Please fill in required fields: ${missingNames.join(', ')}`);
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
        admission_type: data.admission_type || 'regular',
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
          aadhar_number: data.student_aadhar_number || undefined,
          apaar_number: data.student_apaar_number || undefined,
          caste: data.caste_id || undefined,
          sub_caste: data.sub_caste_id || undefined,
          community: data.student_community || undefined,
          identification_marks: data.student_identification_marks || undefined,
          primary_phone: data.primary_phone || null,
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


      const result = await createAdmission.mutateAsync(cleanedData);

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

      // Duplicate admission number — set field error and return to Student Details step
      // Note: handleApiError in the API layer converts Axios errors to plain Error objects,
      // so we check error.message (which contains the backend's detail string) not error.response.
      const isDuplicate =
        typeof error?.message === 'string' &&
        error.message.toLowerCase().includes('is already in use');

      if (isDuplicate) {
        methods.setError('admission_number', {
          message: 'Admission number already exists. Please use a different number.',
        });
        setCurrentStep(0);
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
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{steps[currentStep].title}</span>
                <span className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </CardTitle>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                ></div>
              </div>
            </CardHeader>
            <CardContent>
              {stepMissingFields.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please fill in the required fields before continuing: {stepMissingFields.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
              {steps.map((step, index) => (
                <div key={step.id} style={{ display: index === currentStep ? 'block' : 'none' }}>
                  {/* Photo picker shown on Academic & Student Details step */}
                  {index === 0 && (
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