from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import date
from uuid import UUID
import enum

class GenderEnum(enum.Enum):
    Male = "Male"
    Female = "Female"
    Other = "Other"

class StaffEnrollmentBase(BaseModel):
    first_name: str = Field(..., description="Jane")
    last_name: Optional[str] = Field(None, description="Doe")
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    joining_date: date
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    address: Optional[str] = None
    designation_id: Optional[UUID] = Field(None, description="ID from the designations table")
    department: Optional[str] = None
    is_active: bool = True


class StaffEnrollmentCreate(StaffEnrollmentBase):
    role_id: Optional[UUID] = Field(None, description="Role ID for the staff user account")

class StaffEnrollmentUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    gender: Optional[Literal["Male", "Female", "Other"]] = None
    date_of_birth: Optional[date] = None
    joining_date: Optional[date] = None
    qualification: Optional[str] = None
    designation_id: Optional[UUID] = Field(None, description="ID from the designations table")
    experience_years: Optional[int] = None
    address: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


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
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    gender: Optional[GenderEnum]
    date_of_birth: Optional[date]
    joining_date: date
    qualification: Optional[str]
    experience_years: Optional[int]
    address: Optional[str]
    designation: Optional[DesignationOut]
    department: Optional[str]
    is_active: bool
    user_id: UUID

    class Config:
        from_attributes = True

class DriverOut(BaseModel):
    full_name: str
    user_id: UUID
