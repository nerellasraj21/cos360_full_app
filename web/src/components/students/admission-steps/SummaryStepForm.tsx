import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StudentAdmissionCreate } from '@/types/admission';

export function SummaryStepForm() {
  const { watch } = useFormContext<StudentAdmissionCreate>();
  const formData = watch();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Academic Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Admission Date:</strong> {formData.admission_date}</p>
          <p><strong>Academic Year:</strong> {formData.academic_year_id}</p>
          <p><strong>Admitted Class:</strong> {formData.admitted_class_id}</p>
          <p><strong>Admitted Section:</strong> {formData.admitted_section_id}</p>
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
          <p><strong>Caste:</strong> {formData.student_caste}</p>
          <p><strong>Sub Caste:</strong> {formData.student_sub_caste}</p>
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
          <p><strong>State:</strong> {formData.state}</p>
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