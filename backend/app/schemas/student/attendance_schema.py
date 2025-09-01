from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class StudentAttendanceBase(BaseModel):
    student_id : int
    date : date
    status : str = Field(..., description="Present, Absent")
    remarks : str


class StudentAttendanceCreate(StudentAttendanceBase):
    student_id: int = Field(..., description="ID of the student")


class StudentAttendanceUpdate(BaseModel):
    status: Optional[str] = Field(None, description="Present, Absent")


class StudentAttendanceOut(StudentAttendanceBase):
    id: int
    student_id: int

    model_config = {"from_attributes": True}
