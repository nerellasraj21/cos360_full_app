from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.masters.subject_category_schema import SubjectCategoryOut

class SubjectBase(BaseModel):
    name: str
    category_id: int
    short_code: Optional[str] = None
    is_active: bool = True
    academic_year_id: int

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    short_code: Optional[str] = None
    is_active: Optional[bool] = None
    academic_year_id: Optional[int] = None

class SubjectRead(SubjectBase):
    id: int
    name: str
    short_code: Optional[str] = None
    is_active: bool = True
    academic_year_id: int
    category: SubjectCategoryOut

    model_config = {"from_attributes": True}

class SubjectDropdown(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}
