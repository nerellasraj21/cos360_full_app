from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.student.student_schema import StudentCreate, StudentOut


class StudentAdmissionBase(BaseModel):
    admission_date: date
    admission_type: Literal["primary", "non_primary"] | None = None
    academic_year_id: UUID  # Required: Academic year for admission
    admitted_academic_year_id: UUID | None = None
    admitted_class_id: UUID  # Required: Class student is admitted to
    admitted_section_id: UUID  # Required: Section student is admitted to
    current_class_id: UUID | None = None
    current_section_id: UUID | None = None
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    is_previous_school: bool | None = False
    previous_school_name: str | None = None
    previous_class: str | None = None
    previous_school_remark: str | None = None


class StudentAdmissionCreate(StudentAdmissionBase):
    student: StudentCreate


class StudentAdmissionResponse(StudentAdmissionBase):
    id: UUID
    admission_number: str | None
    admission_type: str | None = None
    # Override to make Optional for backwards compatibility with existing NULL records
    academic_year_id: UUID | None = None
    admitted_class_id: UUID | None = None
    admitted_section_id: UUID | None = None
    address_line1: str | None = None
    city: str | None = None
    state: str | None = None
    student: StudentOut

    model_config = ConfigDict(from_attributes=True)


class StudentAdmissionUpdate(BaseModel):
    # Admission fields
    admission_date: date | None = None
    admission_type: Literal["primary", "non_primary"] | None = None
    academic_year_id: UUID | None = None
    admitted_academic_year_id: UUID | None = None
    admitted_class_id: UUID | None = None
    admitted_section_id: UUID | None = None
    current_class_id: UUID | None = None
    current_section_id: UUID | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    state_id: UUID | None = None
    district_id: UUID | None = None
    mandal_id: UUID | None = None
    is_previous_school: bool | None = None
    previous_school_name: str | None = None
    previous_class: str | None = None
    previous_school_remark: str | None = None

    # Student personal fields
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    is_primary: str | None = None
    aadhar_number: str | None = None
    apaar_number: str | None = None
    nationality: str | None = None
    mother_tongue: str | None = None
    caste: str | None = None
    caste_id: UUID | None = None
    sub_caste: str | None = None
    sub_caste_id: UUID | None = None
    community: str | None = None
    identification_marks: str | None = None

    # Father fields
    father_name: str | None = None
    father_email: str | None = None
    father_phone: str | None = None
    father_occupation: str | None = None
    father_aadhar_number: str | None = None
    father_gender: str | None = None
    father_salary_range: str | None = None

    # Mother fields
    mother_name: str | None = None
    mother_email: str | None = None
    mother_phone: str | None = None
    mother_occupation: str | None = None
    mother_aadhar_number: str | None = None
    mother_gender: str | None = None
    mother_salary_range: str | None = None

    model_config = ConfigDict(from_attributes=True)
