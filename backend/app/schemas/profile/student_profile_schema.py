from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from uuid import UUID

class StudentProfileOut(BaseModel):
    student_id: UUID
    user_id: UUID
    first_name: str
    last_name: str
    date_of_birth: date
    gender: Optional[str]
    email: Optional[str]
    admission_number: Optional[str] = None
    class_name: Optional[str] = None
    section_name: Optional[str] = None
    is_active: bool
    profile_photo_url: Optional[str] = None

    attendance_percentage: Optional[float] = None
    total_certificates: Optional[int] = 0
    total_documents: Optional[int] = 0

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "student_id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "first_name": "John",
                "last_name": "Doe",
                "date_of_birth": "2010-05-15",
                "gender": "Male",
                "email": "john.doe@school.com",
                "admission_number": "ADM2024001",
                "class_name": "Grade 10",
                "section_name": "A",
                "academic_year": "2024-25",
                "roll_number": 15,
                "is_active": True,
                "attendance_percentage": 92.5,
                "total_certificates": 3,
                "total_documents": 5
            }
        }

class StudentProfileUpdate(BaseModel):
    email: Optional[str] = Field(None, description="Email address (editable)")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "newemail@school.com"
            }
        }
