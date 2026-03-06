from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class HolidayBase(BaseModel):
    name: str
    description: str | None = None
    start_date: date
    end_date: date
    is_active: bool = False
    academic_year_id: UUID


class HolidayCreate(HolidayBase):
    pass


class HolidayUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None


class HolidayRead(HolidayBase):
    id: UUID
    model_config = {"from_attributes": True}


class HolidayDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
