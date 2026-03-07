from datetime import date
from uuid import UUID

from pydantic import BaseModel


class AcademicYearBase(BaseModel):
    title: str
    start_date: date
    end_date: date
    is_active: bool = True


class AcademicYearCreate(AcademicYearBase):
    pass


class AcademicYearUpdate(BaseModel):
    title: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class AcademicYearRead(AcademicYearBase):
    id: UUID
    model_config = {"from_attributes": True}


class AcademicYearDropdown(BaseModel):
    id: UUID
    title: str
    model_config = {"from_attributes": True}
