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
    admission_date: date | None
    admission_type: Literal["primary", "non_primary"] | None = None
    academic_year_id: UUID | None
    admitted_academic_year_id: UUID | None
    admitted_class_id: UUID | None
    admitted_section_id: UUID | None
    current_class_id: UUID | None
    current_section_id: UUID | None
    address_line1: str | None
    address_line2: str | None
    city: str | None
    state: str | None
    is_previous_school: bool | None
    previous_school_name: str | None
    previous_class: str | None
    previous_school_remark: str | None

    model_config = ConfigDict(from_attributes=True)
