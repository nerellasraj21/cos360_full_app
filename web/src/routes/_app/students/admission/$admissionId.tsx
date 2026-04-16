import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStudentByAdmissionId, useAdmissionByStudentId } from '@/api/hooks/students/admissions';
import { useAcademicYearsDropdown } from '@/api/hooks/masters/academicyears';
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections';
import { useStatesDropdown, useDistrictsDropdown, useMandalsDropdown } from '@/api/hooks/masters/locations';
import { useNavigate } from '@tanstack/react-router';

/**
 * Admission Details View - Display Complete Admission Information
 *
 * Displays all admission-related information for a student including:
 * - Admission metadata (number, date, academic year, class, section, address)
 * - Student personal details (name, DOB, gender, Aadhar, APAAR, caste, nationality, etc.)
 * - Parent information:
 *   * Father details (name, email, phone, occupation, aadhar, gender)
 *   * Mother details (name, email, phone, occupation, aadhar, gender)
 *   * Guardian details (conditionally displayed if guardian was provided)
 * - Previous school information (if applicable)
 *
 * Guardian Display Logic:
 * - Guardian section is displayed using conditional rendering (line ~97)
 * - Only shown if studentData.guardian exists (i.e., user filled in guardian during admission)
 * - If no guardian, section is completely hidden for a clean UI
 *
 * Data Flow:
 * 1. useStudentByAdmissionId - fetches student by admission ID
 * 2. useAdmissionByStudentId - fetches admission record by student ID
 * 3. Backend extracts father/mother/guardian from parent_links relationship
 * 4. StudentOut schema includes all parent details in response
 * 5. Component maps details to table rows for display
 */
function RouteComponent() {
  const { admissionId } = Route.useParams();
  const navigate = useNavigate();

  // Fetch student by admission ID first
  const { data: student, isLoading: studentLoading, error: studentError } = useStudentByAdmissionId(admissionId);

  // Then fetch admission details by student ID (includes parent relationships)
  const { data: admission, isLoading: admissionLoading, error: admissionError } = useAdmissionByStudentId(student?.id || '');

  // Get reference data for display names
  const { data: academicYears = [] } = useAcademicYearsDropdown();
  const { data: classesData = [] } = useClassSectionsDropdown();
  const stateId = (admission as any)?.state_id || admission?.state;
  const districtId = (admission as any)?.district_id;
  const { data: states = [] } = useStatesDropdown();
  const { data: districts = [], isLoading: districtsLoading } = useDistrictsDropdown(stateId);
  const { data: mandals = [], isLoading: mandalsLoading } = useMandalsDropdown(districtId);

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

  const getStateName = (id: string) => states.find(s => s.id === id)?.name || id;
  const getDistrictName = (id: string) => districtsLoading ? 'Loading...' : (districts.find(d => d.id === id)?.name || 'N/A');
  const getMandalName = (id: string) => mandalsLoading ? 'Loading...' : (mandals.find(m => m.id === id)?.name || 'N/A');
  const formatGender = (g?: string) => {
    if (!g) return 'N/A';
    const map: Record<string, string> = { M: 'Male', F: 'Female', O: 'Other', male: 'Male', female: 'Female', other: 'Other' };
    return map[g] ?? (g.charAt(0).toUpperCase() + g.slice(1));
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
    { label: 'State', value: admission.state ? getStateName(admission.state) : 'N/A' },
    { label: 'District', value: districtId ? getDistrictName(districtId) : 'N/A' },
    { label: 'Mandal', value: (admission as any).mandal_id ? getMandalName((admission as any).mandal_id) : 'N/A' },
    { label: 'Student Name', value: `${studentData.first_name} ${studentData.last_name}` },
    { label: 'Date of Birth', value: new Date(studentData.date_of_birth).toLocaleDateString() },
    { label: 'Gender', value: formatGender(studentData.gender) },
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
    { label: 'Father Gender', value: formatGender(studentData.father?.gender) },
    { label: 'Mother Name', value: studentData.mother?.name || 'N/A' },
    { label: 'Mother Email', value: studentData.mother?.email || 'N/A' },
    { label: 'Mother Phone', value: studentData.mother?.phone || 'N/A' },
    { label: 'Mother Occupation', value: studentData.mother?.occupation || 'N/A' },
    { label: 'Mother Aadhar', value: studentData.mother?.aadhar_number || 'N/A' },
    { label: 'Mother Gender', value: formatGender(studentData.mother?.gender) },
    { label: 'Guardian Name', value: studentData.guardian?.name || 'N/A' },
    { label: 'Guardian Email', value: studentData.guardian?.email || 'N/A' },
    { label: 'Guardian Phone', value: studentData.guardian?.phone || 'N/A' },
    { label: 'Guardian Occupation', value: studentData.guardian?.occupation || 'N/A' },
    { label: 'Guardian Aadhar', value: studentData.guardian?.aadhar_number || 'N/A' },
    { label: 'Guardian Gender', value: formatGender(studentData.guardian?.gender) },
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
