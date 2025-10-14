from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID

class ChildProfileOut(BaseModel):
    student_id: UUID
    first_name: str
    last_name: str
    admission_number: Optional[str]
    class_name: Optional[str]
    section_name: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

class ParentProfileOut(BaseModel):
    parent_id: UUID
    user_id: UUID
    name: str
    email: Optional[str]
    phone: Optional[str]
    occupation: Optional[str]
    relation_to_student: Optional[str]
    profile_photo_url: Optional[str] = None
    children: List[ChildProfileOut] = []

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
                        "is_active": True
                    }
                ]
            }
        }

class ParentProfileUpdate(BaseModel):
    email: Optional[str] = Field(None, description="Email address (editable)")
    phone: Optional[str] = Field(None, description="Phone number (editable)")
    occupation: Optional[str] = Field(None, description="Occupation (editable)")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "newemail@email.com",
                "phone": "+91-9999999999",
                "occupation": "Business Owner"
            }
        }
