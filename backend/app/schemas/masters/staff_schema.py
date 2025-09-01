from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import date
import enum

class GenderEnum(enum.Enum):
    male = "male"
    female = "female"
    other = "other"

class StaffEnrollmentBase(BaseModel):
    first_name: str = Field(..., description="Jane")
    last_name: Optional[str] = Field(None, description="Doe")
    email: Optional[EmailStr]
    phone: Optional[str]
    gender: Optional[str]
    date_of_birth: Optional[date]
    joining_date: date
    qualification: Optional[str]
    experience_years: Optional[int]
    address: Optional[str]
    designation_id: Optional[int] = Field(None, description="ID from the designations table")
    department: Optional[str]
    is_active: bool = True


class StaffEnrollmentCreate(StaffEnrollmentBase):
    pass

class StaffEnrollmentUpdate(BaseModel):
    email: Optional[EmailStr]
    phone: Optional[str]
    gender: Optional[Literal["male", "female", "other"]]
    date_of_birth: Optional[date]
    joining_date: Optional[date]
    qualification: Optional[str]
    designation_id: Optional[int] = Field(None, description="ID from the designations table")
    experience_years: Optional[int]
    address: Optional[str]
    is_active: Optional[bool]


class StaffEnrollmentOut(StaffEnrollmentBase):
    id: int

    model_config = {"from_attributes": True}

class DesignationCreate(BaseModel):
    title: str

class DesignationOut(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True

class StaffOut(BaseModel):
    id: int
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
    user_id: int

    class Config:
        from_attributes = True

class DriverOut(BaseModel):
    full_name: str
    user_id: int
