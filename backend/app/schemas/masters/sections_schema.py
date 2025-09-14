from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class SectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class SectionCreate(SectionBase):
    pass  # class_id removed

class SectionUpdate(BaseModel):
    id: Optional[UUID]
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
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