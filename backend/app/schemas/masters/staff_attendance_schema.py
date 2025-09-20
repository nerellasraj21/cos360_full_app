from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from uuid import UUID
from app.schemas.common.attendance_status_enum import AttendanceStatusEnum


class StaffAttendanceBase(BaseModel):
    staff_id: UUID = Field(..., description="Staff UUID")
    date: date
    status: AttendanceStatusEnum = Field(..., description="Present, Absent, or Late")
    remarks: Optional[str] = Field(None, description="Optional remarks for attendance")


class StaffAttendanceCreate(StaffAttendanceBase):
    pass


class StaffAttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatusEnum] = Field(None, description="Present, Absent, or Late")
    remarks: Optional[str] = Field(None, description="Optional remarks for attendance")


class StaffAttendanceOut(StaffAttendanceBase):
    id: UUID

    model_config = {"from_attributes": True}
