from datetime import date, datetime
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.masters.staff_model import GenderEnum, QualificationLevelEnum


# -------------------- Qualification Schemas --------------------


class StaffQualificationCreate(BaseModel):
    level: QualificationLevelEnum | None = Field(None, description="Qualification level: Below Graduation / Graduation / Post Graduation / PhD")
    name: str | None = Field(None, description="Name of the degree/course (e.g. Inter, B.Tech, M.Tech)")
    passed_out_year: int | None = Field(None, description="Year of passing (e.g. 2020)")
    percentage: Decimal | None = Field(None, description="Percentage scored (e.g. 78.50)")
    university: str | None = Field(None, description="University or board name")


class StaffQualificationUpdate(BaseModel):
    level: QualificationLevelEnum | None = None
    name: str | None = None
    passed_out_year: int | None = None
    percentage: Decimal | None = None
    university: str | None = None


class StaffQualificationOut(BaseModel):
    id: UUID
    staff_id: UUID
    level: QualificationLevelEnum
    name: str
    passed_out_year: int | None
    percentage: Decimal | None
    university: str | None

    model_config = {"from_attributes": True}


# -------------------- Staff Enrollment Schemas --------------------


class StaffEnrollmentBase(BaseModel):
    first_name: str = Field(..., description="Jane")
    last_name: str | None = Field(None, description="Doe")
    email: EmailStr | None = None
    phone: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    joining_date: date | None = None
    qualification: str | None = None
    experience_years: int | None = None
    address: str | None = None
    designation_id: UUID | None = Field(None, description="ID from the designations table")
    department: str | None = None
    is_active: bool = True

    # Work Experience
    work_org: str | None = Field(None, description="Previous organization / school name")
    work_from_date: date | None = Field(None, description="Work experience from date")
    work_to_date: date | None = Field(None, description="Work experience to date (null = current)")
    subjects_dealt: str | None = Field(None, description="Subjects handled (e.g. Maths, Physics)")
    work_remarks: str | None = Field(None, description="Additional remarks about work experience")

    # Bank Details
    bank_name: str | None = Field(None, description="Bank name")
    bank_branch: str | None = Field(None, description="Bank branch")
    account_number: str | None = Field(None, description="Bank account number")
    ifsc_code: str | None = Field(None, description="IFSC code")
    account_holder_name: str | None = Field(None, description="Name as per bank account")
    account_type: Literal["Savings", "Current"] | None = Field(None, description="Savings or Current")

    # Salary & PF
    last_drawn_salary: Decimal | None = Field(None, description="Last drawn salary from previous employer")
    current_salary: Decimal | None = Field(None, description="Current salary at this organization")
    pf_account_number: str | None = Field(None, description="PF account number (e.g. AP/HYD/12345)")
    uan_number: str | None = Field(None, description="Universal Account Number (12 digits)")


class StaffEnrollmentCreate(StaffEnrollmentBase):
    role_id: UUID | None = Field(None, description="Role ID for the staff user account")

    # Mandatory on create (first_name is already mandatory via the base class)
    phone: str = Field(..., min_length=1, description="Mandatory contact phone")
    address: str = Field(..., min_length=1, description="Mandatory address")


class StaffEnrollmentUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    gender: Literal["Male", "Female", "Other"] | None = None
    date_of_birth: date | None = None
    joining_date: date | None = None
    qualification: str | None = None
    designation_id: UUID | None = Field(None, description="ID from the designations table")
    experience_years: int | None = None
    address: str | None = None
    department: str | None = None
    is_active: bool | None = None

    # Work Experience
    work_org: str | None = None
    work_from_date: date | None = None
    work_to_date: date | None = None
    subjects_dealt: str | None = None
    work_remarks: str | None = None

    # Bank Details
    bank_name: str | None = None
    bank_branch: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    account_holder_name: str | None = None
    account_type: Literal["Savings", "Current"] | None = None

    # Salary & PF
    last_drawn_salary: Decimal | None = None
    current_salary: Decimal | None = None
    pf_account_number: str | None = None
    uan_number: str | None = None

    @field_validator("first_name", "email", "phone", "address")
    @classmethod
    def _mandatory_fields_cannot_be_cleared(cls, value, info):
        # Runs only when the field is explicitly sent in the PATCH body;
        # omitting the field entirely is still allowed (partial update).
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValueError(f"{info.field_name} is mandatory and cannot be empty")
        return value


class StaffEnrollmentOut(StaffEnrollmentBase):
    id: UUID
    user_id: UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None
    qualifications: List[StaffQualificationOut] = []
    photo_url: str | None = Field(None, validation_alias="photo")

    model_config = {"from_attributes": True, "populate_by_name": True}


class DesignationCreate(BaseModel):
    title: str


class DesignationOut(BaseModel):
    id: UUID
    title: str

    class Config:
        from_attributes = True


class StaffOut(BaseModel):
    id: UUID
    first_name: str
    last_name: str | None
    email: str | None
    phone: str | None
    gender: GenderEnum | None
    date_of_birth: date | None
    joining_date: date | None
    qualification: str | None
    experience_years: int | None
    address: str | None
    designation_obj: DesignationOut | None
    department: str | None
    is_active: bool
    user_id: UUID
    qualifications: List[StaffQualificationOut] = []

    # Work Experience
    work_org: str | None = None
    work_from_date: date | None = None
    work_to_date: date | None = None
    subjects_dealt: str | None = None
    work_remarks: str | None = None

    # Bank Details
    bank_name: str | None = None
    bank_branch: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    account_holder_name: str | None = None
    account_type: str | None = None

    # Salary & PF
    last_drawn_salary: Decimal | None = None
    current_salary: Decimal | None = None
    pf_account_number: str | None = None
    uan_number: str | None = None

    photo_url: str | None = Field(None, validation_alias="photo")

    class Config:
        from_attributes = True
        populate_by_name = True


class DriverOut(BaseModel):
    full_name: str
    user_id: UUID
