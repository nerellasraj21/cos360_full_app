import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StudentAdmissionCreate } from '@/types/admission';
import { useAcademicYearsDropdown } from '@/api/hooks/masters/academicyears';
import { useClassesDropdown, useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
import { useStatesDropdown } from '@/api/hooks/masters/locations';
import { useCastesDropdown, useSubCastesDropdown } from '@/api/hooks/masters/castes';

export function SummaryStepForm() {
  const { watch } = useFormContext<StudentAdmissionCreate>();
  const formData = watch();

  // Fetch data to display names instead of IDs
  const { data: academicYears = [] } = useAcademicYearsDropdown();
  const { data: classes = [] } = useClassesDropdown(true);
  const { data: admittedSections = [] } = useSectionsByClassId(formData.admitted_class_id || undefined);
  const { data: currentSections = [] } = useSectionsByClassId(formData.current_class_id || undefined);
  const { data: states = [] } = useStatesDropdown(true);
  const { data: castes = [] } = useCastesDropdown(true);
  const { data: subCastes = [] } = useSubCastesDropdown(formData.caste_id || undefined, true);

  // Helper functions to get display names
  const getAcademicYearName = (yearId: string) => {
    const year = academicYears.find(y => String(y.id) === String(yearId));
    return year ? year.title : yearId;
  };

  const getClassName = (classId: string) => {
    const classItem = classes.find(c => String(c.id) === String(classId));
    return classItem ? classItem.name : classId;
  };

  const getSectionName = (sections: any[], sectionId: string) => {
    const section = sections.find(s => String(s.id) === String(sectionId));
    return section ? section.name : sectionId;
  };

  const getStateName = (stateId: string) => {
    if (!stateId) return '';
    const state = states.find(s => String(s.id) === String(stateId));
    return state ? state.name : stateId;
  };

  const getCasteName = (casteId: string) => {
    if (!casteId) return '';
    const caste = castes.find(c => String(c.id) === String(casteId));
    return caste ? caste.name : casteId;
  };

  const getSubCasteName = (subCasteId: string) => {
    if (!subCasteId) return '';
    const subCaste = subCastes.find(sc => String(sc.id) === String(subCasteId));
    return subCaste ? subCaste.name : subCasteId;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Academic Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Admission Date:</strong> {formData.admission_date}</p>
          <p><strong>Academic Year:</strong> {getAcademicYearName(formData.academic_year_id || '')}</p>
          <p><strong>Admitted Academic Year:</strong> {getAcademicYearName(formData.admitted_academic_year_id || '')}</p>
          <p><strong>Admitted Class:</strong> {getClassName(formData.admitted_class_id || '')}</p>
          <p><strong>Admitted Section:</strong> {getSectionName(admittedSections, formData.admitted_section_id || '')}</p>
          <p><strong>Current Class:</strong> {getClassName(formData.current_class_id || '')}</p>
          <p><strong>Current Section:</strong> {getSectionName(currentSections, formData.current_section_id || '')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Name:</strong> {formData.student_first_name} {formData.student_last_name}</p>
          <p><strong>Date of Birth:</strong> {formData.student_date_of_birth}</p>
          <p><strong>Gender:</strong> {formData.student_gender}</p>
          <p><strong>Aadhar Number:</strong> {formData.student_aadhar_number}</p>
          <p><strong>APAAR Number:</strong> {formData.student_apaar_number}</p>
          <p><strong>Caste:</strong> {getCasteName(formData.caste_id || '')}</p>
          <p><strong>Sub Caste:</strong> {getSubCasteName(formData.sub_caste_id || '')}</p>
          <p><strong>Community:</strong> {formData.student_community}</p>
          <p><strong>Identification Marks:</strong> {formData.student_identification_marks}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parent Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold">Father</h4>
            <p><strong>Name:</strong> {formData.father_name}</p>
            <p><strong>Email:</strong> {formData.father_email}</p>
            <p><strong>Phone:</strong> {formData.father_phone}</p>
            <p><strong>Occupation:</strong> {formData.father_occupation}</p>
            <p><strong>Aadhar:</strong> {formData.father_aadhar_number}</p>
            <p><strong>Gender:</strong> {formData.father_gender}</p>
            <p><strong>Relation:</strong> {formData.father_relation_to_student}</p>
          </div>
          <div>
            <h4 className="font-semibold">Mother</h4>
            <p><strong>Name:</strong> {formData.mother_name}</p>
            <p><strong>Email:</strong> {formData.mother_email}</p>
            <p><strong>Phone:</strong> {formData.mother_phone}</p>
            <p><strong>Occupation:</strong> {formData.mother_occupation}</p>
            <p><strong>Aadhar:</strong> {formData.mother_aadhar_number}</p>
            <p><strong>Gender:</strong> {formData.mother_gender}</p>
            <p><strong>Relation:</strong> {formData.mother_relation_to_student}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Address Line 1:</strong> {formData.address_line1}</p>
          <p><strong>Address Line 2:</strong> {formData.address_line2}</p>
          <p><strong>City:</strong> {formData.city}</p>
          <p><strong>State:</strong> {getStateName(formData.state_id || '')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previous School</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Has Previous School:</strong> {formData.is_previous_school ? 'Yes' : 'No'}</p>
          {formData.is_previous_school && (
            <>
              <p><strong>School Name:</strong> {formData.previous_school_name}</p>
              <p><strong>Class:</strong> {formData.previous_class}</p>
              <p><strong>Remark:</strong> {formData.previous_school_remark}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}