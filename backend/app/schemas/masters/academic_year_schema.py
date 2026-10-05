from datetime import date
from uuid import UUID

from pydantic import BaseModel, model_validator


class AcademicYearBase(BaseModel):
    title: str
    start_date: date
    end_date: date
    is_active: bool = True


class AcademicYearCreate(AcademicYearBase):
    @model_validator(mode="after")
    def check_date_order(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class AcademicYearUpdate(BaseModel):
    title: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def check_date_order(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class AcademicYearRead(AcademicYearBase):
    id: UUID
    model_config = {"from_attributes": True}


class AcademicYearDropdown(BaseModel):
    id: UUID
    title: str
    model_config = {"from_attributes": True}
