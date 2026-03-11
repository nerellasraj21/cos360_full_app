from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class ParentBase(BaseModel):
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    occupation: str | None = None
    aadhar_number: str | None = None
    gender: str | None = None
    relation_to_student: Literal["Father", "Mother", "Guardian"]
    salary_range: Literal["below_1l", "1l_3l", "3l_5l", "5l_10l", "above_10l"] | None = None


class ParentCreate(ParentBase):
    pass


class ParentUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    occupation: str | None = None
    aadhar_number: str | None = None
    gender: Literal["Male", "Female", "Other"] | None = None
    relation_to_student: Literal["Father", "Mother", "Guardian"] | None = None
    salary_range: Literal["below_1l", "1l_3l", "3l_5l", "5l_10l", "above_10l"] | None = None


# Simple student schema for parent responses (avoids circular reference)
class StudentSimpleOut(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = ConfigDict(from_attributes=True)


class ParentOut(ParentBase):
    id: UUID
    students: list[StudentSimpleOut] = []

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
            salary_range=parent.salary_range if parent.salary_range else None,
            students=[
                StudentSimpleOut(
                    id=link.student.id, first_name=link.student.first_name, last_name=link.student.last_name
                )
                for link in parent.student_links
            ],
        )


class ParentListResponse(BaseModel):
    items: list[ParentOut]
    total_count: int
    has_next: bool
    skip: int
    limit: int

    model_config = ConfigDict(from_attributes=True)
