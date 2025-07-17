from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import date


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
    designation: Optional[str]
    department: Optional[str]
    is_active: bool = True


class StaffEnrollmentCreate(StaffEnrollmentBase):
    pass
    role_id: int

class StaffEnrollmentUpdate(BaseModel):
    email: Optional[EmailStr]
    phone: Optional[str]
    gender: Optional[Literal["male", "female", "other"]]
    date_of_birth: Optional[date]
    joining_date: Optional[date]
    role: Optional[str]
    qualification: Optional[str]
    experience_years: Optional[int]
    address: Optional[str]
    is_active: Optional[bool]


class StaffEnrollmentOut(StaffEnrollmentBase):
    id: int

    class Config:
        orm_mode = True
