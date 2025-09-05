from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from uuid import UUID


class StudentAttendanceBase(BaseModel):
    student_id : UUID
    date : date
    status : str = Field(..., description="Present, Absent")
    remarks : str


class StudentAttendanceCreate(StudentAttendanceBase):
    student_id: UUID = Field(..., description="ID of the student")


class StudentAttendanceUpdate(BaseModel):
    status: Optional[str] = Field(None, description="Present, Absent")


class StudentAttendanceOut(StudentAttendanceBase):
    id: UUID
    student_id: UUID

    model_config = {"from_attributes": True}
