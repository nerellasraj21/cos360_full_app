from pydantic import BaseModel
from typing import Optional

class FeeCategoryBase(BaseModel):
    category_name: str
    category_status: str = "active"
    academic_year_id: int

class FeeCategoryCreate(FeeCategoryBase):
    pass

class FeeCategoryUpdate(BaseModel):
    category_name: Optional[str] = None
    category_status: Optional[str] = None
    academic_year_id: Optional[int] = None

class FeeCategoryRead(FeeCategoryBase):
    id: str  # UUID as string
    academic_year_title: Optional[str] = None  # For joined queries
    model_config = {"from_attributes": True}

class FeeCategoryDropdown(BaseModel):
    id: str  # UUID as string
    category_name: str
    model_config = {"from_attributes": True}