from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class FeeCategoryBase(BaseModel):
    category_name: str
    category_status: str = "active"
    academic_year_id: UUID

class FeeCategoryCreate(FeeCategoryBase):
    pass

class FeeCategoryUpdate(BaseModel):
    category_name: Optional[str] = None
    category_status: Optional[str] = None
    academic_year_id: Optional[UUID] = None

class FeeCategoryRead(BaseModel):
    id: UUID
    category_name: str
    category_status: str
    academic_year_id: UUID
    academic_year_title: Optional[str] = None
    model_config = {"from_attributes": True}

class FeeCategoryDropdown(BaseModel):
    id: UUID
    category_name: str
    model_config = {"from_attributes": True}