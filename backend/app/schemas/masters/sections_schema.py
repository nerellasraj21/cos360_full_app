from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class SectionCreate(SectionBase):
    pass  # class_id removed

class SectionUpdate(BaseModel):
    id: Optional[int]
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    # class_id removed or made optional if needed

    model_config = {"from_attributes": True}

class SectionRead(SectionBase):
    id: int
    class_id: int

    model_config = {"from_attributes": True}

class ClassSectionInfo(BaseModel):
    section_id: int
    class_section_name: str

class SectionOut(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    class_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True