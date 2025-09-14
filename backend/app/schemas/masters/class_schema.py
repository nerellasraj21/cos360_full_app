from pydantic import BaseModel
from typing import Optional, List
from app.schemas.masters.sections_schema import SectionRead, SectionCreate, SectionUpdate
from datetime import datetime
from uuid import UUID

class ClassBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    short_code: str
    academic_year_id: UUID

class ClassCreate(ClassBase):
    sections: Optional[List[SectionCreate]] = None  # Use create schema

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    short_code: Optional[str] = None
    academic_year_id: Optional[UUID]
    sections: Optional[List[SectionUpdate]] = None  # Use Update schema

class ClassRead(ClassBase):
    id: UUID
    sections: List[SectionRead] = []  # Use read schema for response

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
