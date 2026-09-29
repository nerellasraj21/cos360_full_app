from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.masters.sections_schema import SectionCreate, SectionRead, SectionUpdate


class ClassBase(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True
    short_code: str
    academic_year_id: UUID


class ClassCreate(ClassBase):
    sections: list[SectionCreate] | None = None  # Use create schema


class ClassUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    short_code: str | None = None
    academic_year_id: UUID | None
    sections: list[SectionUpdate] | None = None  # Use Update schema


class ClassRead(ClassBase):
    id: UUID
    sections: list[SectionRead] = []  # Use read schema for response

    model_config = {"from_attributes": True}


class ClassOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    short_code: str | None
    is_active: bool
    academic_year_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClassDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
