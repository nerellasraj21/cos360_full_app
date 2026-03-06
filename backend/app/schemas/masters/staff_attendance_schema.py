from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common.attendance_status_enum import AttendanceStatusEnum


class StaffAttendanceBase(BaseModel):
    staff_id: UUID = Field(..., description="Staff UUID")
    date: date
    status: AttendanceStatusEnum = Field(..., description="Present, Absent, or Late")
    remarks: str | None = Field(None, description="Optional remarks for attendance")


class StaffAttendanceCreate(StaffAttendanceBase):
    pass


class StaffAttendanceUpdate(BaseModel):
    status: AttendanceStatusEnum | None = Field(None, description="Present, Absent, or Late")
    remarks: str | None = Field(None, description="Optional remarks for attendance")


class StaffAttendanceOut(StaffAttendanceBase):
    id: UUID

    model_config = {"from_attributes": True}
