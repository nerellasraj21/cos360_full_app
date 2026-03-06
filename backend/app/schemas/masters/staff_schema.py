from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.masters.staff_model import GenderEnum


class StaffEnrollmentBase(BaseModel):
    first_name: str = Field(..., description="Jane")
    last_name: str | None = Field(None, description="Doe")
    email: EmailStr | None = None
    phone: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    joining_date: date
    qualification: str | None = None
    experience_years: int | None = None
    address: str | None = None
    designation_id: UUID | None = Field(None, description="ID from the designations table")
    department: str | None = None
    is_active: bool = True


class StaffEnrollmentCreate(StaffEnrollmentBase):
    role_id: UUID | None = Field(None, description="Role ID for the staff user account")


class StaffEnrollmentUpdate(BaseModel):
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


class StaffEnrollmentOut(StaffEnrollmentBase):
    id: UUID

    model_config = {"from_attributes": True}


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
    joining_date: date
    qualification: str | None
    experience_years: int | None
    address: str | None
    designation_obj: DesignationOut | None
    department: str | None
    is_active: bool
    user_id: UUID

    class Config:
        from_attributes = True


class DriverOut(BaseModel):
    full_name: str
    user_id: UUID
