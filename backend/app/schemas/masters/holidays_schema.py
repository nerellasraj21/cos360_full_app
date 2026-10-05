from datetime import date, datetime
import re
from uuid import UUID

from pydantic import BaseModel, field_validator, model_validator


class HolidayBase(BaseModel):
    name: str
    description: str | None = None
    start_date: date
    end_date: date
    is_active: bool = False
    academic_year_id: UUID
    color: str | None = None


HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


def _check_color(value: str | None) -> str | None:
    if value is not None and not HEX_COLOR.match(value):
        raise ValueError("color must be a hex value like #ff8800")
    return value


class HolidayCreate(HolidayBase):
    @field_validator("color")
    @classmethod
    def validate_color(cls, v):
        return _check_color(v)

    @model_validator(mode="after")
    def check_date_order(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class HolidayUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None
    color: str | None = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, v):
        return _check_color(v)

    @model_validator(mode="after")
    def check_date_order(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class HolidayRead(HolidayBase):
    id: UUID
    model_config = {"from_attributes": True}


class HolidayDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
