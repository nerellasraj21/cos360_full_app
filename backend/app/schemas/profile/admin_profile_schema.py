from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from uuid import UUID

class AdminProfileOut(BaseModel):
    admin_id: UUID
    user_id: UUID
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    designation: Optional[str]
    employee_id: Optional[str]
    date_of_joining: Optional[date]
    is_active: bool
    profile_photo_url: Optional[str] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "admin_id": "123e4567-e89b-12d3-a456-426614174006",
                "user_id": "123e4567-e89b-12d3-a456-426614174007",
                "first_name": "Michael",
                "last_name": "Anderson",
                "email": "michael.anderson@school.com",
                "phone": "+91-9876543210",
                "designation": "School Administrator",
                "employee_id": "EMP2024002",
                "date_of_joining": "2019-04-01",
                "is_active": True
            }
        }

class AdminProfileUpdate(BaseModel):
    email: Optional[str] = Field(None, description="Email address (editable)")
    phone: Optional[str] = Field(None, description="Phone number (editable)")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "newemail@school.com",
                "phone": "+91-9999999999"
            }
        }
