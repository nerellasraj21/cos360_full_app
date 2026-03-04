from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from datetime import date
from uuid import UUID
from app.schemas.student.student_schema import StudentCreate, StudentOut, StudentDetailsOut
from pydantic import ConfigDict

class StudentAdmissionBase(BaseModel):
    admission_date: date
    admission_type: Optional[Literal["primary", "non_primary"]] = None
    academic_year_id: UUID  # Required: Academic year for admission
    admitted_academic_year_id: Optional[UUID] = None
    admitted_class_id: UUID  # Required: Class student is admitted to
    admitted_section_id: UUID  # Required: Section student is admitted to
    current_class_id: Optional[UUID] = None
    current_section_id: Optional[UUID] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    is_previous_school: Optional[bool] = False
    previous_school_name: Optional[str] = None
    previous_class: Optional[str] = None
    previous_school_remark: Optional[str] = None

class StudentAdmissionCreate(StudentAdmissionBase):
    student: StudentCreate

class StudentAdmissionResponse(StudentAdmissionBase):
    id: UUID
    admission_number: Optional[str]
    admission_type: Optional[str] = None
    # Override to make Optional for backwards compatibility with existing NULL records
    academic_year_id: Optional[UUID] = None
    admitted_class_id: Optional[UUID] = None
    admitted_section_id: Optional[UUID] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    student: StudentOut

    model_config = ConfigDict(from_attributes=True)

class StudentAdmissionUpdate(BaseModel):
    admission_date: Optional[date]
    admission_type: Optional[Literal["primary", "non_primary"]] = None
    academic_year_id: Optional[UUID]
    admitted_academic_year_id: Optional[UUID]
    admitted_class_id: Optional[UUID]
    admitted_section_id: Optional[UUID]
    current_class_id: Optional[UUID]
    current_section_id: Optional[UUID]
    address_line1: Optional[str]
    address_line2: Optional[str]
    city: Optional[str]
    state: Optional[str]
    is_previous_school: Optional[bool]
    previous_school_name: Optional[str]
    previous_class: Optional[str]
    previous_school_remark: Optional[str]

    model_config = ConfigDict(from_attributes=True)


