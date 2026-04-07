import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateAdmission } from '@/api/hooks/students/admissions';
import type { StudentAdmissionCreate } from '@/types/admission';
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

export interface MultiStepAdmissionFormHandle {
  submit: () => Promise<void>;
  nextStep: () => void;
  prevStep: () => void;
  currentStep: number;
  isLoading: boolean;
}

const steps = [
  { id: 'academic', title: 'Academic Details', component: AcademicStepForm },
  { id: 'student', title: 'Student Details', component: StudentStepForm },
  { id: 'parents', title: 'Parent Details', component: ParentsStepForm },
  { id: 'address', title: 'Address Details', component: AddressStepForm },
  { id: 'previous-school', title: 'Previous School', component: PreviousSchoolStepForm },
  { id: 'summary', title: 'Review & Submit', component: SummaryStepForm },
];

const MultiStepAdmissionFormComponent: React.FC<MultiStepAdmissionFormProps> = ({ onComplete }, ref) => {
  const [currentStep, setCurrentStep] = useState(0);

  const createAdmission = useCreateAdmission();
  const selectedAcademicYearId = useAcademicYearStore((state) => state.selectedAcademicYearId);
  const submitRef = useRef<() => Promise<void>>();

  const methods = useForm<StudentAdmissionCreate>({
    defaultValues: {
      admission_date: new Date().toISOString().split('T')[0],
      admission_type: 'non_primary',
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

  const { handleSubmit, trigger } = methods;

  const nextStepFn = async () => {
    // Define ONLY required fields for each step
    const stepFields = {
      0: ['admission_date'], // Academic Details
      1: ['student_first_name', 'student_last_name', 'student_date_of_birth', 'student_gender'], // Student Details - only required fields
      2: ['father_name', 'father_email', 'mother_name', 'mother_email'], // Parent Details - only required fields
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

  const prevStepFn = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Expose submit and navigation methods via ref
  useImperativeHandle(ref, () => ({
    submit: async () => {
      console.log('📤 Ref submit called');
      await handleSubmit(onSubmit)();
    },
    nextStep: nextStepFn,
    prevStep: prevStepFn,
    currentStep,
    isLoading: createAdmission.status === 'pending'
  }), [handleSubmit, onSubmit, currentStep, createAdmission.status, nextStepFn, prevStepFn]);

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
        'Admission Date': data.admission_date,
        'Student First Name': data.student_first_name,
        'Student Last Name': data.student_last_name,
        'Student Date of Birth': data.student_date_of_birth,
        'Student Gender': data.student_gender,
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
          father: {
            name: data.father_name || '',
            email: data.father_email || '',
            phone: data.father_phone || '',                  // Required - send empty string if not provided
            occupation: data.father_occupation || '',        // Required - send empty string if not provided
            salary_range: data.father_salary_range || '',
            aadhar_number: data.father_aadhar_number || '',  // Required - send empty string if not provided
            gender: data.father_gender || '',
            relation_to_student: data.father_relation_to_student || 'Father',
          },
          mother: {
            name: data.mother_name || '',
            email: data.mother_email || '',
            phone: data.mother_phone || '',                  // Required - send empty string if not provided
            occupation: data.mother_occupation || '',        // Required - send empty string if not provided
            salary_range: data.mother_salary_range || '',
            aadhar_number: data.mother_aadhar_number || '',  // Required - send empty string if not provided
            gender: data.mother_gender || '',
            relation_to_student: data.mother_relation_to_student || 'Mother',
          },
        },
      };

      // Log the complete payload before sending
      console.log('===== PAYLOAD TO API =====');
      console.log('Payload structure:', JSON.stringify(cleanedData, null, 2));
      console.log('=========================');

      const result = await createAdmission.mutateAsync(cleanedData);
      console.log('===== SUCCESS =====');
      console.log('API Response:', result);

      // Wait a moment for the table to refetch before closing the dialog
      await new Promise(resolve => setTimeout(resolve, 500));
      onComplete();
    } catch (error: any) {
      console.error('===== ERROR =====');
      console.error('Full error object:', error);
      console.error('Error response:', error?.response);
      console.error('Error data:', error?.response?.data);

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

  // Debug: Log current step and mutation status
  console.log('Current Step:', currentStep, '/', steps.length - 1);
  console.log('Mutation Status:', createAdmission.status);
  console.log('On Final Step (Summary):', currentStep === steps.length - 1);

  return (
    <FormProvider {...methods}>
      <form className="space-y-6">
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
                <step.component />
              </div>
            ))}
          </CardContent>
        </Card>
      </form>
    </FormProvider>
  );
};

export default forwardRef(MultiStepAdmissionFormComponent);