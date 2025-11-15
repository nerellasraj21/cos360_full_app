from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal, ForwardRef, TYPE_CHECKING
from pydantic import ConfigDict
from uuid import UUID

class ParentBase(BaseModel):
    name: str
    email: Optional[EmailStr]
    phone: Optional[str]
    occupation: Optional[str]
    aadhar_number: Optional[str]
    gender: Optional[str]
    relation_to_student: Literal["Father", "Mother", "Guardian"]

class ParentCreate(ParentBase):
    pass

class ParentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    aadhar_number: Optional[str] = None
    gender: Optional[Literal["Male", "Female", "Other"]] = None
    relation_to_student: Optional[Literal["Father", "Mother", "Guardian"]] = None

# Simple student schema for parent responses (avoids circular reference)
class StudentSimpleOut(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = ConfigDict(from_attributes=True)

class ParentOut(ParentBase):
    id: UUID
    students: List[StudentSimpleOut] = []

    model_config = ConfigDict(from_attributes=True)

    @staticmethod
    def from_orm_with_students(parent):
        return ParentOut(
            id=parent.id,
            name=parent.name,
            email=parent.email,
            phone=parent.phone,
            occupation=parent.occupation,
            aadhar_number=parent.aadhar_number,
            gender=parent.gender,
            relation_to_student=parent.relation_to_student,
            students=[StudentSimpleOut(
                id=link.student.id,
                first_name=link.student.first_name,
                last_name=link.student.last_name
            ) for link in parent.student_links]
        )

class ParentListResponse(BaseModel):
    items: List[ParentOut]
    total_count: int
    has_next: bool
    skip: int
    limit: int

    model_config = ConfigDict(from_attributes=True)