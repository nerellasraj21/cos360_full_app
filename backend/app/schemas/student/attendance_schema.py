from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from uuid import UUID
from app.schemas.common.attendance_status_enum import AttendanceStatusEnum


class StudentAttendanceBase(BaseModel):
    student_id : UUID
    date : date
    status : AttendanceStatusEnum = Field(..., description="Present, Absent, or Late")
    remarks : Optional[str] = Field(None, description="Optional remarks for attendance")


class StudentAttendanceCreate(StudentAttendanceBase):
    student_id: UUID = Field(..., description="ID of the student")


class StudentAttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatusEnum] = Field(None, description="Present, Absent, or Late")
    remarks: Optional[str] = Field(None, description="Optional remarks for attendance")


class StudentAttendanceOut(StudentAttendanceBase):
    id: UUID
    student_id: UUID

    model_config = {"from_attributes": True}
