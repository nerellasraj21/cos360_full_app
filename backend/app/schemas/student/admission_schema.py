from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, TypeAdapter, field_validator

from app.schemas.student.student_schema import StudentCreate, StudentOut

SALARY_RANGES = ("below_1l", "1l_3l", "3l_5l", "5l_10l", "above_10l")
_email_adapter = TypeAdapter(EmailStr)


class StudentAdmissionBase(BaseModel):
    admission_date: date | None = None
    admission_type: Literal["pre_primary", "regular"] | None = None
    academic_year_id: UUID  # Required: Academic year for admission
    admitted_academic_year_id: UUID | None = None
    admitted_class_id: UUID  # Required: Class student is admitted to
    admitted_section_id: UUID | None = None  # Optional: Section student is admitted to
    current_class_id: UUID | None = None
    current_section_id: UUID | None = None
    address_line1: str = Field(..., min_length=1, description="Mandatory address line 1")
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    roll_no: str | None = None
    is_previous_school: bool | None = False
    previous_school_name: str | None = None
    previous_class: str | None = None
    previous_school_remark: str | None = None


class StudentAdmissionCreate(StudentAdmissionBase):
    student: StudentCreate
    # Optional manual admission number. If provided, it is used as-is (after a
    # uniqueness check) for both primary and non-primary admissions. If omitted
    # or blank, the number is auto-generated (P{YEAR}{SEQ} / NP{YEAR}{SEQ}).
    admission_number: str | None = None
    state_id: UUID | None = None
    district_id: UUID | None = None
    mandal_id: UUID | None = None


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
    state_id: UUID | None = None
    district_id: UUID | None = None
    mandal_id: UUID | None = None
    student: StudentOut

    model_config = ConfigDict(from_attributes=True)


class StudentAdmissionUpdate(BaseModel):
    # Admission fields
    admission_date: date | None = None
    admission_type: Literal["pre_primary", "regular"] | None = None
    admission_number: str | None = None
    roll_no: str | None = None
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
    primary_phone: str | None = None

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

    # Guardian fields (optional)
    guardian_name: str | None = None
    guardian_email: str | None = None
    guardian_phone: str | None = None
    guardian_occupation: str | None = None
    guardian_aadhar_number: str | None = None
    guardian_gender: str | None = None
    guardian_salary_range: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator(
        "aadhar_number",
        "apaar_number",
        "father_aadhar_number",
        "mother_aadhar_number",
        "guardian_aadhar_number",
    )
    @classmethod
    def validate_twelve_digits(cls, v):
        if v and (not v.isdigit() or len(v) != 12):
            raise ValueError("Must be a 12-digit number")
        return v

    @field_validator("primary_phone")
    @classmethod
    def validate_primary_phone(cls, v):
        if v and (not v.isdigit() or len(v) != 10):
            raise ValueError("Must be a 10-digit number")
        return v

    @field_validator("father_email", "mother_email", "guardian_email")
    @classmethod
    def validate_parent_email(cls, v):
        if v and v.strip():
            _email_adapter.validate_python(v.strip())
        return v

    @field_validator("father_salary_range", "mother_salary_range", "guardian_salary_range")
    @classmethod
    def validate_salary_range(cls, v):
        if v and v not in SALARY_RANGES:
            raise ValueError(f"Must be one of: {', '.join(SALARY_RANGES)}")
        return v
