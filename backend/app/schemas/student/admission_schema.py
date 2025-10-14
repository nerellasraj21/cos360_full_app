from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import date
from uuid import UUID
from app.schemas.student.student_schema import StudentCreate, StudentOut, StudentDetailsOut
from pydantic import ConfigDict

class StudentAdmissionBase(BaseModel):
    admission_date: date
    academic_year_id: Optional[UUID]
    admitted_academic_year_id: Optional[UUID]
    admitted_class_id: Optional[UUID]
    admitted_section_id: Optional[UUID]
    current_class_id: Optional[UUID]
    current_section_id: Optional[UUID]
    address_line1: str
    address_line2: Optional[str]
    city: str
    state: str
    is_previous_school: Optional[bool] = False
    previous_school_name: Optional[str]
    previous_class: Optional[str]
    previous_school_remark: Optional[str]

class StudentAdmissionCreate(StudentAdmissionBase):
    student: StudentCreate

class StudentAdmissionResponse(StudentAdmissionBase):
    id: UUID
    admission_number: Optional[str]
    student: StudentOut

    model_config = ConfigDict(from_attributes=True)

class StudentAdmissionUpdate(BaseModel):
    admission_date: Optional[date]
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


