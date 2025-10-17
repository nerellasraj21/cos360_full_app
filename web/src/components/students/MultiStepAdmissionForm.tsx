import React, { useState } from 'react';
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
import { useAcademicYearsDropdown } from '@/api/hooks/masters/academicyears';

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

  const createAdmission = useCreateAdmission();
  const { data: academicYears = [] } = useAcademicYearsDropdown();

  // Find the current academic year
  const currentAcademicYear = academicYears.find(year => year.is_current);

  const methods = useForm<StudentAdmissionCreate>({
    defaultValues: {
      admission_date: new Date().toISOString().split('T')[0],
      academic_year_id: currentAcademicYear?.id || '',
      admitted_academic_year_id: currentAcademicYear?.id || '',
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
      student_caste: '',
      student_sub_caste: '',
      student_community: '',
      student_identification_marks: '',
      father_name: '',
      father_email: '',
      father_phone: '',
      father_occupation: '',
      father_aadhar_number: '',
      father_gender: '',
      father_relation_to_student: 'Father',
      mother_name: '',
      mother_email: '',
      mother_phone: '',
      mother_occupation: '',
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

  const nextStep = async () => {
    // Define fields for each step
    const stepFields = {
      0: ['admission_date'], // Academic Details
      1: ['student_first_name', 'student_last_name', 'student_date_of_birth', 'student_gender', 'student_aadhar_number', 'student_apaar_number', 'student_caste', 'student_sub_caste', 'student_community', 'student_identification_marks'], // Student Details
      2: ['father_name', 'father_email', 'father_phone', 'father_occupation', 'father_aadhar_number', 'father_gender', 'father_relation_to_student', 'mother_name', 'mother_email', 'mother_phone', 'mother_occupation', 'mother_aadhar_number', 'mother_gender', 'mother_relation_to_student'], // Parent Details
      3: ['address_line1', 'city', 'state'], // Address Details
      4: [], // Previous School (no required fields)
      5: [] // Summary (no validation needed)
    };

    const fieldsToValidate = stepFields[currentStep as keyof typeof stepFields] || [];
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = async (data: StudentAdmissionCreate) => {
    try {
      // Restructure flat form data into nested API format
      const cleanedData = {
        admission_date: data.admission_date,
        academic_year_id: data.academic_year_id || undefined,
        admitted_academic_year_id: data.admitted_academic_year_id || undefined,
        admitted_class_id: data.admitted_class_id || undefined,
        admitted_section_id: data.admitted_section_id || undefined,
        current_class_id: data.current_class_id || undefined,
        current_section_id: data.current_section_id || undefined,
        address_line1: data.address_line1,
        address_line2: data.address_line2 || undefined,
        city: data.city,
        state: data.state,
        is_previous_school: data.is_previous_school || false,
        previous_school_name: data.is_previous_school ? (data.previous_school_name || undefined) : 'NA',
        previous_class: data.is_previous_school ? (data.previous_class || undefined) : 'NA',
        previous_school_remark: data.is_previous_school ? (data.previous_school_remark || undefined) : 'NA',
        student: {
          first_name: data.student_first_name || '',
          last_name: data.student_last_name || '',
          date_of_birth: data.student_date_of_birth || '',
          gender: data.student_gender || '',
          is_primary: data.student_is_primary || 'not_primary',
          nationality: data.student_nationality || 'Indian',
          mother_tongue: data.student_mother_tongue || 'Telugu',
          aadhar_number: data.student_aadhar_number || undefined,
          apaad_number: data.student_aadhar_number || undefined, // Backend expects apaad_number
          apaar_number: data.student_apaar_number || undefined, // APAAR field from form
          caste: data.student_caste || undefined,
          sub_caste: data.student_sub_caste || undefined,
          community: data.student_community || undefined,
          identification_marks: data.student_identification_marks || undefined,
          father: {
            name: data.father_name || '',
            email: data.father_email || '',
            phone: data.father_phone || undefined,
            occupation: data.father_occupation || undefined,
            aadhar_number: data.father_aadhar_number || undefined,
            gender: data.father_gender || undefined,
            relation_to_student: data.father_relation_to_student || 'Father',
          },
          mother: {
            name: data.mother_name || '',
            email: data.mother_email || '',
            phone: data.mother_phone || undefined,
            occupation: data.mother_occupation || undefined,
            aadhar_number: data.mother_aadhar_number || undefined,
            gender: data.mother_gender || undefined,
            relation_to_student: data.mother_relation_to_student || 'Mother',
          },
        },
      };

      await createAdmission.mutateAsync(cleanedData);
      onComplete();
    } catch (error: any) {
      console.error('Failed to create admission:', error);

      // Handle API validation errors
      if (error?.response?.data) {
        const apiErrors = error.response.data;
        if (Array.isArray(apiErrors)) {
          // Multiple validation errors
          const errorMessages = apiErrors.map((err: any) =>
            err.message || err.detail || JSON.stringify(err)
          ).join(', ');
          alert(`Validation errors: ${errorMessages}`);
        } else if (apiErrors.detail) {
          // Single error with detail
          alert(`Error: ${apiErrors.detail}`);
        } else if (apiErrors.message) {
          // Single error with message
          alert(`Error: ${apiErrors.message}`);
        } else {
          // Generic error
          alert(`Error: ${JSON.stringify(apiErrors)}`);
        }
      } else {
        alert(`Failed to create admission: ${error.message || 'Unknown error'}`);
      }
    }
  };

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

        <div className="flex justify-between">
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
                type="button"
                onClick={() => handleSubmit(onSubmit)()}
                disabled={createAdmission.status === 'pending'}
              >
                {createAdmission.status === 'pending' ? 'Creating...' : 'Create Admission'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default MultiStepAdmissionForm;