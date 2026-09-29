from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class StaffProfileOut(BaseModel):
    staff_id: UUID
    user_id: UUID
    first_name: str | None
    last_name: str | None
    email: str | None
    phone: str | None
    designation: str | None
    employee_id: str | None
    date_of_joining: date | None
    is_active: bool
    profile_photo_url: str | None = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "staff_id": "123e4567-e89b-12d3-a456-426614174002",
                "user_id": "123e4567-e89b-12d3-a456-426614174003",
                "first_name": "Jane",
                "last_name": "Smith",
                "email": "jane.smith@school.com",
                "phone": "+91-9876543210",
                "designation": "Teacher",
                "employee_id": "EMP2024001",
                "date_of_joining": "2020-06-01",
                "is_active": True,
            }
        }


class StaffProfileUpdate(BaseModel):
    email: str | None = Field(None, description="Email address (editable)")
    phone: str | None = Field(None, description="Phone number (editable)")

    class Config:
        json_schema_extra = {"example": {"email": "newemail@school.com", "phone": "+91-9999999999"}}
