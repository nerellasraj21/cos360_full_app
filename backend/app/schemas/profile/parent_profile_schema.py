from uuid import UUID

from pydantic import BaseModel, Field


class ChildProfileOut(BaseModel):
    student_id: UUID
    first_name: str
    last_name: str
    admission_number: str | None
    class_name: str | None
    section_name: str | None
    is_active: bool

    class Config:
        from_attributes = True


class ParentProfileOut(BaseModel):
    parent_id: UUID
    user_id: UUID
    name: str
    email: str | None
    phone: str | None
    occupation: str | None
    relation_to_student: str | None
    profile_photo_url: str | None = None
    children: list[ChildProfileOut] = []

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "parent_id": "123e4567-e89b-12d3-a456-426614174004",
                "user_id": "123e4567-e89b-12d3-a456-426614174005",
                "name": "Robert Doe",
                "email": "robert.doe@email.com",
                "phone": "+91-9876543210",
                "occupation": "Engineer",
                "relation_to_student": "Father",
                "children": [
                    {
                        "student_id": "123e4567-e89b-12d3-a456-426614174000",
                        "first_name": "John",
                        "last_name": "Doe",
                        "admission_number": "ADM2024001",
                        "class_name": "Grade 10",
                        "section_name": "A",
                        "is_active": True,
                    }
                ],
            }
        }


class ParentProfileUpdate(BaseModel):
    email: str | None = Field(None, description="Email address (editable)")
    phone: str | None = Field(None, description="Phone number (editable)")
    occupation: str | None = Field(None, description="Occupation (editable)")

    class Config:
        json_schema_extra = {
            "example": {"email": "newemail@email.com", "phone": "+91-9999999999", "occupation": "Business Owner"}
        }
