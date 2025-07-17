from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date


class StaffAttendanceBase(BaseModel):
    staff_id: int = Field(..., description="1")
    date: date
    status: str


class StaffAttendanceCreate(StaffAttendanceBase):
    pass


class StaffAttendanceUpdate(BaseModel):
    status: Optional[str]


class StaffAttendanceOut(StaffAttendanceBase):
    id: int

    class Config:
        orm_mode = True
