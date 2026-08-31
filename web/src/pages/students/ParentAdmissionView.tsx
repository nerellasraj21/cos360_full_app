import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useAdmissionByStudentId } from '@/api/hooks/students/admissions';
import { useAcademicYearsDropdown } from '@/api/hooks/masters/academicyears';
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections';
import { useStatesDropdown, useDistrictsDropdown, useMandalsDropdown } from '@/api/hooks/masters/locations';

/**
 * Parent view of Student Admissions — a single child's admission record.
 *
 * The active child is chosen via the header's student switcher
 * (authStore.selectedStudent), not a page-local selector, so it mirrors the
 * detail layout used by the admin "Admission Details" view
 * (routes/_app/students/admission/$admissionId.tsx) but scoped to whichever
 * child is currently selected in the header.
 */
export const ParentAdmissionView: React.FC = () => {
  const selectedStudent = useAuthStore((s) => s.selectedStudent);
  const availableStudents = useAuthStore((s) => s.availableStudents);

  const { data: admission, isLoading, error } = useAdmissionByStudentId(selectedStudent?.id ?? '');

  const { data: academicYears = [] } = useAcademicYearsDropdown();
  const { data: classesData = [] } = useClassSectionsDropdown();
  const stateId = (admission as any)?.state_id || admission?.state;
  const districtId = (admission as any)?.district_id;
  const { data: states = [] } = useStatesDropdown();
  const { data: districts = [], isLoading: districtsLoading } = useDistrictsDropdown(stateId);
  const { data: mandals = [], isLoading: mandalsLoading } = useMandalsDropdown(districtId);

  const getAcademicYearName = (yearId: string) => {
    const year = academicYears.find((y) => y.id === yearId);
    return year ? year.title : yearId;
  };

  const getClassName = (classId: string) => {
    const classItem = classesData.find((c) => c.id === classId);
    return classItem ? classItem.name : classId;
  };

  const getSectionName = (classId: string, sectionId: string) => {
    const classItem = classesData.find((c) => c.id === classId);
    if (classItem) {
      const section = classItem.sections.find((s) => s.id === sectionId);
      return section ? section.name : sectionId;
    }
    return sectionId;
  };

  const getStateName = (id: string) => states.find((s) => s.id === id)?.name || id;
  const getDistrictName = (id: string) => (districtsLoading ? 'Loading...' : districts.find((d) => d.id === id)?.name || 'N/A');
  const getMandalName = (id: string) => (mandalsLoading ? 'Loading...' : mandals.find((m) => m.id === id)?.name || 'N/A');
  const formatGender = (g?: string) => {
    if (!g) return 'N/A';
    const map: Record<string, string> = { M: 'Male', F: 'Female', O: 'Other', male: 'Male', female: 'Female', other: 'Other' };
    return map[g] ?? g.charAt(0).toUpperCase() + g.slice(1);
  };

  if (availableStudents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No children linked to your account.</p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedStudent) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No child selected. Use the child switcher in the header above.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading admission details...</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Error loading admission: {(error as Error).message}</div>;
  }

  if (!admission) {
    return <div className="p-6 text-muted-foreground">Admission not found for {selectedStudent.name}.</div>;
  }

  const studentData = admission.student as any; // Cast to access all fields

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
    ...(admission.is_previous_school
      ? [
          { label: 'Previous School Name', value: admission.previous_school_name },
          { label: 'Previous Class', value: admission.previous_class },
          { label: 'Previous School Remark', value: admission.previous_school_remark || 'N/A' },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admission — {selectedStudent.name} (#{admission.admission_number})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <tbody>
              {details.map((detail, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium bg-muted/50 w-1/3">{detail.label}</td>
                  <td className="px-4 py-2">{detail.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParentAdmissionView;
