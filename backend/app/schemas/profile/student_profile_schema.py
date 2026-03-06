from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class StudentProfileOut(BaseModel):
    student_id: UUID
    user_id: UUID
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str | None
    email: str | None
    admission_number: str | None = None
    class_name: str | None = None
    section_name: str | None = None
    is_active: bool
    profile_photo_url: str | None = None

    attendance_percentage: float | None = None
    total_certificates: int | None = 0
    total_documents: int | None = 0

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
                "total_documents": 5,
            }
        }


class StudentProfileUpdate(BaseModel):
    email: str | None = Field(None, description="Email address (editable)")

    class Config:
        json_schema_extra = {"example": {"email": "newemail@school.com"}}
