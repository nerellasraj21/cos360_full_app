from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SubjectBase(BaseModel):
    name: str
    category: Optional[str] = None
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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
