from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.masters.subject_category_schema import SubjectCategoryOut
from uuid import UUID

class SubjectBase(BaseModel):
    name: str
    category_id: UUID
    short_code: Optional[str] = None
    is_active: bool = True
    academic_year_id: UUID

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[UUID] = None
    short_code: Optional[str] = None
    is_active: Optional[bool] = None
    academic_year_id: Optional[UUID] = None

class SubjectRead(SubjectBase):
    id: UUID
    name: str
    short_code: Optional[str] = None
    is_active: bool = True
    academic_year_id: UUID
    category: SubjectCategoryOut

    model_config = {"from_attributes": True}

class SubjectDropdown(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}
