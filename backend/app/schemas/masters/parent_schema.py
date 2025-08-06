from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal, ForwardRef, TYPE_CHECKING
from pydantic import ConfigDict

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
    name: Optional[str]
    email: Optional[EmailStr]
    phone: Optional[str]
    occupation: Optional[str]
    aadhar_number: Optional[str]
    gender: Optional[Literal["Male", "Female", "Other"]]
    relation_to_student: Optional[Literal["Father", "Mother", "Guardian"]]

class ParentOut(ParentBase):
    id: int
    students: List["StudentOut"] = []

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
            students=[link.student for link in parent.student_links]
        )
    

from app.schemas.student.student_schema import StudentOut
ParentOut.update_forward_refs()