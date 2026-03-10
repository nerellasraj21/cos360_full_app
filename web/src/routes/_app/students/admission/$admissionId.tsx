import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStudentByAdmissionId, useAdmissionByStudentId } from '@/api/hooks/students/admissions';
import { useAcademicYearsDropdown } from '@/api/hooks/masters/academicyears';
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections';
import { useNavigate } from '@tanstack/react-router';

function RouteComponent() {
  const { admissionId } = Route.useParams();
  const navigate = useNavigate();

  // First get the student by admission ID
  const { data: student, isLoading: studentLoading, error: studentError } = useStudentByAdmissionId(admissionId);

  // Then get the admission by student ID
  const { data: admission, isLoading: admissionLoading, error: admissionError } = useAdmissionByStudentId(student?.id || '');

  // Get reference data for display names
  const { data: academicYears = [] } = useAcademicYearsDropdown();
  const { data: classesData = [] } = useClassSectionsDropdown();

  const isLoading = studentLoading || admissionLoading;
  const error = studentError || admissionError;

  // Helper functions to get display names
  const getAcademicYearName = (yearId: string) => {
    const year = academicYears.find(y => y.id === yearId);
    return year ? year.title : yearId;
  };

  const getClassName = (classId: string) => {
    const classItem = classesData.find(c => c.id === classId);
    return classItem ? classItem.name : classId;
  };

  const getSectionName = (classId: string, sectionId: string) => {
    const classItem = classesData.find(c => c.id === classId);
    if (classItem) {
      const section = classItem.sections.find(s => s.id === sectionId);
      return section ? section.name : sectionId;
    }
    return sectionId;
  };

  if (isLoading) {
    return <div className="p-6">Loading admission details...</div>;
  }

  if (error) {
    return <div className="p-6">Error loading admission: {error.message}</div>;
  }

  if (!admission) {
    return <div className="p-6">Admission not found</div>;
  }

  const studentData = admission.student as any; // Cast to access all fields

  // Prepare data for table display
  const details = [
    { label: 'Admission Number', value: admission.admission_number },
    { label: 'Admission Date', value: new Date(admission.admission_date).toLocaleDateString() },
    { label: 'Academic Year', value: getAcademicYearName(admission.academic_year_id || '') || 'N/A' },
    { label: 'Admitted Class', value: getClassName(admission.admitted_class_id || '') || 'N/A' },
    { label: 'Admitted Section', value: getSectionName(admission.admitted_class_id || '', admission.admitted_section_id || '') || 'N/A' },
    { label: 'Current Class', value: getClassName(admission.current_class_id || '') || 'N/A' },
    { label: 'Current Section', value: getSectionName(admission.current_class_id || '', admission.current_section_id || '') || 'N/A' },
    { label: 'Address Line 1', value: admission.address_line1 },
    { label: 'Address Line 2', value: admission.address_line2 || 'N/A' },
    { label: 'City', value: admission.city },
    { label: 'State', value: admission.state },
    { label: 'Student Name', value: `${studentData.first_name} ${studentData.last_name}` },
    { label: 'Date of Birth', value: new Date(studentData.date_of_birth).toLocaleDateString() },
    { label: 'Gender', value: studentData.gender },
    { label: 'Aadhar Number', value: studentData.aadhar_number || 'N/A' },
    { label: 'APAAR Number', value: studentData.apaar_number || 'N/A' },
    { label: 'Caste', value: studentData.caste || 'N/A' },
    { label: 'Sub Caste', value: studentData.sub_caste || 'N/A' },
    { label: 'Community', value: studentData.community || 'N/A' },
    { label: 'Nationality', value: studentData.nationality },
    { label: 'Mother Tongue', value: studentData.mother_tongue },
    { label: 'Identification Marks', value: studentData.identification_marks || 'N/A' },
    { label: 'Father Name', value: studentData.father?.name || 'N/A' },
    { label: 'Father Email', value: studentData.father?.email || 'N/A' },
    { label: 'Father Phone', value: studentData.father?.phone || 'N/A' },
    { label: 'Father Occupation', value: studentData.father?.occupation || 'N/A' },
    { label: 'Father Aadhar', value: studentData.father?.aadhar_number || 'N/A' },
    { label: 'Father Gender', value: studentData.father?.gender || 'N/A' },
    { label: 'Mother Name', value: studentData.mother?.name || 'N/A' },
    { label: 'Mother Email', value: studentData.mother?.email || 'N/A' },
    { label: 'Mother Phone', value: studentData.mother?.phone || 'N/A' },
    { label: 'Mother Occupation', value: studentData.mother?.occupation || 'N/A' },
    { label: 'Mother Aadhar', value: studentData.mother?.aadhar_number || 'N/A' },
    { label: 'Mother Gender', value: studentData.mother?.gender || 'N/A' },
    ...(admission.is_previous_school ? [
      { label: 'Previous School Name', value: admission.previous_school_name },
      { label: 'Previous Class', value: admission.previous_class },
      { label: 'Previous School Remark', value: admission.previous_school_remark || 'N/A' }
    ] : [])
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admission Details</h1>
          <p className="text-muted-foreground">Admission #{admission.admission_number}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/students/admission' })}
        >
          Back to List
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Complete Admission Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <tbody>
                {details.map((detail, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium bg-muted/50 w-1/3">
                      {detail.label}
                    </td>
                    <td className="px-4 py-2">
                      {detail.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/_app/students/admission/$admissionId')({
  component: RouteComponent,
});
