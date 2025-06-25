from pydantic import BaseModel
from typing import Optional, List
from app.schemas.masters.sections_schema import SectionRead, SectionCreate, SectionUpdate
from datetime import datetime

class ClassBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    short_code: str
    academic_year_id: int

class ClassCreate(ClassBase):
    sections: Optional[List[SectionCreate]] = None  # Use create schema

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    short_code: Optional[str] = None
    academic_year_id: Optional[int]
    sections: Optional[List[SectionUpdate]] = None  # Use Update schema

class ClassRead(ClassBase):
    id: int
    sections: List[SectionRead] = []  # Use read schema for response

    model_config = {"from_attributes": True}
