from datetime import date
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.common.attendance_status_enum import AttendanceStatusEnum


class StudentAttendanceBase(BaseModel):
    student_id: UUID
    date: date
    status: AttendanceStatusEnum = Field(..., description="Present, Absent, or Late")
    remarks: str | None = Field(None, description="Optional remarks for attendance")

    @model_validator(mode="before")
    @classmethod
    def normalize_status_before_validation(cls, data: Any) -> Any:
        if isinstance(data, dict) and "status" in data:
            if isinstance(data["status"], str):
                data["status"] = data["status"].lower()
        return data


class StudentAttendanceCreate(StudentAttendanceBase):
    student_id: UUID = Field(..., description="ID of the student")


class StudentAttendanceUpdate(BaseModel):
    status: AttendanceStatusEnum | None = Field(None, description="Present, Absent, or Late")
    remarks: str | None = Field(None, description="Optional remarks for attendance")

    @model_validator(mode="before")
    @classmethod
    def normalize_status_before_validation(cls, data: Any) -> Any:
        if isinstance(data, dict) and "status" in data:
            if isinstance(data["status"], str):
                data["status"] = data["status"].lower()
        return data


class StudentAttendanceOut(StudentAttendanceBase):
    id: UUID
    student_id: UUID

    model_config = {"from_attributes": True}
