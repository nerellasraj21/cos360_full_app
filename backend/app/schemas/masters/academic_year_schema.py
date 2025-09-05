from pydantic import BaseModel
from datetime import date
from typing import Optional
from uuid import UUID

class AcademicYearBase(BaseModel):
    title: str
    start_date: date
    end_date: date
    is_active: bool = True
    
class AcademicYearCreate(AcademicYearBase):
    pass

class AcademicYearUpdate(BaseModel):
    title: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

class AcademicYearRead(AcademicYearBase):
    id: UUID    
    model_config = {"from_attributes": True}

class AcademicYearDropdown(BaseModel):
    id: UUID
    title: str
    model_config = {"from_attributes": True}