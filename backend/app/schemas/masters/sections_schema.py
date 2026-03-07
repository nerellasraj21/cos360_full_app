from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SectionBase(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True


class SectionCreate(SectionBase):
    pass  # class_id removed


class SectionUpdate(BaseModel):
    id: UUID | None
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    # class_id removed or made optional if needed

    model_config = {"from_attributes": True}


class SectionRead(SectionBase):
    id: UUID
    class_id: UUID

    model_config = {"from_attributes": True}


class ClassSectionInfo(BaseModel):
    section_id: UUID
    class_section_name: str


class SectionOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    is_active: bool
    class_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SectionDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
