from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import date
from app.schemas.masters.student_schema import StudentCreate, StudentOut, StudentDetailsOut

class StudentAdmissionBase(BaseModel):
    admission_date: date
    academic_year_id: Optional[int]
    admitted_class_id: Optional[int]
    admitted_section_id: Optional[int]
    current_class_id: Optional[int]
    current_section_id: Optional[int]
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
    id: int
    student: StudentOut

    class Config:
        from_attributes=True

class StudentAdmissionUpdate(BaseModel):
    first_name: Optional[str]
    last_name: Optional[str]
    date_of_birth: Optional[date]
    is_primary: Optional[str]
    gender: Optional[str]
    admission_date: Optional[date]
    admitted_class_id: Optional[int]
    current_class_id: Optional[int]
    academic_year_id: Optional[int]
    address_line1: Optional[str]
    city: Optional[str]
    state: Optional[str]
    aadhar_number: Optional[str]

    class Config:
        from_attributes = True


