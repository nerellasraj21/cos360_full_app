from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date
from uuid import UUID


class StaffAttendanceBase(BaseModel):
    staff_id: UUID = Field(..., description="Staff UUID")
    date: date
    status: str


class StaffAttendanceCreate(StaffAttendanceBase):
    pass


class StaffAttendanceUpdate(BaseModel):
    status: Optional[str]


class StaffAttendanceOut(StaffAttendanceBase):
    id: UUID

    model_config = {"from_attributes": True}
